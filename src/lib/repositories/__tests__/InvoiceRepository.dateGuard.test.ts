/**
 * Area A backstop: the InvoiceRepository date-range guard.
 *
 * Verifies that `saveInvoiceData` rejects out-of-range years BEFORE any DB write
 * (criterion A8) — protecting non-HTTP callers that bypass the API route. We
 * mock the database client so any accidental write would be observable, then
 * assert `db.transaction` was never reached when a bad date is supplied.
 */

import type { UserContext } from '@/lib/auth/types'
import { PayrollDateRangeError, maxPayrollYear } from '@/lib/utils/dateValidation'

const transactionExecute = jest.fn().mockResolvedValue({
  salesResults: [],
  overrideResults: [],
  expenseResults: [],
  deletedSales: [],
})

const mockDb = {
  transaction: jest.fn().mockReturnValue({ execute: transactionExecute }),
  selectFrom: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  executeTakeFirst: jest.fn().mockResolvedValue(null),
  insertInto: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  updateTable: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue([]),
}

jest.mock('@/lib/database/client', () => ({ db: mockDb }))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

jest.mock('../InvoiceAuditRepository', () => ({
  invoiceAuditRepository: { createAuditRecord: jest.fn().mockResolvedValue(undefined) },
}))

// Lazily required after mocks are registered (jest hoists jest.mock above
// imports; a top-level import of the repo would bind the real db client).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { invoiceRepository } = require('../InvoiceRepository.simple')

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const MAX_YEAR = maxPayrollYear()

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    vendor: '1',
    agentId: 10,
    issueDate: '2026-06-24',
    weekending: '2026-06-20',
    sales: [
      {
        sale_date: '2026-06-18',
        first_name: 'Jane',
        last_name: 'Doe',
        address: '1 Main',
        city: 'Town',
        status: 'sold',
        amount: 100,
      },
    ],
    ...overrides,
  }
}

describe('InvoiceRepository.saveInvoiceData date guard (Area A backstop)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.transaction.mockReturnValue({ execute: transactionExecute })
  })

  it('A1/A8: rejects out-of-range issueDate before any DB write', async () => {
    await expect(
      invoiceRepository.saveInvoiceData(baseRequest({ issueDate: '2926-06-24' }) as never, adminCtx)
    ).rejects.toBeInstanceOf(PayrollDateRangeError)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('A2: rejects out-of-range weekending before any DB write', async () => {
    await expect(
      invoiceRepository.saveInvoiceData(baseRequest({ weekending: '1899-01-01' }) as never, adminCtx)
    ).rejects.toBeInstanceOf(PayrollDateRangeError)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('A3: rejects an out-of-range sale_date and names the failing row', async () => {
    const req = baseRequest({
      sales: [
        {
          sale_date: '9999-01-01',
          first_name: 'A',
          last_name: 'B',
          address: 'x',
          city: 'y',
          status: 'sold',
          amount: 1,
        },
      ],
    })
    await expect(
      invoiceRepository.saveInvoiceData(req as never, adminCtx)
    ).rejects.toMatchObject({ field: 'sales[0].sale_date' })
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('A6: rejects Y+2', async () => {
    await expect(
      invoiceRepository.saveInvoiceData(
        baseRequest({ issueDate: `${MAX_YEAR + 1}-01-01` }) as never,
        adminCtx
      )
    ).rejects.toBeInstanceOf(PayrollDateRangeError)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('R1: in-range request passes the guard and reaches the transaction', async () => {
    await invoiceRepository.saveInvoiceData(baseRequest() as never, adminCtx)
    expect(mockDb.transaction).toHaveBeenCalled()
  })
})
