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

import { PayrollRepository } from '../PayrollRepository'

// Ralph Barker in the production snapshot: employees.id 36, is_mgr = 1, with a
// single subordinate (1184). manager_employees never contains self, so before
// the fix his own 844 paystubs were filtered out of every manager-branch list.
const SELF = 36
const SUBORDINATE = 1184

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = {
  employeeId: SELF,
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [SUBORDINATE],
}
const managerNoReportsCtx: UserContext = {
  employeeId: SELF,
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [],
}
const employeeCtx: UserContext = { employeeId: 7, isAdmin: false, isManager: false }
const orphanManagerCtx: UserContext = { isAdmin: false, isManager: true }

/** Every role-filter predicate applied against the employees table. */
function employeeIdFilters() {
  return mockChain.where.mock.calls.filter((call: unknown[]) => call[0] === 'employees.id')
}

/**
 * Every unreleased-paystub cutoff predicate: `DATE(paystubs.issue_date) <= cutoff`.
 * The mocked `db.fn(...)` collapses the DATE expression to the 'DATE_EXPR' sentinel.
 * No date filters are passed in these tests, so the only '<=' predicates on
 * 'DATE_EXPR' are the release-date cutoffs.
 */
function issueDateCutoffFilters() {
  return mockChain.where.mock.calls.filter(
    (call: unknown[]) => call[0] === 'DATE_EXPR' && call[1] === '<='
  )
}

