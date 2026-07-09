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

import { ScheduledExpenseRepository, isTemplateDue, projectNextDue } from '../ScheduledExpenseRepository'

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

  describe('monthly_weekday (nth weekday of month)', () => {
    // Statements end on Sundays. Jan 2026: Jan 1 is a Thursday, so Mondays fall on
    // the 5th, 12th, 19th, 26th and Sunday statement-ends are Jan 4, 11, 18, 25.
    // First Monday of Jan 2026 = Jan 5, which lives in the window ending Jan 11
    // (window = Jan 5 … Jan 11 inclusive).
    const firstMonday = {
      frequency: 'monthly_weekday',
      start_date: '2026-01-01',
      end_date: null,
      monthly_week: 1,
      monthly_weekday: 1, // Monday
    }

    it('first Monday: due in the week whose window contains it, not others', () => {
      expect(isTemplateDue(firstMonday, '2026-01-11')).toBe(true) // window Jan 5–11 ⊇ Jan 5
      expect(isTemplateDue(firstMonday, '2026-01-04')).toBe(false) // window Dec 29–Jan 4, Jan 5 not yet
      expect(isTemplateDue(firstMonday, '2026-01-18')).toBe(false) // window Jan 12–18
      expect(isTemplateDue(firstMonday, '2026-01-25')).toBe(false) // window Jan 19–25
    })

    it('fires again the next month (first Monday of Feb 2026 = Feb 2)', () => {
      // Feb 2026 Mondays: 2, 9, 16, 23. First Monday = Feb 2, window ending Feb 8.
      expect(isTemplateDue(firstMonday, '2026-02-08')).toBe(true) // window Feb 2–8 ⊇ Feb 2
      expect(isTemplateDue(firstMonday, '2026-02-01')).toBe(false) // window Jan 26–Feb 1
    })

    it('LAST Friday in a 5-Friday month (Jan 2026 Fridays: 2,9,16,23,30 → Jan 30)', () => {
      const lastFriday = {
        frequency: 'monthly_weekday',
        start_date: '2026-01-01',
        end_date: null,
        monthly_week: 5, // last
        monthly_weekday: 5, // Friday
      }
      // Jan 30 lives in the window ending Feb 1 (Jan 26 … Feb 1).
      expect(isTemplateDue(lastFriday, '2026-02-01')).toBe(true)
      // Must NOT confuse "last" with the 4th Friday (Jan 23, window ending Jan 25).
      expect(isTemplateDue(lastFriday, '2026-01-25')).toBe(false)
    })

    it('straddle — occurrence in the EARLIER month (last Fri Jan 30, wkending Feb 1)', () => {
      const lastFriday = {
        frequency: 'monthly_weekday',
        start_date: '2026-01-01',
        end_date: null,
        monthly_week: 5,
        monthly_weekday: 5, // Friday
      }
      // Window Jan 26 … Feb 1 straddles Jan/Feb; the January occurrence (Jan 30) hits.
      expect(isTemplateDue(lastFriday, '2026-02-01')).toBe(true)
    })

    it('straddle — occurrence in the LATER month (first Sun Feb 1, wkending Feb 1)', () => {
      const firstSunday = {
        frequency: 'monthly_weekday',
        start_date: '2026-01-01',
        end_date: null,
        monthly_week: 1,
        monthly_weekday: 0, // Sunday
      }
      // Window Jan 26 … Feb 1 straddles Jan/Feb; the February occurrence (Feb 1) hits.
      expect(isTemplateDue(firstSunday, '2026-02-01')).toBe(true)
      // Jan's own first Sunday (Jan 4) already passed; not double-counted mid-Jan.
      expect(isTemplateDue(firstSunday, '2026-01-25')).toBe(false)
    })

    it('gates on the OCCURRENCE date, not wkending (start_date)', () => {
      // Occurrence = first Monday = Jan 5; wkending Jan 11.
      const base = { frequency: 'monthly_weekday', end_date: null, monthly_week: 1, monthly_weekday: 1 }
      expect(isTemplateDue({ ...base, start_date: '2026-01-05' }, '2026-01-11')).toBe(true) // start == occ
      // start_date Jan 6 is after the occurrence (Jan 5) but before wkending (Jan 11):
      // gating on the occurrence rejects it, gating on wkending would (wrongly) accept.
      expect(isTemplateDue({ ...base, start_date: '2026-01-06' }, '2026-01-11')).toBe(false)
    })

    it('gates on the OCCURRENCE date, not wkending (end_date)', () => {
      const base = { frequency: 'monthly_weekday', start_date: '2026-01-01', monthly_week: 1, monthly_weekday: 1 }
      // Occurrence Jan 5, wkending Jan 11.
      expect(isTemplateDue({ ...base, end_date: '2026-01-04' }, '2026-01-11')).toBe(false) // end < occ
      expect(isTemplateDue({ ...base, end_date: '2026-01-05' }, '2026-01-11')).toBe(true) // end == occ
      // end_date Jan 10 is >= occurrence (Jan 5) but < wkending (Jan 11): still due.
      expect(isTemplateDue({ ...base, end_date: '2026-01-10' }, '2026-01-11')).toBe(true)
    })

    it('is not due when the monthly fields are missing (malformed)', () => {
      const bad = { frequency: 'monthly_weekday', start_date: '2026-01-01', end_date: null }
      expect(isTemplateDue(bad, '2026-01-11')).toBe(false)
    })
  })
})

