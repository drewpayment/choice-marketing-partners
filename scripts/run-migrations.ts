/**
 * CI database migration runner (PostgreSQL).
 *
 * Applies every `.sql` file in src/lib/database/migrations/ that is not already
 * recorded in the `migrations` ledger table, in filename order, each inside its
 * own transaction. Run by .github/workflows/migrate.yml on merge to main.
 *
 * Design notes:
 *   - Fail-closed: DATABASE_URL is required and there are no host/port/user
 *     fallbacks. This script runs against production; a typo must not silently
 *     point it at some other database.
 *   - The whole file is handed to a single `client.query(sql)`. Postgres' simple
 *     query protocol executes multiple semicolon-separated statements in one
 *     round trip and parses dollar-quoted bodies ($$ ... $$) correctly, so there
 *     is deliberately NO statement splitter here — adding one would break
 *     PL/pgSQL function bodies.
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

async function runMigrations() {
  const { config, host, port, database } = getClientConfig()
  const client = new Client(config)
  let connected = false

  try {
    console.log(`Connecting to database at ${host}:${port}/${database}...`)
    await client.connect()
    connected = true
    console.log('Connected successfully.')

    // Match the production ledger shape exactly. No-op on prod; makes fresh
    // databases (preview branches, CI scratch DBs) work without hand setup.
    await client.query(
      `CREATE TABLE IF NOT EXISTS migrations (
         migration varchar(255) NOT NULL,
         batch integer NOT NULL
       )`
    )

    const applied = await client.query<{ migration: string }>('SELECT migration FROM migrations')
    const appliedSet = new Set(applied.rows.map((r) => r.migration))

    const files = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .map((entry) => entry.name)
      .sort()

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

    for (const file of pending) {
      console.log(`\nApplying: ${file}`)
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')

      try {
        await client.query('BEGIN')
        // Entire file, one simple-query round trip. See header note.
        await client.query(sql)
        await client.query('INSERT INTO migrations (migration, batch) VALUES ($1, $2)', [
          file,
          nextBatch,
        ])
        await client.query('COMMIT')
      } catch (error) {
        try {
          await client.query('ROLLBACK')
        } catch {
          // Connection may already be unusable; the original error is what matters.
        }
        console.error(`\nMigration failed: ${file} (rolled back, nothing from this file was applied)`)
        if (error && typeof error === 'object') {
          const pgError = error as { message?: string; position?: string; detail?: string; hint?: string; where?: string }
          console.error(`  ${pgError.message ?? String(error)}`)
          if (pgError.detail) console.error(`  detail: ${pgError.detail}`)
          if (pgError.hint) console.error(`  hint: ${pgError.hint}`)
          if (pgError.position) console.error(`  position: ${pgError.position}`)
          if (pgError.where) console.error(`  where: ${pgError.where}`)
        } else {
          console.error(`  ${String(error)}`)
        }
        const remaining = pending.slice(pending.indexOf(file) + 1)
        if (remaining.length > 0) {
          console.error(`  Not applied: ${remaining.join(', ')}`)
        }
        process.exit(1)
      }

      console.log('  Applied successfully.')
    }

    console.log(`\nAll ${pending.length} migration(s) applied in batch ${nextBatch}.`)
  } catch (error) {
    console.error('\nMigration failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (connected) {
      await client.end().catch(() => {})
    }
  }
}

runMigrations()
