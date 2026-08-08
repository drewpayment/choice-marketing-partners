/* eslint-disable @typescript-eslint/no-explicit-any -- chainable db test mock is intentionally untyped */
/**
 * Postgres write-path coverage for InvoiceRepository.simple.
 *
 * These are the money-writing inserts inside the payroll transaction. Under MySQL
 * the generated keys arrived on `InsertResult.insertId`; Postgres NEVER populates
 * that field, so every id must come back through RETURNING. The expense key is the
 * worst case — it is written straight back out as the `expense_id` FK on
 * `scheduled_expense_applications`, so a regression to `insertId` would silently
 * store `NaN`/NULL rather than fail loudly.
 *
 * The upsert on that same table also has to name its conflict target explicitly;
 * the only unique index is `(scheduled_expense_id, issue_date)`.
 */

// eslint-disable-next-line no-var
var mockChain: any
// eslint-disable-next-line no-var
var recorder: Array<{ method: string; args: any[] }>
// eslint-disable-next-line no-var
var generatedIds: Record<string, number>

jest.mock('@/lib/database/client', () => {
  recorder = []
  generatedIds = { invoice_id: 8001, ovrid: 8002, expid: 8003 }
  let lastReturning: string | null = null

  const record = (method: string) =>
    jest.fn((...args: any[]) => {
      recorder.push({ method, args })
      if (method === 'returning') lastReturning = args[0]
      return mockChain
    })

  mockChain = {
    selectFrom: record('selectFrom'),
    select: record('select'),
    selectAll: record('selectAll'),
    where: record('where'),
    orderBy: record('orderBy'),
    groupBy: record('groupBy'),
    insertInto: record('insertInto'),
    values: record('values'),
    onConflict: record('onConflict'),
    returning: record('returning'),
    updateTable: record('updateTable'),
    set: record('set'),
    deleteFrom: record('deleteFrom'),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    // Mimics RETURNING: the row comes back keyed by whatever column was requested.
    executeTakeFirstOrThrow: jest.fn(async () => {
      if (!lastReturning) throw new Error('executeTakeFirstOrThrow without returning()')
      const col = lastReturning
      lastReturning = null
      return { [col]: generatedIds[col] }
    }),
    fn: Object.assign(jest.fn().mockReturnValue('DATE_EXPR'), {
      sum: jest.fn().mockReturnValue({ as: jest.fn() }),
      count: jest.fn().mockReturnValue({ as: jest.fn() }),
      max: jest.fn().mockReturnValue({ as: jest.fn() }),
    }),
    transaction: jest.fn().mockReturnValue({
      execute: jest.fn().mockImplementation((fn: any) => fn(mockChain)),
    }),
  }
  return { db: mockChain }
})

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

const invoiceAuditCalls: any[][] = []
const expenseAuditCalls: any[][] = []
jest.mock('../InvoiceAuditRepository', () => ({
  invoiceAuditRepository: {
    createAuditRecord: jest.fn(async (...args: any[]) => {
      invoiceAuditCalls.push(args)
      return 1
    }),
  },
}))
jest.mock('../ExpenseAuditRepository', () => ({
  expenseAuditRepository: {
    createAuditRecord: jest.fn(async (...args: any[]) => {
      expenseAuditCalls.push(args)
      return 1
    }),
  },
}))

import { InvoiceRepository } from '../InvoiceRepository.simple'
import type { UserContext } from '@/lib/auth/types'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

/** Calls to `.values(...)` whose payload contains every one of `keys`. */
const valuesWith = (...keys: string[]) =>
  recorder
    .filter((c) => c.method === 'values')
    .map((c) => c.args[0])
    .filter((v) => keys.every((k) => k in v))

const baseRequest = {
  vendor: '7',
  agentId: 10,
  issueDate: '2026-01-09',
  weekending: '2026-01-04',
  sales: [
    {
      sale_date: '01-05-2026',
      first_name: 'A',
      last_name: 'B',
      address: 'addr',
      city: 'city',
      status: 'sold',
      amount: 100,
    },
  ],
  overrides: [{ name: 'ovr', sales: 1, commission: 5, total: 25 }],
  expenses: [{ type: 'gas', amount: -30, notes: 'n', scheduledExpenseId: 555 }],
  auditMetadata: {
    userId: 42,
    userEmail: 'admin@test.com',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  },
}

describe('InvoiceRepository.simple — Postgres write path', () => {
  let repo: InvoiceRepository
  let result: any

  beforeAll(async () => {
    repo = new InvoiceRepository()
    result = await repo.saveInvoiceData(baseRequest as any, adminCtx)
  })

  it('asks Postgres to RETURN each table’s real primary key', () => {
    const returned = recorder.filter((c) => c.method === 'returning').map((c) => c.args[0])
    expect(returned).toEqual(expect.arrayContaining(['invoice_id', 'ovrid', 'expid']))
  })

  it('propagates the RETURNING ids (never NaN from a Postgres insertId)', () => {
    expect(result.sales[0].invoice_id).toBe(8001)
    expect(result.overrides[0].ovrid).toBe(8002)
    expect(result.expenses[0].expid).toBe(8003)
    for (const id of [result.sales[0].invoice_id, result.overrides[0].ovrid, result.expenses[0].expid]) {
      expect(Number.isNaN(id)).toBe(false)
    }
  })

  it('writes the returned expid as the scheduled_expense_applications FK', () => {
    const [app] = valuesWith('scheduled_expense_id', 'expense_id')
    expect(app).toBeDefined()
    expect(app.expense_id).toBe(8003)
    expect(app.scheduled_expense_id).toBe(555)
    expect(app.applied_by).toBe(42)
    expect(app.amount).toBe('-30')
  })

  it('upserts on the real unique index (scheduled_expense_id, issue_date)', () => {
    const onConflict = recorder.find((c) => c.method === 'onConflict')
    expect(onConflict).toBeDefined()

    // Drive the builder callback to capture the conflict target + update payload.
    let columns: string[] | undefined
    let updateSet: any
    const oc = {
      columns: jest.fn((cols: string[]) => {
        columns = cols
        return { doUpdateSet: jest.fn((s: any) => (updateSet = s)) }
      }),
    }
    onConflict!.args[0](oc)

    expect(columns).toEqual(['scheduled_expense_id', 'issue_date'])
    // The refreshed snapshot must carry the same real expense id, not NaN.
    expect(updateSet.expense_id).toBe(8003)
    expect(updateSet.amount).toBe('-30')
    expect(updateSet.applied_by).toBe(42)
  })

  it('anchors the audit trail on the returned keys', () => {
    expect(invoiceAuditCalls[0][0]).toBe(8001)
    expect(expenseAuditCalls[0][0]).toBe(8003)
  })
})
