import type { UserContext } from '@/lib/auth/types'

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
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    fn: Object.assign(jest.fn().mockReturnValue('DATE_EXPR'), {
      sum: jest.fn().mockReturnValue({ as: jest.fn() }),
    }),
  }
  return { db: mockChain }
})
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { ScheduledExpenseRepository, isTemplateDue } from '../ScheduledExpenseRepository'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

describe('isTemplateDue cadence math', () => {
  describe('weekly', () => {
    const t = { frequency: 'weekly', start_date: '2026-01-04', end_date: null }
    it('is due every week within the window', () => {
      expect(isTemplateDue(t, '2026-01-04')).toBe(true)
      expect(isTemplateDue(t, '2026-01-11')).toBe(true)
      expect(isTemplateDue(t, '2026-01-18')).toBe(true)
    })
    it('is not due before start_date', () => {
      expect(isTemplateDue(t, '2025-12-28')).toBe(false)
    })
  })

  describe('biweekly', () => {
    // start week (week 0) is due, then every other week.
    const t = { frequency: 'biweekly', start_date: '2026-01-04', end_date: null }
    it('is due on even week offsets (0, 2, 4 ...)', () => {
      expect(isTemplateDue(t, '2026-01-04')).toBe(true) // week 0
      expect(isTemplateDue(t, '2026-01-18')).toBe(true) // week 2
      expect(isTemplateDue(t, '2026-02-01')).toBe(true) // week 4
    })
    it('is NOT due on odd week offsets (1, 3 ...)', () => {
      expect(isTemplateDue(t, '2026-01-11')).toBe(false) // week 1
      expect(isTemplateDue(t, '2026-01-25')).toBe(false) // week 3
    })
  })

  describe('monthly', () => {
    // anniversary day = 15th. Weekly statements ending on Sundays.
    const t = { frequency: 'monthly', start_date: '2026-01-15', end_date: null }
    it('is due on the first statement week on/after the monthly anniversary', () => {
      // Jan 2026 Sundays: 4, 11, 18, 25. First >= 15th is the 18th.
      expect(isTemplateDue(t, '2026-01-18')).toBe(true)
      expect(isTemplateDue(t, '2026-01-11')).toBe(false) // before anniversary
      expect(isTemplateDue(t, '2026-01-25')).toBe(false) // not the FIRST week past anniversary
    })
    it('fires exactly once in a later month too', () => {
      // Feb 2026 Sundays: 1, 8, 15, 22. First >= 15th is the 15th.
      expect(isTemplateDue(t, '2026-02-15')).toBe(true)
      expect(isTemplateDue(t, '2026-02-08')).toBe(false)
      expect(isTemplateDue(t, '2026-02-22')).toBe(false)
    })
    it('clamps the anniversary day to a short month (start day 31 -> Feb end)', () => {
      const endOfMonth = { frequency: 'monthly', start_date: '2026-01-31', end_date: null }
      // Feb 2026 has 28 days; anniversary clamps to Feb 28 (a Saturday).
      // First Sunday on/after Feb 28 is Mar 1? No — clamp is within Feb, so the
      // first statement week whose wkending >= Feb 28 within February is Feb 28
      // only if a statement lands there; using Sundays, none is >= Feb 28 in Feb,
      // so it is not due mid-Feb but IS caught on the last day.
      expect(isTemplateDue(endOfMonth, '2026-02-28')).toBe(true)
      expect(isTemplateDue(endOfMonth, '2026-02-22')).toBe(false)
    })
  })

  describe('end_date window', () => {
    it('is not due after end_date', () => {
      const t = { frequency: 'weekly', start_date: '2026-01-04', end_date: '2026-01-18' }
      expect(isTemplateDue(t, '2026-01-18')).toBe(true) // on end_date
      expect(isTemplateDue(t, '2026-01-25')).toBe(false) // past end_date
    })
  })
})

describe('ScheduledExpenseRepository RBAC + validation', () => {
  let repo: ScheduledExpenseRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
    mockChain.executeTakeFirst.mockResolvedValue(null)
    repo = new ScheduledExpenseRepository()
  })

  it('rejects create for employee role', async () => {
    await expect(
      repo.createTemplate(
        { agentid: 3, vendorId: 1, type: 'gas', amount: -10, frequency: 'weekly', startDate: '2026-01-04' },
        employeeCtx
      )
    ).rejects.toThrow('Insufficient permissions')
  })

  it('rejects an invalid frequency', async () => {
    await expect(
      repo.createTemplate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { agentid: 3, vendorId: 1, type: 'gas', amount: -10, frequency: 'daily' as any, startDate: '2026-01-04' },
        adminCtx
      )
    ).rejects.toThrow('Invalid frequency')
  })

  it('getDueTemplates rejects employee role (statement building is admin/manager)', async () => {
    await expect(
      repo.getDueTemplates(3, 1, '2026-01-18', employeeCtx)
    ).rejects.toThrow('Insufficient permissions')
  })

  it('getDueTemplates filters DB rows through the cadence rule', async () => {
    // Two active weekly/biweekly templates returned by the SQL pre-filter.
    mockChain.execute.mockResolvedValueOnce([
      { id: 1, agentid: 3, vendor_id: 1, type: 'weekly-fee', amount: '10.00', notes: '', frequency: 'weekly', start_date: '2026-01-04', end_date: null, is_active: 1, created_by: 1 },
      { id: 2, agentid: 3, vendor_id: 1, type: 'biweekly-fee', amount: '5.00', notes: '', frequency: 'biweekly', start_date: '2026-01-04', end_date: null, is_active: 1, created_by: 1 },
    ])
    // wkending 2026-01-11 = week 1 -> weekly due, biweekly NOT due.
    const due = await repo.getDueTemplates(3, 1, '2026-01-11', adminCtx)
    expect(due.map((d) => d.id)).toEqual([1])
  })
})
