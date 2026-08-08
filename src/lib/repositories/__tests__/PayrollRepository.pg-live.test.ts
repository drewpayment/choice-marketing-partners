/**
 * @jest-environment node
 */

/**
 * OPT-IN live-Postgres suite for the payroll money-writing core.
 *
 * Skipped unless `PG_TEST_DATABASE_URL` is set. To run against the disposable
 * local container:
 *
 *   PG_TEST_DATABASE_URL='postgres://choice:choice@127.0.0.1:5433/choice_marketing' \
 *     bun run test -- src/lib/repositories/__tests__/PayrollRepository.pg-live.test.ts
 *
 * WHY: every other suite in this group mocks `@/lib/database/client`, so no test
 * ever hands real SQL to a real planner. That is how two guaranteed
 * `function sum(character varying) does not exist` outages — `getPayrollSummary`
 * and the whole advance-write path — shipped with a green bar. Type-checking and
 * compiled-SQL assertions cannot catch a missing operator overload; only the
 * server can. These three tests are the ones that would have caught them.
 *
 * SAFETY: never point this at production. Everything it writes is scoped to the
 * sentinel issue date below and removed in afterAll, in FK-safe order.
 */

import type { UserContext } from '@/lib/auth/types'

const LIVE_URL = process.env.PG_TEST_DATABASE_URL
const describeLive = LIVE_URL ? describe : describe.skip

// Far-future sentinel: no real statement can collide with it, and every cleanup
// delete is keyed on it.
const SENTINEL_ISSUE_DATE = '2099-01-09'
const SENTINEL_WKENDING = '2099-01-05'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

