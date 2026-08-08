import type { UserContext } from '@/lib/auth/types'

type MockChain = Record<string, jest.Mock>

// eslint-disable-next-line no-var
var mockChain: MockChain

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
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

import { PayrollRepository, parsePayrollScope, type PayrollScope } from '../PayrollRepository'

// Ralph Barker in the production snapshot: employees.id 36, is_mgr = 1, one
// subordinate (1184). `manager_employees` never contains self.
const SELF = 36
const SUBORDINATE = 1184
const SECOND_SUBORDINATE = 2001

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const adminWithReportsCtx: UserContext = {
  employeeId: 1,
  isAdmin: true,
  isManager: true,
  managedEmployeeIds: [SUBORDINATE],
}
const adminNoEmployeeCtx: UserContext = { isAdmin: true, isManager: false }
const managerCtx: UserContext = {
  employeeId: SELF,
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [SUBORDINATE, SECOND_SUBORDINATE],
}
const managerNoReportsCtx: UserContext = {
  employeeId: SELF,
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [],
}
const managerNoEmployeeIdCtx: UserContext = {
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [SUBORDINATE],
}
const employeeCtx: UserContext = { employeeId: 7, isAdmin: false, isManager: false }

/**
 * A NON-manager carrying a populated `managedEmployeeIds`. This is the case
 * where the intersection is load-bearing: the ids exist on the context but the
 * role filter does not grant them, so `scope: 'team'` must resolve to nothing.
 * If `resolveEmployeeScope` ever substituted the scope set for the role-resolved
 * set instead of intersecting, this context would leak employees 99 and 100.
 */
const employeeWithStaleReportsCtx: UserContext = {
  employeeId: 7,
  isAdmin: false,
  isManager: false,
  managedEmployeeIds: [99, 100],
}

/** Every role-filter predicate applied against the employees table. */
function employeeIdFilters() {
  return mockChain.where.mock.calls.filter((call: unknown[]) => call[0] === 'employees.id')
}

/** The unreleased-paystub cutoff predicates: `DATE(paystubs.issue_date) <= cutoff`. */
function issueDateCutoffFilters() {
  return mockChain.where.mock.calls.filter(
    (call: unknown[]) => call[0] === 'DATE_EXPR' && call[1] === '<='
  )
}

/** Normalise an employees.id predicate ('=' or 'in') to the id set it permits. */
function idsFromFilter(call: unknown[]): number[] {
  return call[1] === 'in' ? (call[2] as number[]) : [call[2] as number]
}

interface SummaryRun {
  idFilters: unknown[][]
  cutoffFilters: unknown[][]
  /** Permitted id set, or `null` when no employees.id predicate was emitted. */
  ids: number[] | null
  /** True when the repository returned early instead of running the data query. */
  shortCircuited: boolean
  total: number
}

async function runSummary(userContext: UserContext, scope?: PayrollScope): Promise<SummaryRun> {
  jest.clearAllMocks()
  mockChain.execute.mockResolvedValue([])
  mockChain.executeTakeFirst.mockResolvedValue(null)

  const repo = new PayrollRepository()
  const result = await repo.getPayrollSummary(scope === undefined ? {} : { scope }, userContext)

  const idFilters = employeeIdFilters()

  return {
    idFilters,
    cutoffFilters: issueDateCutoffFilters(),
    ids: idFilters.length === 0 ? null : idsFromFilter(idFilters[0]),
    // The data query only reaches `.limit()` when we did not return early.
    shortCircuited: mockChain.limit.mock.calls.length === 0,
    total: result.pagination.total,
  }
}

