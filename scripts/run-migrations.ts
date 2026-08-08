/**
 * CI database migration runner (PostgreSQL).
 *
 * Applies every `.sql` file in src/lib/database/migrations/ that is not already
 * recorded in the `migrations` ledger table, in filename order, each inside its
 * own transaction. Run by .github/workflows/migrate.yml on merge to main.
 *
 * Design notes:
 *   - Fail-closed. DATABASE_URL is required and there are no host/port/user
 *     fallbacks. Pooled endpoints and non-postgres schemes are refused, and a
 *     missing-or-empty ledger needs ALLOW_BOOTSTRAP=1 — a misrouted URL must not
 *     quietly build a shadow schema somewhere.
 *   - Serialized. A session-level advisory lock plus the workflow's concurrency
 *     group mean only one runner is ever inside the ledger at a time, and a
 *     unique index on migrations.migration turns any residual race into a hard
 *     error rather than a double-apply.
 *   - The runner owns the transaction. Files are rejected before any DB work if
 *     they contain their own BEGIN/COMMIT/ROLLBACK/SAVEPOINT: an in-file COMMIT
 *     would end the runner's transaction and leave a half-applied file behind a
 *     green build. The `-- runner: no-transaction` header is the deliberate
 *     escape hatch for CREATE INDEX CONCURRENTLY and friends.
 *   - Each file is handed to a single `client.query(sql)`. Postgres' simple
 *     query protocol executes multiple semicolon-separated statements in one
 *     round trip and parses dollar-quoted bodies ($$ ... $$) correctly, so there
 *     is deliberately NO statement splitter here — one would break PL/pgSQL.
 *   - The ledger shape mirrors production exactly: (migration, batch), no id.
 *     Laravel-era rows (no .sql suffix) live alongside runner-written rows and
 *     simply never match a file.
 */
import { Client } from 'pg'
import type { ClientConfig } from 'pg'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

const MIGRATIONS_DIR = join(import.meta.dir, '..', 'src', 'lib', 'database', 'migrations')

/**
 * Fixed key for pg_advisory_lock. Session-level, so it is released when the
 * connection drops — including when this process is killed mid-run. Guards the
 * read-ledger/apply/record sequence against a second runner, which the workflow
 * concurrency group alone does not cover (a manual "Re-run jobs" bypasses it).
 */
const ADVISORY_LOCK_KEY = 727270015

/**
 * How long to wait for that lock before giving up. Overridable so the rehearsal
 * can prove the timeout path without waiting ten minutes.
 */
const LOCK_WAIT = process.env.MIGRATION_LOCK_TIMEOUT || '10min'

/** Header that opts a file out of the runner's transaction. Must be line 1. */
const NO_TRANSACTION_HEADER = '-- runner: no-transaction'

/**
 * Transaction control is the runner's job; a file doing it corrupts state.
 *
 * ABORT is a Postgres synonym for ROLLBACK and PREPARE TRANSACTION hands the
 * transaction to two-phase commit — both are as damaging as the obvious ones.
 * PREPARE TRANSACTION is matched with its second word so ordinary prepared
 * statements (`PREPARE foo AS SELECT ...`) stay allowed.
 */
const TRANSACTION_CONTROL =
  /^(BEGIN|COMMIT|ROLLBACK|ABORT|END|SAVEPOINT|START\s+TRANSACTION|RELEASE\s+SAVEPOINT|PREPARE\s+TRANSACTION)\b/i

/**
 * TLS default for connection strings that say nothing about SSL. Mirrors
 * `defaultSslConfig()` in src/lib/database/client.ts: `pg` merges values parsed
 * out of the URL (`sslmode=` / `ssl=`) *over* the explicit config, so this is
 * only consulted when the URL is silent. Local dev -> plain TCP; anything else
 * -> verified TLS, so a managed URL missing `sslmode` fails closed rather than
 * shipping schema changes in the clear.
 */
function defaultSslConfig(parsed: URL): ClientConfig['ssl'] {
  const host = parsed.hostname.toLowerCase()
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host === 'host.docker.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')

  return isLocal ? false : { rejectUnauthorized: true }
}

/**
 * Blank out everything Postgres would not read as code — comments, string
 * literals, quoted identifiers, and dollar-quoted bodies — replacing each
 * character with a space and keeping newlines, so offsets and line numbers in
 * the result still line up with the original file.
 *
 * Dollar-quoted bodies matter most: a PL/pgSQL function legitimately contains
 * BEGIN ... END;, and that must not trip the transaction-control guard.
 */
