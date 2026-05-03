/**
 * Merge duplicate vendor rows into a single canonical row per name.
 *
 * Dry run by default. Pass --apply to commit changes.
 *
 * Canonical pick: is_active DESC, id ASC (active beats inactive; tie-breaker
 * is the oldest id).
 *
 * Loser handling: rows are NOT deleted. They are marked is_active = 0 and
 * renamed to "[archived #<id>] <original name>" so the canonical name becomes
 * unique while preserving every loser id for historical reference (e.g.,
 * payroll_audit.vendor_id stays resolvable).
 *
 * Each duplicate group is wrapped in its own transaction; a failure in one
 * group rolls that group back and continues to the next.
 *
 * Reference rewrites cover the same tables the audit script reports against,
 * minus payroll_audit (audit-only — historical record, do not rewrite).
 *
 * Special cases:
 *   - invoices.vendor is a stringified id; both sides cast as CHAR.
 *   - paystubs.vendor_name is denormalized; rewrite alongside vendor_id.
 *   - vendor_field_definitions has UNIQUE(vendor_id, field_key); overlapping
 *     loser rows are deleted before the re-point.
 *
 * Usage:
 *   bun run scripts/merge-duplicate-vendors.ts            # dry run
 *   bun run scripts/merge-duplicate-vendors.ts --apply    # commit
 */