describe('projectNextDue forward projection', () => {
  it('returns paused for an inactive template regardless of cadence', () => {
    const t = { frequency: 'weekly', start_date: '2026-01-04', end_date: null, is_active: 0 }
    expect(projectNextDue(t, '2026-01-10')).toEqual({ kind: 'paused' })
  })

  describe('weekly', () => {
    const t = { frequency: 'weekly', start_date: '2026-01-04', end_date: null }
    it('projects every_week while inside the window', () => {
      expect(projectNextDue(t, '2026-01-10')).toEqual({ kind: 'every_week' })
    })
    it('is ended once end_date has passed', () => {
      const ended = { frequency: 'weekly', start_date: '2026-01-04', end_date: '2026-01-01' }
      expect(projectNextDue(ended, '2026-01-10')).toEqual({ kind: 'ended' })
    })
  })

  describe('biweekly (7-day due blocks [start + 14k, +6d])', () => {
    const t = { frequency: 'biweekly', start_date: '2026-01-04', end_date: null }
    it('returns the current block when fromDate falls inside it', () => {
      expect(projectNextDue(t, '2026-01-04')).toEqual({
        kind: 'week_window', start: '2026-01-04', end: '2026-01-10',
      })
      expect(projectNextDue(t, '2026-01-20')).toEqual({
        kind: 'week_window', start: '2026-01-18', end: '2026-01-24',
      })
    })
    it('advances to the next block when fromDate is past the current block end', () => {
      // Jan 11 is past the Jan 4–10 block → next block Jan 18–24.
      expect(projectNextDue(t, '2026-01-11')).toEqual({
        kind: 'week_window', start: '2026-01-18', end: '2026-01-24',
      })
    })
    it('projects the very first block when fromDate precedes start_date', () => {
      expect(projectNextDue(t, '2025-12-28')).toEqual({
        kind: 'week_window', start: '2026-01-04', end: '2026-01-10',
      })
    })
    it('is ended once end_date is before the projected block', () => {
      const ended = { frequency: 'biweekly', start_date: '2026-01-04', end_date: '2026-01-05' }
      expect(projectNextDue(ended, '2026-02-01')).toEqual({ kind: 'ended' })
    })
  })

  describe('monthly (clamped anniversary day-of-month)', () => {
    const t = { frequency: 'monthly', start_date: '2026-01-15', end_date: null }
    it('projects this month when the anniversary has not passed', () => {
      expect(projectNextDue(t, '2026-01-01')).toEqual({ kind: 'date', date: '2026-01-15' })
    })
    it('rolls to next month once the anniversary has passed', () => {
      expect(projectNextDue(t, '2026-01-20')).toEqual({ kind: 'date', date: '2026-02-15' })
    })
    it('clamps a day-31 start to a short month', () => {
      const eom = { frequency: 'monthly', start_date: '2026-01-31', end_date: null }
      expect(projectNextDue(eom, '2026-02-01')).toEqual({ kind: 'date', date: '2026-02-28' })
    })
    it('is ended when the next anniversary would exceed end_date', () => {
      const ended = { frequency: 'monthly', start_date: '2026-01-15', end_date: '2026-01-20' }
      expect(projectNextDue(ended, '2026-01-16')).toEqual({ kind: 'ended' })
    })
  })

  describe('monthly_weekday (nth / last weekday of month)', () => {
    const firstMonday = {
      frequency: 'monthly_weekday', start_date: '2026-01-01', end_date: null,
      monthly_week: 1, monthly_weekday: 1,
    }
    it('projects the first Monday of the current month', () => {
      // Jan 2026 Mondays: 5, 12, 19, 26.
      expect(projectNextDue(firstMonday, '2026-01-01')).toEqual({ kind: 'date', date: '2026-01-05' })
    })
    it('rolls forward once this month\'s occurrence has passed', () => {
      // Feb 2026 first Monday = Feb 2.
      expect(projectNextDue(firstMonday, '2026-01-06')).toEqual({ kind: 'date', date: '2026-02-02' })
    })
    it('projects the LAST Friday of the month', () => {
      const lastFriday = {
        frequency: 'monthly_weekday', start_date: '2026-01-01', end_date: null,
        monthly_week: 5, monthly_weekday: 5,
      }
      // Jan 2026 Fridays: 2, 9, 16, 23, 30 → last = Jan 30.
      expect(projectNextDue(lastFriday, '2026-01-01')).toEqual({ kind: 'date', date: '2026-01-30' })
    })
    it('is ended when the next occurrence would exceed end_date', () => {
      const ended = {
        frequency: 'monthly_weekday', start_date: '2026-01-01', end_date: '2026-01-10',
        monthly_week: 1, monthly_weekday: 1,
      }
      // From Jan 6, Jan 5 has passed → next is Feb 2, which is after end_date Jan 10.
      expect(projectNextDue(ended, '2026-01-06')).toEqual({ kind: 'ended' })
    })
    it('is ended when the monthly fields are missing (malformed)', () => {
      const bad = { frequency: 'monthly_weekday', start_date: '2026-01-01', end_date: null }
      expect(projectNextDue(bad, '2026-01-06')).toEqual({ kind: 'ended' })
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

  it('rejects monthly_weekday create without the two required fields', async () => {
    await expect(
      repo.createTemplate(
        { agentid: 3, vendorId: 1, type: 'lease', amount: -10, frequency: 'monthly_weekday', startDate: '2026-01-04' },
        adminCtx
      )
    ).rejects.toThrow('Invalid monthly_weekday')
  })

  it('rejects an out-of-range monthly_week', async () => {
    await expect(
      repo.createTemplate(
        { agentid: 3, vendorId: 1, type: 'lease', amount: -10, frequency: 'monthly_weekday', monthlyWeek: 6, monthlyWeekday: 1, startDate: '2026-01-04' },
        adminCtx
      )
    ).rejects.toThrow('Invalid monthly_weekday')
  })

  it('rejects monthly_week/monthly_weekday on a non-monthly_weekday frequency', async () => {
    await expect(
      repo.createTemplate(
        { agentid: 3, vendorId: 1, type: 'gas', amount: -10, frequency: 'weekly', monthlyWeek: 1, monthlyWeekday: 1, startDate: '2026-01-04' },
        adminCtx
      )
    ).rejects.toThrow('Invalid monthly_weekday')
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
