import { createConnection, type Connection } from 'mysql2/promise'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

const MIGRATIONS_DIR = join(import.meta.dir, '..', 'src', 'lib', 'database', 'migrations')

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    const url = new URL(databaseUrl)
    const sslParam = url.searchParams.get('ssl')
    let sslConfig = null

    if (sslParam) {
      try {
        sslConfig = JSON.parse(sslParam)
      } catch {
        sslConfig = sslParam === 'true' ? { rejectUnauthorized: false } : null
      }
    }

    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: sslConfig,
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'choice_user',
    password: process.env.DB_PASSWORD || 'choice_password',
    database: process.env.DB_NAME || 'choice_marketing',
  }
}

/**
 * Preprocess SQL that contains DELIMITER directives.
 * mysql2 doesn't support DELIMITER — it's a mysql CLI feature.
 * This splits the SQL into individual executable statements.
 */
function splitSqlStatements(sql: string): string[] {
  const lines = sql.split('\n')
  const statements: string[] = []
  let currentDelimiter = ';'
  let buffer = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Handle DELIMITER directive
    const delimiterMatch = trimmed.match(/^DELIMITER\s+(\S+)\s*$/i)
    if (delimiterMatch) {
      // Flush any buffered content before switching delimiter
      const flushed = buffer.trim()
      if (flushed) {
        statements.push(flushed)
        buffer = ''
      }
      currentDelimiter = delimiterMatch[1]
      continue
    }

    buffer += line + '\n'

    // Check if buffer ends with the current delimiter
    const trimmedBuffer = buffer.trimEnd()
    if (trimmedBuffer.endsWith(currentDelimiter)) {
      // Remove the delimiter from the end and add as a statement
      const stmt = trimmedBuffer.slice(0, -currentDelimiter.length).trim()
      if (stmt) {
        statements.push(stmt)
      }
      buffer = ''
    }
  }

  // Flush remaining buffer
  const remaining = buffer.trim()
  if (remaining) {
    // Remove trailing semicolon if present
    const stmt = remaining.endsWith(';') ? remaining.slice(0, -1).trim() : remaining
    if (stmt) {
      statements.push(stmt)
    }
  }

  return statements.filter(s => {
    // Remove empty statements and pure comment-only statements
    const withoutComments = s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim()
    return withoutComments.length > 0
  })
}

async function runMigrations() {
  let connection: Connection | null = null

  try {
    const config = getDatabaseConfig()
    console.log(`Connecting to database at ${config.host}:${config.port}/${config.database}...`)

    connection = await createConnection({
      ...config,
      multipleStatements: true,
    })

    console.log('Connected successfully.')

    // Get list of already-applied migrations
    const [appliedRows] = await connection.query(
      'SELECT migration FROM migrations'
    ) as [Array<{ migration: string }>, unknown]
    const appliedSet = new Set(appliedRows.map(r => r.migration))

    // Read migration files sorted by name
    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort()

    // Filter to unapplied migrations
    const pending = files.filter(f => !appliedSet.has(f))

    if (pending.length === 0) {
      console.log('No new migrations to apply.')
      return
    }

    // Determine next batch number
    const [batchRows] = await connection.query(
      'SELECT COALESCE(MAX(batch), 0) AS max_batch FROM migrations'
    ) as [Array<{ max_batch: number }>, unknown]
    const nextBatch = Number(batchRows[0].max_batch) + 1

    console.log(`Found ${pending.length} pending migration(s). Starting batch ${nextBatch}...`)

    for (const file of pending) {
      console.log(`\nApplying: ${file}`)
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')

      const statements = splitSqlStatements(sql)
      for (const stmt of statements) {
        await connection.query(stmt)
      }

      // Record the migration
      await connection.query(
        'INSERT INTO migrations (migration, batch) VALUES (?, ?)',
        [file, nextBatch]
      )

      console.log(`  Applied successfully.`)
    }

    console.log(`\nAll ${pending.length} migration(s) applied in batch ${nextBatch}.`)
  } catch (error) {
    console.error('\nMigration failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigrations()
