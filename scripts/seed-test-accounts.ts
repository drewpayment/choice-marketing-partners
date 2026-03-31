/**
 * Seed test accounts for E2E testing.
 * Creates admin, manager, and employee test users with linked employee records
 * and a manager-employee relationship for RBAC testing.
 *
 * Idempotent — safe to re-run. Checks for existing records before inserting.
 *
 * Usage: bun scripts/seed-test-accounts.ts
 */
import { createConnection, type Connection } from 'mysql2/promise'
import { hash } from 'bcryptjs'

const TEST_PASSWORD = 'password123'
const SALT_ROUNDS = 12

interface TestAccount {
  email: string
  name: string
  is_admin: number
  is_mgr: number
  role: 'admin' | 'author' | 'subscriber'
}

const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'admin@test.com', name: 'Test Admin', is_admin: 1, is_mgr: 0, role: 'admin' },
  { email: 'manager@test.com', name: 'Test Manager', is_admin: 0, is_mgr: 1, role: 'subscriber' },
  { email: 'employee@test.com', name: 'Test Employee', is_admin: 0, is_mgr: 0, role: 'subscriber' },
]

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
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
      ssl: sslConfig,
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'choice_marketing',
  }
}

async function seed() {
  const config = getDatabaseConfig()
  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`)

  const conn: Connection = await createConnection(config)
  const hashedPassword = await hash(TEST_PASSWORD, SALT_ROUNDS)
  const now = new Date()

  const employeeIds: Record<string, number> = {}

  for (const account of TEST_ACCOUNTS) {
    console.log(`\nProcessing ${account.email}...`)

    // Check if employee exists
    const [empRows] = await conn.execute(
      'SELECT id FROM employees WHERE email = ? LIMIT 1',
      [account.email]
    ) as [Array<{ id: number }>, unknown]

    let employeeId: number

    if (empRows.length > 0) {
      employeeId = empRows[0].id
      console.log(`  Employee already exists (id=${employeeId}), updating flags...`)
      await conn.execute(
        'UPDATE employees SET is_admin = ?, is_mgr = ?, is_active = 1, deleted_at = NULL, updated_at = ? WHERE id = ?',
        [account.is_admin, account.is_mgr, now, employeeId]
      )
    } else {
      const [result] = await conn.execute(
        `INSERT INTO employees (name, email, address, is_admin, is_mgr, is_active, sales_id1, sales_id2, sales_id3, hidden_payroll, created_at, updated_at)
         VALUES (?, ?, '123 Test St', ?, ?, 1, '', '', '', 0, ?, ?)`,
        [account.name, account.email, account.is_admin, account.is_mgr, now, now]
      ) as [{ insertId: number }, unknown]
      employeeId = result.insertId
      console.log(`  Created employee (id=${employeeId})`)
    }

    employeeIds[account.email] = employeeId

    // Check if user exists
    const [userRows] = await conn.execute(
      'SELECT uid FROM users WHERE email = ? LIMIT 1',
      [account.email]
    ) as [Array<{ uid: number }>, unknown]

    let userUid: number

    if (userRows.length > 0) {
      userUid = userRows[0].uid
      console.log(`  User already exists (uid=${userUid}), updating password...`)
      await conn.execute(
        'UPDATE users SET password = ?, role = ?, updated_at = ? WHERE uid = ?',
        [hashedPassword, account.role, now, userUid]
      )
    } else {
      const [result] = await conn.execute(
        `INSERT INTO users (id, name, email, password, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, account.name, account.email, hashedPassword, account.role, now, now]
      ) as [{ insertId: number }, unknown]
      userUid = result.insertId
      console.log(`  Created user (uid=${userUid})`)
    }

    // Ensure employee_user link exists
    const [linkRows] = await conn.execute(
      'SELECT employee_id FROM employee_user WHERE employee_id = ? LIMIT 1',
      [employeeId]
    ) as [Array<{ employee_id: number }>, unknown]

    if (linkRows.length === 0) {
      await conn.execute(
        'INSERT INTO employee_user (employee_id, user_id) VALUES (?, ?)',
        [employeeId, userUid]
      )
      console.log(`  Linked employee ${employeeId} to user ${userUid}`)
    } else {
      console.log(`  Employee-user link already exists`)
    }
  }

  // Create manager-employee relationship
  const managerId = employeeIds['manager@test.com']
  const employeeId = employeeIds['employee@test.com']

  const [meRows] = await conn.execute(
    'SELECT id FROM manager_employees WHERE manager_id = ? AND employee_id = ? LIMIT 1',
    [managerId, employeeId]
  ) as [Array<{ id: number }>, unknown]

  if (meRows.length === 0) {
    await conn.execute(
      'INSERT INTO manager_employees (manager_id, employee_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [managerId, employeeId, now, now]
    )
    console.log(`\nLinked manager (${managerId}) -> employee (${employeeId})`)
  } else {
    console.log(`\nManager-employee relationship already exists`)
  }

  await conn.end()

  console.log('\n✅ Test accounts seeded successfully!')
  console.log('  admin@test.com / password123')
  console.log('  manager@test.com / password123')
  console.log('  employee@test.com / password123')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