import { createConnection, type Connection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise'

const APPLY = process.argv.includes('--apply')

interface VendorRow {
  id: number
  name: string
  is_active: number
}

interface MergeStep {
  table: string
  optional?: boolean
}

const MERGE_STEPS: MergeStep[] = [
  { table: 'invoices' },
  { table: 'overrides' },
  { table: 'expenses' },
  { table: 'paystubs' },
  { table: 'payroll' },
  { table: 'vendor_field_definitions' },
  { table: 'daily_pay_enrollments', optional: true },
  { table: 'daily_punch_records', optional: true },
  { table: 'daily_pay_records', optional: true },
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

async function countLoser(conn: Connection, table: string, loserId: number): Promise<number> {
  const where = table === 'invoices' ? 'vendor = CAST(? AS CHAR)' : 'vendor_id = ?'
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE ${where}`,
    [loserId],
  )
  return Number(rows[0].cnt)
}

/**
 * Re-point one table's references from loser → canonical. Returns a
 * description of what was (or would be) done for logging.
 */
async function repointTable(
  conn: Connection,
  table: string,
  canonical: VendorRow,
  loserId: number,
): Promise<string> {
  if (table === 'invoices') {
    const [r] = await conn.query<ResultSetHeader>(
      'UPDATE invoices SET vendor = CAST(? AS CHAR) WHERE vendor = CAST(? AS CHAR)',
      [canonical.id, loserId],
    )
    return `invoices: ${r.affectedRows} row(s) re-pointed (vendor string)`
  }

  if (table === 'paystubs') {
    const [r] = await conn.query<ResultSetHeader>(
      'UPDATE paystubs SET vendor_id = ?, vendor_name = ? WHERE vendor_id = ?',
      [canonical.id, canonical.name, loserId],
    )
    return `paystubs: ${r.affectedRows} row(s) re-pointed (vendor_id + vendor_name)`
  }

  if (table === 'vendor_field_definitions') {
    // Delete loser rows whose field_key already exists on the canonical row,
    // since UNIQUE(vendor_id, field_key) would block the UPDATE.
    const [del] = await conn.query<ResultSetHeader>(
      `DELETE l FROM vendor_field_definitions l
         INNER JOIN vendor_field_definitions c
           ON c.vendor_id = ? AND c.field_key = l.field_key
         WHERE l.vendor_id = ?`,
      [canonical.id, loserId],
    )
    const [upd] = await conn.query<ResultSetHeader>(
      'UPDATE vendor_field_definitions SET vendor_id = ? WHERE vendor_id = ?',
      [canonical.id, loserId],
    )
    return `vendor_field_definitions: ${del.affectedRows} overlap(s) dropped, ${upd.affectedRows} row(s) re-pointed`
  }

  const [r] = await conn.query<ResultSetHeader>(
    `UPDATE ${table} SET vendor_id = ? WHERE vendor_id = ?`,
    [canonical.id, loserId],
  )
  return `${table}: ${r.affectedRows} row(s) re-pointed`
}

async function mergeGroup(
  conn: Connection,
  name: string,
  vendors: VendorRow[],
  activeSteps: MergeStep[],
): Promise<{ ok: boolean; error?: string }> {
  const [canonical, ...losers] = vendors
  console.log('-'.repeat(80))
  console.log(`Group: ${JSON.stringify(name)}`)
  console.log(`  Canonical: id=${canonical.id} (is_active=${canonical.is_active})`)
  console.log(`  Losers:    ${losers.map(l => `${l.id}(active=${l.is_active})`).join(', ')}`)

  // Pre-mutation reference counts for visibility.
  for (const loser of losers) {
    const counts: string[] = []
    for (const step of activeSteps) {
      const n = await countLoser(conn, step.table, loser.id)
      if (n > 0) counts.push(`${step.table}=${n}`)
    }
    console.log(`  loser ${loser.id} refs: ${counts.length ? counts.join(', ') : '(none)'}`)
  }

  await conn.query('START TRANSACTION')
  try {
    for (const loser of losers) {
      console.log(`  Re-pointing loser ${loser.id} → canonical ${canonical.id}:`)
      for (const step of activeSteps) {
        const msg = await repointTable(conn, step.table, canonical, loser.id)
        console.log(`    ${msg}`)
      }
    }

    for (const loser of losers) {
      const archivedName = `[archived #${loser.id}] ${loser.name}`
      const [arch] = await conn.query<ResultSetHeader>(
        `UPDATE vendors
            SET is_active = 0,
                name = ?,
                updated_at = NOW()
          WHERE id = ?`,
        [archivedName, loser.id],
      )
      console.log(`  Archived loser ${loser.id}: name → ${JSON.stringify(archivedName)} (${arch.affectedRows} row)`)
    }

    if (APPLY) {
      await conn.query('COMMIT')
      console.log(`  COMMIT.`)
    } else {
      await conn.query('ROLLBACK')
      console.log(`  ROLLBACK (dry run).`)
    }
    return { ok: true }
  } catch (err) {
    await conn.query('ROLLBACK')
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ERROR — rolled back: ${msg}`)
    return { ok: false, error: msg }
  }
}

async function run() {
  const config = getDatabaseConfig()
  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`)
  console.log(APPLY ? 'Mode: APPLY (changes will be committed)' : 'Mode: DRY RUN (no changes will be committed)')
  console.log('')

  const conn = await createConnection(config)
  try {
    const activeSteps: MergeStep[] = []
    const skipped: string[] = []
    for (const step of MERGE_STEPS) {
      if (step.optional && !(await tableExists(conn, step.table, config.database))) {
        skipped.push(step.table)
        continue
      }
      activeSteps.push(step)
    }
    if (skipped.length > 0) {
      console.log(`Skipping missing optional tables: ${skipped.join(', ')}\n`)
    }

    const [groups] = await conn.query<RowDataPacket[]>(
      `SELECT name FROM vendors GROUP BY name HAVING COUNT(*) > 1 ORDER BY name`,
    )

    if (groups.length === 0) {
      console.log('No duplicate vendor names found.')
      return
    }

    let okCount = 0
    let failCount = 0
    for (const g of groups) {
      const name = g.name as string
      const [vendors] = await conn.query<RowDataPacket[]>(
        `SELECT id, name, is_active
         FROM vendors
         WHERE name = ?
         ORDER BY is_active DESC, id ASC`,
        [name],
      )
      const result = await mergeGroup(conn, name, vendors as VendorRow[], activeSteps)
      if (result.ok) okCount++
      else failCount++
    }

    console.log('')
    console.log('='.repeat(80))
    console.log(`Summary: ${okCount} group(s) ${APPLY ? 'merged' : 'simulated'}, ${failCount} failed.`)
    if (!APPLY) console.log('Re-run with --apply to commit changes.')
  } finally {
    await conn.end()
  }
}

run().catch(err => {
  console.error('Merge failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