describe('getPayrollSummary scope narrowing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
    mockChain.executeTakeFirst.mockResolvedValue(null)
  })

  describe("scope: 'mine'", () => {
    it('narrows a manager to exactly [self] on BOTH the data and the count query', async () => {
      const run = await runSummary(managerCtx, 'mine')

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(idsFromFilter(call)).toEqual([SELF])
      }
      expect(run.shortCircuited).toBe(false)
    })

    it('keeps the release-date cutoff on both queries when narrowing a manager', async () => {
      const run = await runSummary(managerCtx, 'mine')

      expect(run.cutoffFilters).toHaveLength(2)
      for (const call of run.cutoffFilters) {
        expect(call[2]).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
      }
      expect(mockChain.fn).toHaveBeenCalledWith('DATE', ['paystubs.issue_date'])
    })

    it('returns an empty result — never an unfiltered query — when there is no employeeId', async () => {
      const run = await runSummary(managerNoEmployeeIdCtx, 'mine')

      expect(run.total).toBe(0)
      expect(run.shortCircuited).toBe(true)
      expect(run.idFilters).toHaveLength(0)
    })
  })

  describe("scope: 'team'", () => {
    it('narrows a manager to exactly their reports, with self excluded', async () => {
      const run = await runSummary(managerCtx, 'team')

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(idsFromFilter(call)).toEqual([SUBORDINATE, SECOND_SUBORDINATE])
        expect(idsFromFilter(call)).not.toContain(SELF)
      }
    })

    it('keeps the release-date cutoff on both queries when narrowing a manager', async () => {
      const run = await runSummary(managerCtx, 'team')
      expect(run.cutoffFilters).toHaveLength(2)
    })

    it('returns an empty result with no IN () list when the manager has zero reports', async () => {
      const run = await runSummary(managerNoReportsCtx, 'team')

      expect(run.total).toBe(0)
      expect(run.shortCircuited).toBe(true)
      expect(run.idFilters).toHaveLength(0)

      // An empty IN list is invalid MySQL — it must never be emitted.
      const emptyInLists = mockChain.where.mock.calls.filter(
        (call: unknown[]) => call[1] === 'in' && Array.isArray(call[2]) && call[2].length === 0
      )
      expect(emptyInLists).toHaveLength(0)
    })
  })

  describe('scope undefined is a byte-identical regression guard', () => {
    it('still scopes a manager to self AND subordinates', async () => {
      const run = await runSummary(managerCtx)

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(call).toEqual(['employees.id', 'in', [SELF, SUBORDINATE, SECOND_SUBORDINATE]])
      }
      expect(run.cutoffFilters).toHaveLength(2)
    })

    it('still scopes a plain employee to an equality match on self', async () => {
      const run = await runSummary(employeeCtx)

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(call).toEqual(['employees.id', '=', 7])
      }
    })

    it('still leaves admins completely unfiltered with no cutoff', async () => {
      const run = await runSummary(adminCtx)

      expect(run.idFilters).toHaveLength(0)
      expect(run.cutoffFilters).toHaveLength(0)
      expect(run.shortCircuited).toBe(false)
    })
  })

  describe('SECURITY: scope can only narrow, never widen', () => {
    it('gives a plain employee passing scope: team an empty result, not their peers rows', async () => {
      const run = await runSummary(employeeCtx, 'team')

      expect(run.total).toBe(0)
      expect(run.shortCircuited).toBe(true)
      expect(run.idFilters).toHaveLength(0)
    })

    it('leaves a plain employee passing scope: mine pinned to their own id', async () => {
      const run = await runSummary(employeeCtx, 'mine')

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(idsFromFilter(call)).toEqual([7])
      }
    })

    // MUTATION GUARD: these two fail if resolveEmployeeScope is changed from
    // `scopeIds ∩ base` to plain substitution (`scopeIds`) — the textbook
    // privilege-escalation regression. The role filter does not grant 99/100,
    // so no scope value may surface them.
    it('gives a non-manager carrying managedEmployeeIds an empty result for scope: team', async () => {
      const run = await runSummary(employeeWithStaleReportsCtx, 'team')

      expect(run.total).toBe(0)
      expect(run.shortCircuited).toBe(true)
      expect(run.idFilters).toHaveLength(0)

      // Belt and braces: 99/100 must appear in no predicate whatsoever.
      const leaked = mockChain.where.mock.calls.filter((call: unknown[]) =>
        JSON.stringify(call).includes('99') || JSON.stringify(call).includes('100')
      )
      expect(leaked).toHaveLength(0)
    })

    it('keeps a non-manager carrying managedEmployeeIds pinned to self for scope: mine', async () => {
      const run = await runSummary(employeeWithStaleReportsCtx, 'mine')

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(idsFromFilter(call)).toEqual([7])
        expect(idsFromFilter(call)).not.toContain(99)
        expect(idsFromFilter(call)).not.toContain(100)
      }
    })

    it('narrows an admin passing scope: mine to their own employee id', async () => {
      const run = await runSummary(adminCtx, 'mine')

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(idsFromFilter(call)).toEqual([1])
      }
    })

    it('narrows an admin passing scope: team to their managed ids only', async () => {
      const run = await runSummary(adminWithReportsCtx, 'team')

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(idsFromFilter(call)).toEqual([SUBORDINATE])
      }
    })

    it('gives an admin with no employeeId and scope: mine an empty result, not an unfiltered query', async () => {
      const run = await runSummary(adminNoEmployeeCtx, 'mine')

      expect(run.total).toBe(0)
      expect(run.shortCircuited).toBe(true)
      expect(run.idFilters).toHaveLength(0)
    })

    it('gives an admin with no reports and scope: team an empty result, not an unfiltered query', async () => {
      const run = await runSummary(adminCtx, 'team')

      expect(run.total).toBe(0)
      expect(run.shortCircuited).toBe(true)
      expect(run.idFilters).toHaveLength(0)
    })

    it('never permits an id the unscoped query would not have permitted, for any role/scope pair', async () => {
      const contexts: Array<[string, UserContext]> = [
        ['admin', adminCtx],
        ['admin with reports', adminWithReportsCtx],
        ['manager', managerCtx],
        ['manager without reports', managerNoReportsCtx],
        ['employee', employeeCtx],
        ['non-manager with stale managedEmployeeIds', employeeWithStaleReportsCtx],
      ]

      for (const [label, ctx] of contexts) {
        const baseline = await runSummary(ctx)

        for (const scope of ['mine', 'team'] as const) {
          const scoped = await runSummary(ctx, scope)

          if (scoped.shortCircuited) {
            // Empty result is always a valid narrowing.
            expect(scoped.ids).toBeNull()
            continue
          }

          expect(scoped.ids).not.toBeNull()

          if (baseline.ids === null) {
            // Admin baseline is unbounded, so any finite set is a narrowing —
            // but it must still be finite, i.e. an actual predicate was added.
            expect(baseline.shortCircuited).toBe(false)
            continue
          }

          for (const id of scoped.ids as number[]) {
            expect(baseline.ids).toContain(id)
          }
          expect((scoped.ids as number[]).length).toBeLessThanOrEqual(baseline.ids.length)
          // Sanity: the label is only here to make failures legible.
          expect(typeof label).toBe('string')
        }
      }
    })

    it('treats an out-of-union scope value as no narrowing rather than widening', async () => {
      const run = await runSummary(employeeCtx, 'everyone' as unknown as PayrollScope)

      expect(run.idFilters).toHaveLength(2)
      for (const call of run.idFilters) {
        expect(call).toEqual(['employees.id', '=', 7])
      }
    })
  })
})

