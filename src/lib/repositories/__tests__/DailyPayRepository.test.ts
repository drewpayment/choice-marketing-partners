import type { UserContext } from '@/lib/auth/types'

// `var` (not let/const) so the jest.mock factory hoist doesn't TDZ-trip.
// eslint-disable-next-line no-var
var mockChain: any

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    insertInto: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    transaction: jest.fn(() => ({
      execute: jest.fn(async (cb: (trx: any) => Promise<unknown>) => cb(mockChain)),
    })),
    fn: Object.assign(jest.fn().mockReturnValue('DATE_EXPR'), {
      count: jest.fn().mockReturnValue({ as: jest.fn() }),
      countAll: jest.fn().mockReturnValue({ as: jest.fn() }),
      sum: jest.fn().mockReturnValue({ as: jest.fn() }),
      max: jest.fn().mockReturnValue({ as: jest.fn() }),
    }),
  }
  return { db: mockChain }
})

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import {
  DailyPayRepository,
  dateOnlyToDate,
  dateOnlyFromDb,
  wkendingFor,
  computeJustCrossedCutoff,
  workDateInTimezone,
} from '../DailyPayRepository'

const adminCtx: UserContext = {
  employeeId: 1230,
  isAdmin: true,
  isManager: false,
}

const employeeCtx: UserContext = {
  employeeId: 1232,
  isAdmin: false,
  isManager: false,
}

// ─────────────────────────────────────────────────────────────────────────
// Pure-function tests — these would have caught the timezone-shift bug that
// stored work_date='2026-04-01' as '2026-03-31' in any UTC-negative timezone.
// They run without any DB mock and are the highest-signal tests in this suite.
// ─────────────────────────────────────────────────────────────────────────

