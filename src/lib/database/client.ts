import { Kysely, PostgresDialect } from 'kysely'
import { Pool, type PoolConfig } from 'pg'
import type { DB } from './types'
import { logger } from '@/lib/utils/logger'

const connectionString = process.env.DATABASE_URL

/**
 * TLS default for connection strings that say nothing about SSL.
 *
 * `pg` parses `sslmode=` / `ssl=` out of the connection string itself, and those
 * URL-supplied values take precedence over anything passed here (see
 * pg/lib/connection-parameters.js — the parsed URL is merged *over* the explicit
 * config). So this function is only consulted when the URL is silent:
 *
 *   - loopback / *.local dev URLs  -> plain TCP, so the local docker Postgres
 *     (`postgres://choice:choice@127.0.0.1:5433/...`) keeps working with no TLS.
 *   - anything else                -> verified TLS, so a managed URL that
 *     forgot its `sslmode` fails closed rather than sending payroll data in the
 *     clear.
 *
 * Neon's connection strings ship `?sslmode=require`, which `pg` already turns
 * into a verified TLS connection, so this branch is not what protects prod — it
 * is the backstop.
 */
function defaultSslConfig(url: string | undefined): PoolConfig['ssl'] {
  if (!url) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // Malformed URL: let `pg` produce the real error, don't mask it here.
    return false
  }

  const host = parsed.hostname.toLowerCase()
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')

  return isLocal ? false : { rejectUnauthorized: true }
}

/**
 * Connection pool.
 *
 * `max: 1` is kept from the MySQL setup for serverless parity: each Vercel
 * function instance holds at most one backend connection. Real pooling is
 * Neon's job — the `-pooler` endpoint fronts the database with PgBouncer, so
 * fanning out here would only multiply idle backends.
 */
const pool = new Pool({
  connectionString,
  ssl: defaultSslConfig(connectionString),
  max: 1,
})

// Never let a background pool error take down the process; a broken connection
// is evicted and the next query gets a fresh one.
pool.on('error', (error) => {
  logger.error('❌ Postgres pool error:', error)
})

// Create Kysely instance with proper typing
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool
  }),
  // Add query logging in development
  ...(process.env.NODE_ENV === 'development' && {
    log: (event) => {
      if (event.level === 'query') {
        logger.log('🔍 Query:', event.query.sql)
        logger.log('📊 Parameters:', event.query.parameters)
      }
    }
  })
})

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.selectFrom('users').select('id').limit(1).execute()
    logger.log('✅ Database connection successful')
    return true
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    return false
  }
}

// Helper function to close database connection (for cleanup)
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy()
    logger.log('🔌 Database connection closed')
  } catch (error) {
    logger.error('❌ Error closing database:', error)
  }
}

// Health check function for API routes
export async function healthCheck() {
  try {
    const start = Date.now()
    await db.selectFrom('users').select('id').limit(1).execute()
    const duration = Date.now() - start

    return {
      status: 'healthy',
      database: 'connected',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}