describe('PayrollRepository role filtering includes the manager themselves', () => {
  let repo: PayrollRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
    mockChain.executeTakeFirst.mockResolvedValue(null)
    repo = new PayrollRepository()
  })

  describe('getPayrollSummary', () => {
    it('scopes a manager to self AND subordinates on both the data and count query', async () => {
      await repo.getPayrollSummary({}, managerCtx)

      const filters = employeeIdFilters()
      // One for the paginated data query, one for the count query
      expect(filters).toHaveLength(2)
      for (const call of filters) {
        expect(call).toEqual(['employees.id', 'in', [SELF, SUBORDINATE]])
      }
    })

    it('scopes a manager with zero subordinates to self only', async () => {
      await repo.getPayrollSummary({}, managerNoReportsCtx)

      const filters = employeeIdFilters()
      expect(filters).toHaveLength(2)
      for (const call of filters) {
        expect(call).toEqual(['employees.id', 'in', [SELF]])
      }
    })

    it('dedupes when managedEmployeeIds already contains the manager', async () => {
      await repo.getPayrollSummary(
        {},
        { ...managerCtx, managedEmployeeIds: [SELF, SUBORDINATE] }
      )

      const filters = employeeIdFilters()
      expect(filters).toHaveLength(2)
      for (const call of filters) {
        expect(call).toEqual(['employees.id', 'in', [SELF, SUBORDINATE]])
      }
    })

    it('applies no employee filter for admins', async () => {
      await repo.getPayrollSummary({}, adminCtx)
      expect(employeeIdFilters()).toHaveLength(0)
    })

    it('still scopes a plain employee to an equality match on self', async () => {
      await repo.getPayrollSummary({}, employeeCtx)

      const filters = employeeIdFilters()
      expect(filters).toHaveLength(2)
      for (const call of filters) {
        expect(call).toEqual(['employees.id', '=', 7])
      }
    })

    it('returns no data for a manager with neither employeeId nor subordinates', async () => {
      const result = await repo.getPayrollSummary({}, orphanManagerCtx)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(employeeIdFilters()).toHaveLength(0)
    })
  })

  describe('getAvailableIssueDates', () => {
    it('scopes a manager to self AND subordinates', async () => {
      await repo.getAvailableIssueDates(managerCtx)

      expect(employeeIdFilters()).toEqual([
        ['employees.id', 'in', [SELF, SUBORDINATE]],
      ])
    })

    it('scopes a manager with zero subordinates to self only', async () => {
      await repo.getAvailableIssueDates(managerNoReportsCtx)

      expect(employeeIdFilters()).toEqual([['employees.id', 'in', [SELF]]])
    })

    it('applies no employee filter for admins', async () => {
      await repo.getAvailableIssueDates(adminCtx)
      expect(employeeIdFilters()).toHaveLength(0)
    })

    it('still scopes a plain employee to an equality match on self', async () => {
      await repo.getAvailableIssueDates(employeeCtx)

      expect(employeeIdFilters()).toEqual([['employees.id', '=', 7]])
    })

    it('returns an empty list for a manager with neither employeeId nor subordinates', async () => {
      const result = await repo.getAvailableIssueDates(orphanManagerCtx)

      expect(result).toEqual([])
      expect(employeeIdFilters()).toHaveLength(0)
    })
  })

  // Widening the manager scope to include self must not weaken the OTHER
  // non-admin guard on the same code path: future-dated paystubs stay hidden
  // until their release time. Both predicates have to survive together.
  describe('release-date cutoff AND-combines with the widened manager scope', () => {
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

    it('getPayrollSummary applies the manager IN-list AND the cutoff on the data query and the count query', async () => {
      await repo.getPayrollSummary({}, managerCtx)

      const idFilters = employeeIdFilters()
      const cutoffFilters = issueDateCutoffFilters()

      // Two of each: one pair for the paginated data query, one for the count query
      expect(idFilters).toHaveLength(2)
      expect(cutoffFilters).toHaveLength(2)

      for (const call of idFilters) {
        expect(call).toEqual(['employees.id', 'in', [SELF, SUBORDINATE]])
      }
      for (const call of cutoffFilters) {
        expect(call[2]).toEqual(expect.stringMatching(ISO_DATE))
      }

      // The cutoff is built from DATE(paystubs.issue_date), not a raw column
      expect(mockChain.fn).toHaveBeenCalledWith('DATE', ['paystubs.issue_date'])
    })

    it('getPayrollSummary keeps the cutoff for a manager with zero subordinates', async () => {
      await repo.getPayrollSummary({}, managerNoReportsCtx)

      expect(employeeIdFilters()).toHaveLength(2)
      expect(issueDateCutoffFilters()).toHaveLength(2)
    })

    it('getAvailableIssueDates applies the manager IN-list AND the cutoff', async () => {
      await repo.getAvailableIssueDates(managerCtx)

      expect(employeeIdFilters()).toEqual([
        ['employees.id', 'in', [SELF, SUBORDINATE]],
      ])

      const cutoffFilters = issueDateCutoffFilters()
      expect(cutoffFilters).toHaveLength(1)
      expect(cutoffFilters[0][2]).toEqual(expect.stringMatching(ISO_DATE))

      expect(mockChain.fn).toHaveBeenCalledWith('DATE', ['paystubs.issue_date'])
    })

    it('getAvailableIssueDates keeps the cutoff for a manager with zero subordinates', async () => {
      await repo.getAvailableIssueDates(managerNoReportsCtx)

      expect(employeeIdFilters()).toEqual([['employees.id', 'in', [SELF]]])
      expect(issueDateCutoffFilters()).toHaveLength(1)
    })

    it('still applies the cutoff to plain employees', async () => {
      await repo.getPayrollSummary({}, employeeCtx)
      expect(issueDateCutoffFilters()).toHaveLength(2)
    })

    // Negative control: proves issueDateCutoffFilters() actually tracks the
    // cutoff predicate rather than matching unconditionally.
    it('never applies the cutoff for admins', async () => {
      await repo.getPayrollSummary({}, adminCtx)
      expect(issueDateCutoffFilters()).toHaveLength(0)

      jest.clearAllMocks()

      await repo.getAvailableIssueDates(adminCtx)
      expect(issueDateCutoffFilters()).toHaveLength(0)
    })
  })
})