function blankNonCode(sql: string): string {
  let out = ''
  let i = 0
  const n = sql.length
  const blank = (ch: string) => (ch === '\n' ? '\n' : ' ')

  while (i < n) {
    const ch = sql[i]

    // -- line comment
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') {
        out += ' '
        i++
      }
      continue
    }

    // /* block comment */ — Postgres nests these
    if (ch === '/' && sql[i + 1] === '*') {
      let depth = 0
      while (i < n) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++
          out += '  '
          i += 2
          continue
        }
        if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--
          out += '  '
          i += 2
          if (depth === 0) break
          continue
        }
        out += blank(sql[i])
        i++
      }
      continue
    }

    // 'string literal' and "quoted identifier" (doubled quote escapes)
    if (ch === "'" || ch === '"') {
      const quote = ch

      // With standard_conforming_strings on, a backslash in a plain '...' is a
      // literal backslash — but E'...' honors \' as an escaped quote. Getting
      // this wrong ends the literal early, phantom-opens a new one at the next
      // quote, and blanks the rest of the file, hiding real transaction control.
      const escapesHonored =
        quote === "'" &&
        i > 0 &&
        (sql[i - 1] === 'E' || sql[i - 1] === 'e') &&
        !(i > 1 && /[A-Za-z0-9_]/.test(sql[i - 2]))

      out += ' '
      i++
      while (i < n) {
        if (escapesHonored && sql[i] === '\\' && i + 1 < n) {
          out += blank(sql[i]) + blank(sql[i + 1])
          i += 2
          continue
        }
        if (sql[i] === quote && sql[i + 1] === quote) {
          out += '  '
          i += 2
          continue
        }
        if (sql[i] === quote) {
          out += ' '
          i++
          break
        }
        out += blank(sql[i])
        i++
      }
      continue
    }

    // $tag$ ... $tag$ / $$ ... $$ (but not $1 placeholders)
    if (ch === '$') {
      const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))
      if (match) {
        const tag = match[0]
        const close = sql.indexOf(tag, i + tag.length)
        const stop = close === -1 ? n : close + tag.length
        for (let k = i; k < stop; k++) out += blank(sql[k])
        i = stop
        continue
      }
    }

    out += ch
    i++
  }

  return out
}

/** 0-based character offset -> 1-based line/column, for error messages. */
function offsetToLineCol(text: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, text.length))
  const before = text.slice(0, clamped)
  const lastNewline = before.lastIndexOf('\n')
  return {
    line: before.split('\n').length,
    column: clamped - lastNewline,
  }
}

/**
 * Find transaction control at a statement boundary — the start of the file, or
 * the first non-whitespace after a `;`. Runs on blanked SQL, so keywords inside
 * comments, strings, and $$ bodies are invisible here.
 *
 * Biased strict: a false positive blocks a merge with a clear message, a false
 * negative is production corruption.
 */
function findTransactionControl(
  sql: string
): { keyword: string; line: number; column: number } | null {
  const code = blankNonCode(sql)
  const starts = [0]
  for (let i = 0; i < code.length; i++) {
    if (code[i] === ';') starts.push(i + 1)
  }

  for (const start of starts) {
    let j = start
    while (j < code.length && /\s/.test(code[j])) j++
    if (j >= code.length) continue

    const match = TRANSACTION_CONTROL.exec(code.slice(j, j + 32))
    if (match) {
      const { line, column } = offsetToLineCol(sql, j)
      return { keyword: match[0].replace(/\s+/g, ' ').toUpperCase(), line, column }
    }
  }

  return null
}

/**
 * Validate DATABASE_URL and derive the client config. Exits 1 rather than
 * throwing so the failure message is the last thing in the CI log.
 */
function getClientConfig(): { config: ClientConfig; host: string; port: string; database: string } {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl || databaseUrl.trim() === '') {
    console.error(
      'DATABASE_URL is not set. This runner has no fallback connection defaults — ' +
        'set DATABASE_URL to the target PostgreSQL database and re-run.'
    )
    process.exit(1)
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    console.error('DATABASE_URL is not a valid URL. Expected a postgres:// connection string.')
    process.exit(1)
  }

  // Guard against a stale secret still pointing at the pre-cutover MySQL host.
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    console.error(
      `Refusing to run: DATABASE_URL uses the "${parsed.protocol.replace(':', '')}" scheme. ` +
        'This runner only supports PostgreSQL (postgres:// or postgresql://). ' +
        'If this is CI, the DATABASE_URL secret has not been rotated to Postgres yet.'
    )
    process.exit(1)
  }

  // Migrations must use the direct endpoint. Through PgBouncer, session state
  // (advisory locks, SET LOCAL) is not guaranteed to stay on one backend, and
  // CREATE INDEX CONCURRENTLY does not work in transaction pooling mode.
  if (parsed.hostname.toLowerCase().includes('-pooler')) {
    console.error(
      `Refusing to run: DATABASE_URL points at a pooled endpoint (${parsed.hostname}). ` +
        'Migrations must use the direct (non-pooler) endpoint so advisory locks and ' +
        'session state behave. Remove "-pooler" from the host and re-run.'
    )
    process.exit(1)
  }

  return {
    config: {
      connectionString: databaseUrl,
      ssl: defaultSslConfig(parsed),
    },
    host: parsed.hostname,
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.slice(1)) || '(default)',
  }
}

