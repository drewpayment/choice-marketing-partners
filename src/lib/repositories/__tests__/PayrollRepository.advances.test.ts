import type { UserContext } from '@/lib/auth/types'

// eslint-disable-next-line no-var
var mockChain: any

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    fn: Object.assign(jest.fn().mockReturnValue('DATE_EXPR'), {
      count: jest.fn().mockReturnValue({ as: jest.fn() }),
      sum: jest.fn().mockReturnValue({ as: jest.fn() }),
      max: jest.fn().mockReturnValue({ as: jest.fn() }),
    }),
  }
  return { db: mockChain }
})

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
}))

jest.mock('../VendorFieldRepository', () => ({
  VendorFieldRepository: jest.fn().mockImplementation(() => ({
    getActiveFieldsForDisplay: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { PayrollRepository } from '../PayrollRepository'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

describe('PayrollRepository.getPaystubDetail — advances subtract from net pay', () => {
  let repo: PayrollRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new PayrollRepository()

    // executeTakeFirst order: employee, vendor, paystub, payrollRow
    mockChain.executeTakeFirst
      .mockResolvedValueOnce({
        id: 5,
        name: 'Rep',
        email: 'rep@example.com',
        sales_id1: '',
        is_active: 1,
        is_admin: 0,
        is_mgr: 0,
      })
      .mockResolvedValueOnce({ id: 2, name: 'Vendor', is_active: 1 })
      .mockResolvedValueOnce(null) // paystub meta
      .mockResolvedValueOnce({ is_paid: 0 }) // payroll row -> isPaid false

    // execute order: invoices(sales), overrides, expenses, advances
    mockChain.execute
      .mockResolvedValueOnce([{ invoice_id: 1, amount: '1000', custom_fields: null }])
      .mockResolvedValueOnce([{ ovrid: 1, total: '200' }])
      .mockResolvedValueOnce([{ expid: 1, amount: '50' }])
      .mockResolvedValueOnce([
        {
          advance_id: 1,
          agentid: 5,
          vendor_id: 2,
          amount: '300',
          advance_date: new Date('2026-01-05T00:00:00Z'),
          issue_date: new Date('2026-01-09T00:00:00Z'),
          wkending: new Date('2026-01-04T00:00:00Z'),
          method: 'cash',
          notes: '',
        },
      ])
  })

  it('computes netPay = sales + overrides + expenses - advances', async () => {
    const detail = await repo.getPaystubDetail(5, 2, '2026-01-09', adminCtx)

    expect(detail).not.toBeNull()
    expect(detail!.totals.sales).toBe(1000)
    expect(detail!.totals.overrides).toBe(200)
    expect(detail!.totals.expenses).toBe(50)
    expect(detail!.totals.advances).toBe(300)
    // 1000 + 200 + 50 - 300
    expect(detail!.totals.netPay).toBe(950)
  })

  it('exposes the advances line items and resolves real isPaid', async () => {
    const detail = await repo.getPaystubDetail(5, 2, '2026-01-09', adminCtx)

    expect(detail!.advances).toHaveLength(1)
    expect(detail!.advances[0]).toMatchObject({ advance_id: 1, amount: 300, method: 'cash' })
    expect(detail!.isPaid).toBe(false)
  })
})
