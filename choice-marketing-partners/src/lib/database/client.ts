import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import type { DB } from './types'

// Parse database URL or use individual environment variables
function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (databaseUrl) {
    // Parse DATABASE_URL format: mysql://user:password@host:port/database?ssl=params
    const url = new URL(databaseUrl)
    
    // Extract SSL configuration from URL search params
    const sslParam = url.searchParams.get('ssl')
    let sslConfig = null
    
    if (sslParam) {
      try {
        // Handle JSON SSL configuration
        sslConfig = JSON.parse(sslParam)
      } catch {
        // Handle simple boolean SSL configuration
        sslConfig = sslParam === 'true' ? { rejectUnauthorized: false } : null
      }
    }
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      ssl: sslConfig
    }
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'choice_user',
    password: process.env.DB_PASSWORD || 'choice_password',
    database: process.env.DB_NAME || 'choice_marketing',
  }
}

// Create connection pool optimized for serverless environment
const dbConfig = getDatabaseConfig()

const pool = createPool({
  ...dbConfig,
  // Connection pool settings optimized for serverless
  connectionLimit: 1,
  // SSL configuration - use from URL params first, then environment-based fallback
  ssl: dbConfig.ssl || (process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined),
  // MySQL data type handling
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: false,
})

// Create Kysely instance with proper typing
export const db = new Kysely<DB>({
  dialect: new MysqlDialect({
    pool
  }),
  // Add query logging in development
  ...(process.env.NODE_ENV === 'development' && {
    log: (event) => {
      if (event.level === 'query') {
        console.log('🔍 Query:', event.query.sql)
        console.log('📊 Parameters:', event.query.parameters)
      }
    }
  })
})

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.selectFrom('users').select('id').limit(1).execute()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Helper function to close database connection (for cleanup)
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy()
    console.log('🔌 Database connection closed')
  } catch (error) {
    console.error('❌ Error closing database:', error)
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
