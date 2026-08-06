import type { UserContext } from '@/lib/auth/types'

type MockChain = Record<string, jest.Mock>

// eslint-disable-next-line no-var
var mockChain: MockChain

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
  }
  return { db: mockChain }
})

// getAccessibleIssueDates delegates to the repository; stub it out so this file
// only exercises the access-filter logic in payroll-access itself.
jest.mock('@/lib/repositories/PayrollRepository', () => ({
  PayrollRepository: jest.fn().mockImplementation(() => ({
    getAvailableIssueDates: jest.fn().mockResolvedValue([]),
  })),
}))

import { getAccessibleAgents } from '@/lib/auth/payroll-access'

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

/** Role-filter predicates on the employees primary key (not sales_id1/is_active). */
function idFilters() {
  return mockChain.where.mock.calls.filter((call: unknown[]) => call[0] === 'id')
}

describe('getAccessibleAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
  })

  it('includes the manager themselves alongside their subordinates', async () => {
    await getAccessibleAgents(managerCtx)

    expect(idFilters()).toEqual([['id', 'in', [SELF, SUBORDINATE]]])
  })

  it('scopes a manager with zero subordinates to self only', async () => {
    await getAccessibleAgents(managerNoReportsCtx)

    expect(idFilters()).toEqual([['id', 'in', [SELF]]])
  })

  it('dedupes when managedEmployeeIds already contains the manager', async () => {
    await getAccessibleAgents({ ...managerCtx, managedEmployeeIds: [SELF, SUBORDINATE] })

    expect(idFilters()).toEqual([['id', 'in', [SELF, SUBORDINATE]]])
  })

  it('keeps the sales_id1 and is_active guards in place for managers', async () => {
    await getAccessibleAgents(managerCtx)

    expect(mockChain.where).toHaveBeenCalledWith('sales_id1', '!=', '')
    expect(mockChain.where).toHaveBeenCalledWith('is_active', '=', 1)
  })

  it('applies no employee filter for admins', async () => {
    await getAccessibleAgents(adminCtx)

    expect(idFilters()).toHaveLength(0)
  })

  it('still scopes a plain employee to an equality match on self', async () => {
    await getAccessibleAgents(employeeCtx)

    expect(idFilters()).toEqual([['id', '=', 7]])
  })

  it('returns an empty list for a manager with neither employeeId nor subordinates', async () => {
    const result = await getAccessibleAgents(orphanManagerCtx)

    expect(result).toEqual([])
    expect(idFilters()).toHaveLength(0)
  })
})