describeLive('payroll core against a live Postgres', () => {
  // Modules are imported dynamically so that `@/lib/database/client` (which opens
  // a pool at import time) is never loaded when the suite is skipped.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let db: any
  let payrollRepo: any
  let advanceRepo: any
  let invoiceRepo: any
  /* eslint-enable @typescript-eslint/no-explicit-any */

  let agentId: number
  let agentName: string
  let vendorId: number
  let vendorName: string

  beforeAll(async () => {
    process.env.DATABASE_URL = LIVE_URL

    db = (await import('@/lib/database/client')).db
    payrollRepo = new (await import('../PayrollRepository')).PayrollRepository()
    advanceRepo = new (await import('../AdvanceRepository')).AdvanceRepository()
    invoiceRepo = new (await import('../InvoiceRepository.simple')).InvoiceRepository()

    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name'])
      .where('deleted_at', 'is', null)
      .orderBy('id', 'asc')
      .executeTakeFirstOrThrow()
    agentId = employee.id
    agentName = employee.name

    const vendor = await db
      .selectFrom('vendors')
      .select(['id', 'name'])
      .orderBy('id', 'asc')
      .executeTakeFirstOrThrow()
    vendorId = vendor.id
    vendorName = vendor.name

    // The advance path only resyncs when the statement ALREADY exists, which is
    // exactly the branch that ran the failing SUM. Seed one.
    await db
      .insertInto('paystubs')
      .values({
        agent_id: agentId,
        agent_name: agentName,
        vendor_id: vendorId,
        vendor_name: vendorName,
        amount: '100.0000',
        issue_date: SENTINEL_ISSUE_DATE,
        weekend_date: SENTINEL_WKENDING,
        modified_by: adminCtx.employeeId!,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute()

    await db
      .insertInto('payroll')
      .values({
        agent_id: agentId,
        agent_name: agentName,
        amount: '100.0000',
        is_paid: 0,
        vendor_id: vendorId,
        pay_date: SENTINEL_ISSUE_DATE,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute()
  }, 30000)

  afterAll(async () => {
    if (!db) return
    // FK-safe order: audit children before their parents.
    const advanceIds = (
      await db
        .selectFrom('advances')
        .select('advance_id')
        .where('issue_date', '=', SENTINEL_ISSUE_DATE)
        .execute()
    ).map((r: { advance_id: number }) => r.advance_id)
    if (advanceIds.length) {
      await db.deleteFrom('advance_audit').where('advance_id', 'in', advanceIds).execute()
    }

    const invoiceIds = (
      await db
        .selectFrom('invoices')
        .select('invoice_id')
        .where('issue_date', '=', SENTINEL_ISSUE_DATE)
        .execute()
    ).map((r: { invoice_id: number }) => r.invoice_id)
    if (invoiceIds.length) {
      await db.deleteFrom('invoice_audit').where('invoice_id', 'in', invoiceIds).execute()
    }

    // expense_audit has no FK, so its rows would outlive the expenses and show up
    // as orphans forever. (They are only written when `auditMetadata` is passed,
    // which these tests omit — this is belt-and-braces for when that changes.)
    const expenseIds = (
      await db
        .selectFrom('expenses')
        .select('expid')
        .where('issue_date', '=', SENTINEL_ISSUE_DATE)
        .execute()
    ).map((r: { expid: number }) => r.expid)
    if (expenseIds.length) {
      await db.deleteFrom('expense_audit').where('expense_id', 'in', expenseIds).execute()
    }

    await db.deleteFrom('advances').where('issue_date', '=', SENTINEL_ISSUE_DATE).execute()
    await db.deleteFrom('invoices').where('issue_date', '=', SENTINEL_ISSUE_DATE).execute()
    await db.deleteFrom('overrides').where('issue_date', '=', SENTINEL_ISSUE_DATE).execute()
    await db.deleteFrom('expenses').where('issue_date', '=', SENTINEL_ISSUE_DATE).execute()
    await db.deleteFrom('paystubs').where('issue_date', '=', SENTINEL_ISSUE_DATE).execute()
    await db.deleteFrom('payroll').where('pay_date', '=', SENTINEL_ISSUE_DATE).execute()
    await db.destroy()
  }, 30000)

  it('getPayrollSummary executes (SUM over the varchar invoices.amount)', async () => {
    // Regression: `db.fn.sum('amount')` over `invoices` threw
    // `function sum(character varying) does not exist` at PARSE time, 500ing
    // /payroll for every admin and manager.
    const result = await payrollRepo.getPayrollSummary({ page: 1, limit: 5 }, adminCtx)

    expect(Array.isArray(result.data)).toBe(true)
    expect(result.pagination.total).toBeGreaterThan(0)
    for (const row of result.data) {
      expect(Number.isNaN(row.salesTotal)).toBe(false)
    }
  }, 60000)

  it('createAdvance resyncs statement totals without a sum(varchar) failure', async () => {
    // Regression: resyncStatementTotals runs INSIDE the advance transaction, so
    // the same parse error rolled back every advance recorded against an
    // existing statement.
    const advance = await advanceRepo.createAdvance(
      {
        agentid: agentId,
        vendorId,
        amount: 25,
        advanceDate: SENTINEL_ISSUE_DATE,
        issueDate: SENTINEL_ISSUE_DATE,
        wkending: SENTINEL_WKENDING,
        method: 'cash',
        notes: 'pg-live regression probe',
      },
      adminCtx,
      { changedBy: adminCtx.employeeId!, ipAddress: '127.0.0.1', userAgent: 'jest' }
    )

    // RETURNING, not insertId.
    expect(typeof advance.advance_id).toBe('number')
    expect(Number.isNaN(advance.advance_id)).toBe(false)

    // The resync actually rewrote the persisted totals: 100 seeded - 25 advance.
    const paystub = await db
      .selectFrom('paystubs')
      .select('amount')
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where('issue_date', '=', SENTINEL_ISSUE_DATE)
      .executeTakeFirstOrThrow()
    expect(parseFloat(paystub.amount.toString())).toBeCloseTo(-25, 2)
  }, 60000)

  it('saveInvoiceData writes through the RETURNING/ON CONFLICT paths', async () => {
    const result = await invoiceRepo.saveInvoiceData(
      {
        vendor: String(vendorId),
        agentId,
        issueDate: SENTINEL_ISSUE_DATE,
        weekending: SENTINEL_WKENDING,
        sales: [
          {
            sale_date: SENTINEL_ISSUE_DATE,
            first_name: 'PgLive',
            last_name: 'Probe',
            address: '1 Test St',
            city: 'Testville',
            status: 'Active',
            amount: 300,
          },
        ],
        overrides: [{ name: 'PgLive Probe', sales: 1, commission: 10, total: 10 }],
        expenses: [{ type: 'Fuel', amount: -30, notes: 'pg-live regression probe' }],
      },
      adminCtx
    )

    expect(result.success).toBe(true)
    // Postgres never populates insertId; these ids come back via RETURNING.
    expect(typeof result.sales[0].invoice_id).toBe('number')
    expect(Number.isNaN(result.sales[0].invoice_id)).toBe(false)

    const persisted = await db
      .selectFrom('invoices')
      .select(['amount'])
      .where('invoice_id', '=', result.sales[0].invoice_id)
      .executeTakeFirstOrThrow()
    expect(parseFloat(persisted.amount)).toBeCloseTo(300, 2)
  }, 60000)
})