describe('parsePayrollScope (page-level searchParams validation)', () => {
  it('accepts the two literal union members', () => {
    expect(parsePayrollScope('mine')).toBe('mine')
    expect(parsePayrollScope('team')).toBe('team')
  })

  it('treats a garbage value as undefined', () => {
    expect(parsePayrollScope('everyone')).toBeUndefined()
    expect(parsePayrollScope('all')).toBeUndefined()
    expect(parsePayrollScope("team' OR 1=1--")).toBeUndefined()
    expect(parsePayrollScope('')).toBeUndefined()
  })

  it('is case sensitive', () => {
    expect(parsePayrollScope('Mine')).toBeUndefined()
    expect(parsePayrollScope('TEAM')).toBeUndefined()
  })

  it('treats missing and non-string values as undefined', () => {
    expect(parsePayrollScope(undefined)).toBeUndefined()
    expect(parsePayrollScope(null)).toBeUndefined()
    expect(parsePayrollScope(['team'])).toBeUndefined()
    expect(parsePayrollScope(1)).toBeUndefined()
  })

  it('feeds a validated garbage value into the repository as unscoped access', async () => {
    const run = await runSummary(managerCtx, parsePayrollScope('nonsense'))

    expect(run.idFilters).toHaveLength(2)
    for (const call of run.idFilters) {
      expect(call).toEqual(['employees.id', 'in', [SELF, SUBORDINATE, SECOND_SUBORDINATE]])
    }
  })

  it('pins NULL employee names first, preserving the MySQL sort order', async () => {
    // `employees` is LEFT JOINed, so employeeName is NULL for an orphaned paystub.
    // MySQL puts NULLs first on ASC; Postgres puts them last. Without the explicit
    // modifier those rows would silently move to a different page.
    await runSummary(adminCtx)

    const nameOrder = mockChain.orderBy.mock.calls.find(
      (call: unknown[]) => call[0] === 'employees.name'
    )
    expect(nameOrder).toBeDefined()
    expect(typeof nameOrder![1]).toBe('function')

    const builder = { asc: jest.fn().mockReturnThis(), nullsFirst: jest.fn().mockReturnThis() }
    ;(nameOrder![1] as (b: typeof builder) => unknown)(builder)
    expect(builder.asc).toHaveBeenCalled()
    expect(builder.nullsFirst).toHaveBeenCalled()
  })
})
