/* eslint-disable @typescript-eslint/no-explicit-any -- chainable db test mock is intentionally untyped */
import type { UserContext } from '@/lib/auth/types'

// Chainable db mock — same shape as AdvanceRepository.rbac.test.ts.
// execute()/executeTakeFirst() resolve empty by default.
// Must use `var` so jest.mock hoisting doesn't hit the temporal dead zone.
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
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
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

import { AdvanceRepository } from '../AdvanceRepository'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const audit = { changedBy: 1 }

// A fully-populated advance row the `existing` lookup + getAdvanceById can return.
//
// The three DATE columns use `new Date(y, m, d)` (LOCAL midnight) rather than
// `new Date('YYYY-MM-DD')` (UTC midnight) because that is what the drivers actually
// hand back for a `date` column — mysql2 and node-postgres both build the Date from
// the calendar parts in the process timezone. Using the UTC form made these
// assertions silently fail on any runner west of UTC, where dayjs().format()
// rendered the previous day.
const existingAdvance = {
  advance_id: 1,
  agentid: 10,
  vendor_id: 5,
  amount: '100',
  advance_date: new Date(2026, 0, 5),
  issue_date: new Date(2026, 0, 9),
  wkending: new Date(2026, 0, 4),
  method: 'cash',
  notes: '',
  created_by: 1,
  created_at: new Date('2026-01-05'),
  updated_at: new Date('2026-01-05'),
}

describe('AdvanceRepository.resyncStatementTotals', () => {
  let repo: AdvanceRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
    mockChain.executeTakeFirst.mockResolvedValue(null)
    repo = new AdvanceRepository()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('direct resync', () => {
    it('recomputes and writes paystubs + payroll totals when a statement exists', async () => {
      // Every executeTakeFirst returns a truthy row with total '50':
      //   paystub existence -> truthy, and each SUM -> 50.
      mockChain.executeTakeFirst.mockResolvedValue({ id: 1, total: '50' })

      await (repo as any).resyncStatementTotals(mockChain, 10, 5, '2026-01-09')

      // total = 50 (sales) + 50 (overrides) + 50 (expenses) - 50 (advances) = 100
      expect(mockChain.updateTable).toHaveBeenCalledWith('paystubs')
      expect(mockChain.updateTable).toHaveBeenCalledWith('payroll')

      const setAmounts = mockChain.set.mock.calls.map((c: any[]) => c[0].amount)
      expect(setAmounts).toContain('100')
      // Both paystubs and payroll are written with the recomputed amount.
      expect(setAmounts.filter((a: string) => a === '100')).toHaveLength(2)
    })

    it('no-ops when no paystubs row exists yet', async () => {
      // Default executeTakeFirst resolves null -> statement absent.
      await (repo as any).resyncStatementTotals(mockChain, 10, 5, '2026-01-09')

      expect(mockChain.updateTable).not.toHaveBeenCalled()
    })
  })

  describe('updateAdvance move-key semantics', () => {
    it('resyncs BOTH the old and new issue_date keys when the advance moves', async () => {
      mockChain.executeTakeFirst.mockResolvedValue(existingAdvance)
      const spy = jest
        .spyOn(repo as any, 'resyncStatementTotals')
        .mockResolvedValue(undefined)

      // Move the advance from 2026-01-09 to 2026-01-16.
      await repo.updateAdvance(1, { issueDate: '2026-01-16' }, adminCtx, audit)

      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(expect.anything(), 10, 5, '2026-01-09')
      expect(spy).toHaveBeenCalledWith(expect.anything(), 10, 5, '2026-01-16')
    })

    it('resyncs the key only once when issue_date is unchanged', async () => {
      mockChain.executeTakeFirst.mockResolvedValue(existingAdvance)
      const spy = jest
        .spyOn(repo as any, 'resyncStatementTotals')
        .mockResolvedValue(undefined)

      // Amount-only edit — issue_date stays 2026-01-09.
      await repo.updateAdvance(1, { amount: 200 }, adminCtx, audit)

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(expect.anything(), 10, 5, '2026-01-09')
    })
  })
})