describe('DailyPayRepository — date helpers', () => {
  describe('dateOnlyToDate', () => {
    it('parses YYYY-MM-DD as local-midnight (matches mysql2 binding for DATE columns)', () => {
      const d = dateOnlyToDate('2026-04-01')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(3)
      expect(d.getDate()).toBe(1)
      expect(d.getHours()).toBe(0)
    })

    it('does NOT use UTC midnight — that was the original bug', () => {
      // Regression guard. `new Date('YYYY-MM-DD')` is UTC midnight, which mysql2
      // formats as the previous day in any UTC-offset-negative timezone (US, etc.)
      // dateOnlyToDate uses `new Date(y, m-1, d)` (local midnight) instead.
      const ourDate = dateOnlyToDate('2026-04-01')
      // The fix: extracting local Y/M/D returns "2026-04-01" regardless of TZ.
      expect(dateOnlyFromDb(ourDate)).toBe('2026-04-01')

      // And on a typical US-EDT/CDT/PST machine, our date diverges from the
      // bug-prone UTC-midnight approach by exactly the local UTC offset.
      const utcMidnight = new Date('2026-04-01')
      const offsetMin = ourDate.getTimezoneOffset()
      if (offsetMin > 0) {
        // West of UTC: the two values differ; the bug-prone path is wrong.
        expect(utcMidnight.getTime()).not.toBe(ourDate.getTime())
      }
    })
  })

  describe('dateOnlyFromDb', () => {
    it('round-trips through dateOnlyToDate', () => {
      for (const s of ['2026-01-01', '2026-04-01', '2026-12-31', '2027-02-28']) {
        expect(dateOnlyFromDb(dateOnlyToDate(s))).toBe(s)
      }
    })

    it('passes through ISO date-only strings unchanged', () => {
      expect(dateOnlyFromDb('2026-04-01')).toBe('2026-04-01')
    })

    it('strips a time portion if present', () => {
      expect(dateOnlyFromDb('2026-04-01T00:00:00.000Z')).toBe('2026-04-01')
    })

    it('returns empty string for null/undefined', () => {
      expect(dateOnlyFromDb(null)).toBe('')
      expect(dateOnlyFromDb(undefined)).toBe('')
    })
  })

  describe('wkendingFor (Saturday convention)', () => {
    // Sat 2026-01-17 is the canonical week-end the codebase aligns to —
    // verified by querying DAYOFWEEK distribution across paystubs/invoices/overrides.
    it('returns the same date when input is already a Saturday', () => {
      expect(wkendingFor('2026-01-17')).toBe('2026-01-17')
    })

    it('returns the upcoming Saturday for any other day in the week', () => {
      expect(wkendingFor('2026-01-11')).toBe('2026-01-17') // Sun
      expect(wkendingFor('2026-01-12')).toBe('2026-01-17') // Mon
      expect(wkendingFor('2026-01-13')).toBe('2026-01-17') // Tue
      expect(wkendingFor('2026-01-14')).toBe('2026-01-17') // Wed
      expect(wkendingFor('2026-01-15')).toBe('2026-01-17') // Thu
      expect(wkendingFor('2026-01-16')).toBe('2026-01-17') // Fri
    })

    it('handles year boundary correctly', () => {
      // Dec 28 2026 is Mon; upcoming Saturday is Jan 2 2027.
      expect(wkendingFor('2026-12-28')).toBe('2027-01-02')
    })

    it('handles US DST spring-forward boundary (March 8 2026)', () => {
      // March 8 2026 is Sun (clocks spring forward); March 14 2026 is Sat.
      expect(wkendingFor('2026-03-08')).toBe('2026-03-14')
    })

    it('handles US DST fall-back boundary (November 1 2026)', () => {
      // November 1 2026 is Sun (clocks fall back); November 7 2026 is Sat.
      expect(wkendingFor('2026-11-01')).toBe('2026-11-07')
    })

    it('handles leap day (Feb 29 2028)', () => {
      // Feb 29 2028 is Tue; March 4 2028 is Sat.
      expect(wkendingFor('2028-02-29')).toBe('2028-03-04')
    })
  })

  describe('workDateInTimezone', () => {
    it('returns the local-date for a UTC instant in the canonical timezone', () => {
      // 2026-04-01T03:00:00Z — that's 11 PM EDT on March 31, 2026.
      const instant = new Date('2026-04-01T03:00:00.000Z')
      expect(workDateInTimezone(instant, 'America/Detroit')).toBe('2026-03-31')
    })

    it('returns the same date at noon UTC regardless of canonical timezone', () => {
      const instant = new Date('2026-04-01T12:00:00.000Z')
      expect(workDateInTimezone(instant, 'UTC')).toBe('2026-04-01')
      expect(workDateInTimezone(instant, 'America/Detroit')).toBe('2026-04-01')
      expect(workDateInTimezone(instant, 'America/Los_Angeles')).toBe('2026-04-01')
    })
  })

  describe('computeJustCrossedCutoff', () => {
    // Configured cutoff: Friday 23:59:00 America/Detroit (the default).
    // Pay weeks end Saturday → cutoff-to-wkending offset is +1 day.
    const cfg = { dow: 5, time: '23:59:00', tz: 'America/Detroit' }

    it('returns null on cutoff day BEFORE cutoff time (active-editing window)', () => {
      // Friday 2026-05-08 at 12:00 EDT — well before 23:59.
      const noon = new Date('2026-05-08T16:00:00.000Z')
      expect(computeJustCrossedCutoff(noon, cfg.dow, cfg.time, cfg.tz)).toBeNull()
    })

    it('returns the just-closed wkending (Sat 5/9) right after Friday 23:59 cutoff', () => {
      // Saturday 2026-05-09 at 00:30 EDT.
      const earlySat = new Date('2026-05-09T04:30:00.000Z')
      const res = computeJustCrossedCutoff(earlySat, cfg.dow, cfg.time, cfg.tz)
      expect(res).toEqual({ cutoffWorkDate: '2026-05-09' })
    })

    // REGRESSION GUARD — original implementation skipped Mon-Thu and would have left
    // stragglers from the prior week unprocessed if the cron only fired on weekdays.
    it('returns last week\'s wkending on Tuesday (cron must be idempotent across full week)', () => {
      // Tuesday 2026-05-12 at 10:00 EDT — last cutoff was Fri 5/8 23:59, wkending Sat 5/9.
      const tue = new Date('2026-05-12T14:00:00.000Z')
      const res = computeJustCrossedCutoff(tue, cfg.dow, cfg.time, cfg.tz)
      expect(res).toEqual({ cutoffWorkDate: '2026-05-09' })
    })

    it('returns last week\'s wkending on the cutoff day BEFORE cutoff time, via the null branch (so cron skips)', () => {
      // Friday morning is the active-editing window — null short-circuits the cron.
      const friMorning = new Date('2026-05-15T13:00:00.000Z')
      expect(computeJustCrossedCutoff(friMorning, cfg.dow, cfg.time, cfg.tz)).toBeNull()
    })

    it('handles a Saturday cutoff (cutoff_day == wkending_day)', () => {
      // Sat cutoff at 12:00; offset between cutoff and wkending is 0 — they\'re the same day.
      const sunday = new Date('2026-05-10T18:00:00.000Z') // Sun 2 PM EDT
      const res = computeJustCrossedCutoff(sunday, 6, '12:00:00', 'America/Detroit')
      // The most recent cutoff was Sat 2026-05-09 at noon, with wkending = same Saturday.
      expect(res).toEqual({ cutoffWorkDate: '2026-05-09' })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// RBAC — admin-required throws. Cheap to verify with mocked DB.
// (State-machine tests live in tests/e2e/daily-pay.spec.ts — they hit a
// real DB so they catch mysql2 binding bugs the unit tests can't.)
// ─────────────────────────────────────────────────────────────────────────

describe('DailyPayRepository — RBAC', () => {
  let repo: DailyPayRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new DailyPayRepository()
  })

  it('approvePunch throws for non-admin', async () => {
    await expect(repo.approvePunch(1, {}, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('declinePunch throws for non-admin', async () => {
    await expect(repo.declinePunch(1, {}, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('reversePunch throws for non-admin', async () => {
    await expect(repo.reversePunch(1, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('upsertEnrollment throws for non-admin', async () => {
    await expect(
      repo.upsertEnrollment({ employeeId: 1, vendorId: 1, dailyRate: 100 }, employeeCtx),
    ).rejects.toThrow('Admin access required')
  })

  it('deactivateEnrollment throws for non-admin', async () => {
    await expect(repo.deactivateEnrollment(1, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('listEnrollments throws for non-admin', async () => {
    await expect(repo.listEnrollments({}, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('updateSettings throws for non-admin', async () => {
    mockChain.executeTakeFirst.mockResolvedValueOnce({
      id: 1,
      is_auto_cutoff_enabled: 1,
      cutoff_day_of_week: 5,
      cutoff_time_local: '23:59:00',
      cutoff_timezone: 'America/Detroit',
      updated_by: null,
      updated_at: new Date(),
    })
    await expect(
      repo.updateSettings({ isAutoCutoffEnabled: false }, employeeCtx),
    ).rejects.toThrow('Admin access required')
  })

  it('getPunches throws for non-admin', async () => {
    await expect(repo.getPunches({}, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('getPunchById throws for non-admin', async () => {
    await expect(repo.getPunchById(1, employeeCtx)).rejects.toThrow('Admin access required')
  })

  it('createPunch throws when authentication is missing', async () => {
    await expect(
      repo.createPunch(
        { vendorId: 1, latitude: 0, longitude: 0, accuracyMeters: 0 },
        { isAdmin: false, isManager: false },
      ),
    ).rejects.toThrow('Authentication required')
  })

  it('approvePunch checks admin BEFORE running any query', async () => {
    await repo.approvePunch(1, {}, employeeCtx).catch(() => {})
    expect(mockChain.transaction).not.toHaveBeenCalled()
    expect(mockChain.selectFrom).not.toHaveBeenCalled()
  })
})