/** Print a Postgres error with detail/hint and a file line:column when we can. */
function reportPgError(error: unknown, fileText?: string) {
  if (!error || typeof error !== 'object') {
    console.error(`  ${String(error)}`)
    return
  }

  const pgError = error as {
    message?: string
    position?: string
    detail?: string
    hint?: string
    where?: string
  }

  console.error(`  ${pgError.message ?? String(error)}`)
  if (pgError.detail) console.error(`  detail: ${pgError.detail}`)
  if (pgError.hint) console.error(`  hint: ${pgError.hint}`)

  if (pgError.position && fileText) {
    // `position` is a 1-based character offset into the query we sent, which is
    // the whole file, so it maps straight onto the file text.
    const offset = Number(pgError.position) - 1
    if (Number.isFinite(offset) && offset >= 0) {
      const { line, column } = offsetToLineCol(fileText, offset)
      console.error(`  at line ${line}, column ${column} (character ${pgError.position})`)
    }
  } else if (pgError.position) {
    console.error(`  position: ${pgError.position}`)
  }

  if (pgError.where) console.error(`  where: ${pgError.where}`)
}

async function runMigrations() {
  const { config, host, port, database } = getClientConfig()

  // Read and validate every candidate file before opening a connection, so a
  // file that tries to drive its own transaction can never reach the database.
  const files = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort()

  const sources = new Map<string, string>()
  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')
    sources.set(file, sql)

    const offender = findTransactionControl(sql)
    if (offender) {
      console.error(
        `Refusing to run: the runner owns the transaction; remove transaction control from ${file}`
      )
      console.error(
        `  found "${offender.keyword}" at line ${offender.line}, column ${offender.column}`
      )
      console.error(
        '  Each migration already runs inside a single BEGIN/COMMIT. If you need DDL that ' +
          `cannot run in a transaction (CREATE INDEX CONCURRENTLY, VACUUM), make line 1 of the ` +
          `file exactly "${NO_TRANSACTION_HEADER}" and put a single statement in it.`
      )
      process.exit(1)
    }
  }

  const client = new Client(config)
  let connected = false

  // Server-side notices (including the "there is no transaction in progress"
  // warning) were previously discarded; surface them in the CI log.
  client.on('notice', (notice) => {
    const severity = notice.severity ?? 'NOTICE'
    console.log(`  [${severity}] ${notice.message ?? ''}`)
  })

  client.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Postgres connection error: ${message}`)
  })

  try {
    console.log(`Connecting to database at ${host}:${port}/${database}...`)
    await client.connect()
    connected = true
    console.log('Connected successfully.')

    // Serialize runners before anything reads the ledger. A queued run waits
    // and then applies cleanly once the first finishes — but the wait is
    // bounded, so a stale holder cannot hang the job forever.
    console.log('Waiting for another migration run to finish...')
    await client.query("SELECT set_config('lock_timeout', $1, false)", [LOCK_WAIT])
    try {
      await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY])
    } catch (error) {
      if ((error as { code?: string }).code === '55P03') {
        console.error(
          `Refusing to run: could not acquire the migration advisory lock within ${LOCK_WAIT}. ` +
            'Another migration run is still holding it, or a previous run left a session open. ' +
            'Check for a running migrate job before retrying.'
        )
        process.exit(1)
      }
      throw error
    }
    await client.query('RESET lock_timeout')
    console.log('Advisory lock acquired.')

    // A ledger that is missing or empty means either a genuinely fresh database
    // or a URL pointing somewhere unintended. Require an explicit opt-in.
    const ledgerReg = await client.query<{ reg: string | null }>(
      "SELECT to_regclass('public.migrations')::text AS reg"
    )
    const ledgerExists = ledgerReg.rows[0].reg !== null
    let ledgerCount = 0
    if (ledgerExists) {
      const counted = await client.query<{ count: string }>('SELECT count(*) AS count FROM migrations')
      ledgerCount = Number(counted.rows[0].count)
    }

    if (!ledgerExists || ledgerCount === 0) {
      if (process.env.ALLOW_BOOTSTRAP !== '1') {
        console.error(
          `Refusing to run: the migrations ledger is ${ledgerExists ? 'empty' : 'missing'} at ` +
            `${host}:${port}/${database}. An established database always has rows here, so this ` +
            'usually means DATABASE_URL points at the wrong database. If this really is a fresh ' +
            'database, re-run with ALLOW_BOOTSTRAP=1.'
        )
        process.exit(1)
      }
      console.log(
        `Ledger is ${ledgerExists ? 'empty' : 'missing'}; ALLOW_BOOTSTRAP=1 set, bootstrapping.`
      )
    }

    // Match the production ledger shape exactly. No-op on prod; makes fresh
    // databases (preview branches, CI scratch DBs) work without hand setup.
    await client.query(
      `CREATE TABLE IF NOT EXISTS migrations (
         migration varchar(255) NOT NULL,
         batch integer NOT NULL
       )`
    )

    // Last line of defence against a double-apply: if two runners ever get past
    // the lock, the second one's INSERT fails and its transaction rolls back.
    await client.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uk_migrations_migration ON migrations (migration)'
    )

    const applied = await client.query<{ migration: string }>('SELECT migration FROM migrations')
    const appliedSet = new Set(applied.rows.map((r) => r.migration))

    const pending = files.filter((f) => !appliedSet.has(f))

    if (pending.length === 0) {
      console.log('No new migrations to apply.')
      return
    }

    const batchResult = await client.query<{ max_batch: string | number }>(
      'SELECT COALESCE(MAX(batch), 0) AS max_batch FROM migrations'
    )
    const nextBatch = Number(batchResult.rows[0].max_batch) + 1

    console.log(`Found ${pending.length} pending migration(s). Starting batch ${nextBatch}...`)

    for (let index = 0; index < pending.length; index++) {
      const file = pending[index]
      const sql = sources.get(file)!
      const noTransaction = sql.split('\n')[0].trim() === NO_TRANSACTION_HEADER

      console.log(`\nApplying: ${file}${noTransaction ? ' (no-transaction mode)' : ''}`)

      try {
        if (noTransaction) {
          // CREATE INDEX CONCURRENTLY / VACUUM cannot run in a transaction
          // block, and a multi-statement simple query IS an implicit block — so
          // these files carry exactly one statement. No statement_timeout here:
          // a concurrent index build on a large table legitimately runs long.
          await client.query("SET lock_timeout = '10s'")
          await client.query(sql)
          await client.query('RESET lock_timeout')
          await client.query('INSERT INTO migrations (migration, batch) VALUES ($1, $2)', [
            file,
            nextBatch,
          ])
        } else {
          await client.query('BEGIN')
          // Unattended DDL must not queue behind an app lock and stall payroll
          // reads, and must not run away if it does get in.
          await client.query("SET LOCAL lock_timeout = '10s'")
          await client.query("SET LOCAL statement_timeout = '10min'")
          // Entire file, one simple-query round trip. See header note.
          await client.query(sql)
          await client.query('INSERT INTO migrations (migration, batch) VALUES ($1, $2)', [
            file,
            nextBatch,
          ])
          await client.query('COMMIT')
        }
      } catch (error) {
        if (noTransaction) {
          console.error(
            `\nMigration failed: ${file} (no-transaction mode — partial effects may remain, ` +
              'and no ledger row was written)'
          )
        } else {
          try {
            await client.query('ROLLBACK')
          } catch {
            // Connection may already be unusable; the original error is what matters.
          }
          console.error(`\nMigration failed: ${file} (transaction rolled back)`)
        }

        reportPgError(error, sql)

        const remaining = pending.slice(index + 1)
        if (remaining.length > 0) {
          console.error(`  Not applied: ${remaining.join(', ')}`)
        }
        process.exit(1)
      }

      console.log('  Applied successfully.')
    }

    console.log(`\nAll ${pending.length} migration(s) applied in batch ${nextBatch}.`)
  } catch (error) {
    // Through reportPgError so DETAIL/HINT survive — a unique-index violation
    // here carries the offending key only in its detail line.
    console.error('\nMigration failed:')
    reportPgError(error)
    process.exit(1)
  } finally {
    if (connected) {
      // Ends the session, which releases the advisory lock.
      await client.end().catch(() => {})
    }
  }
}

runMigrations()
