/**
 * Audit duplicate vendor rows.
 *
 * Read-only. Lists every group of vendors that share a name, the rows in each
 * group, and the number of references to each row across every dependent table.
 *
 * Usage: bun run scripts/audit-duplicate-vendors.ts
 */
import { createConnection, type Connection, type RowDataPacket } from 'mysql2/promise'

interface VendorRow {
  id: number
  name: string
  is_active: number
  created_at: Date | null
  updated_at: Date | null
}

interface RefCheck {
  table: string
  column: string
  optional?: boolean
  cast?: 'string'
}

const REF_CHECKS: RefCheck[] = [
  { table: 'invoices', column: 'vendor', cast: 'string' },
  { table: 'overrides', column: 'vendor_id' },
  { table: 'expenses', column: 'vendor_id' },
  { table: 'paystubs', column: 'vendor_id' },
  { table: 'payroll', column: 'vendor_id' },
  { table: 'payroll_audit', column: 'vendor_id' },
  { table: 'vendor_field_definitions', column: 'vendor_id' },
  { table: 'daily_pay_enrollments', column: 'vendor_id', optional: true },
  { table: 'daily_punch_records', column: 'vendor_id', optional: true },
  { table: 'daily_pay_records', column: 'vendor_id', optional: true },
]

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    const url = new URL(databaseUrl)
    const sslParam = url.searchParams.get('ssl')
    const base = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    }
    if (!sslParam) return base
    try {
      return { ...base, ssl: JSON.parse(sslParam) as { rejectUnauthorized: boolean } }
    } catch {
      return sslParam === 'true' ? { ...base, ssl: { rejectUnauthorized: false } } : base
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

async function tableExists(conn: Connection, table: string, database: string): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1',
    [database, table],
  )
  return rows.length > 0
}

async function countRefs(
  conn: Connection,
  check: RefCheck,
  vendorId: number,
): Promise<number> {
  const where = check.cast === 'string'
    ? `${check.column} = CAST(? AS CHAR)`
    : `${check.column} = ?`
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM ${check.table} WHERE ${where}`,
    [vendorId],
  )
  return Number(rows[0].cnt)
}

async function audit() {
  const config = getDatabaseConfig()
  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`)

  const conn = await createConnection(config)
  try {
    const activeChecks: RefCheck[] = []
    const skipped: string[] = []
    for (const check of REF_CHECKS) {
      if (check.optional && !(await tableExists(conn, check.table, config.database))) {
        skipped.push(check.table)
        continue
      }
      activeChecks.push(check)
    }

    if (skipped.length > 0) {
      console.log(`Skipping missing optional tables: ${skipped.join(', ')}\n`)
    }

    const [groupRows] = await conn.query<RowDataPacket[]>(
      `SELECT name, COUNT(*) AS cnt
       FROM vendors
       GROUP BY name
       HAVING COUNT(*) > 1
       ORDER BY name`,
    )

    if (groupRows.length === 0) {
      console.log('No duplicate vendor names found.')
      return
    }

    console.log(`Found ${groupRows.length} duplicate name group(s).\n`)

    for (const g of groupRows) {
      const name = g.name as string
      const [vendorRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, name, is_active, created_at, updated_at
         FROM vendors
         WHERE name = ?
         ORDER BY is_active DESC, id ASC`,
        [name],
      )

      console.log('='.repeat(80))
      console.log(`Vendor name: ${JSON.stringify(name)} (${vendorRows.length} rows)`)
      console.log('='.repeat(80))

      const header = ['id', 'is_active', 'created_at', ...activeChecks.map(c => c.table)]
      const widths = header.map(h => h.length)
      const lines: string[][] = []

      for (const v of vendorRows as VendorRow[]) {
        const counts: number[] = []
        for (const check of activeChecks) {
          counts.push(await countRefs(conn, check, v.id))
        }
        const row = [
          String(v.id),
          v.is_active === 1 ? 'yes' : 'no',
          v.created_at ? new Date(v.created_at).toISOString() : 'null',
          ...counts.map(String),
        ]
        row.forEach((cell, i) => {
          if (cell.length > widths[i]) widths[i] = cell.length
        })
        lines.push(row)
      }

      const fmt = (cells: string[]) =>
        cells.map((c, i) => c.padEnd(widths[i])).join('  ')
      console.log(fmt(header))
      console.log(widths.map(w => '-'.repeat(w)).join('  '))
      for (const line of lines) console.log(fmt(line))
      console.log('')
    }
  } finally {
    await conn.end()
  }
}

audit().catch(err => {
  console.error('Audit failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
