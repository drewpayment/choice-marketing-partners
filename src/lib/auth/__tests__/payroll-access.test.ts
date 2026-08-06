import type { UserContext } from '@/lib/auth/types'

type MockChain = Record<string, jest.Mock>

// eslint-disable-next-line no-var
var mockChain: MockChain

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
  }
  const fn = Object.assign(jest.fn().mockReturnValue('date_expr'), {
    count: jest.fn().mockReturnValue({ as: jest.fn().mockReturnValue('count_expr') }),
  })
  return { db: Object.assign(mockChain, { fn }) }
})

// getAccessibleIssueDates delegates to the repository; stub it out so this file
// only exercises the access-filter logic in payroll-access itself.
jest.mock('@/lib/repositories/PayrollRepository', () => ({
  PayrollRepository: jest.fn().mockImplementation(() => ({
    getAvailableIssueDates: jest.fn().mockResolvedValue([]),
  })),
}))

import {
  getAccessibleAgents,
  getAccessibleVendors,
  getPayrollAccessSummary,
  validatePayrollAccess,
} from '@/lib/auth/payroll-access'

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

// paystubs.agent_id stores employees.id. `sales_id1` is an unrelated sales code
// (usually 'CMPxxxx', sometimes a number that collides with another employee's
// primary key), so keying paystub lookups off parseInt(sales_id1) either drops
// the agent or reads a stranger's data. These fixtures encode both failure
// modes: reverting to parseInt(sales_id1) yields [184] instead of [36, 18].
const AGENT_FIXTURES = [
  { id: 36, name: 'Ralph Barker', sales_id1: '184', email: '', is_active: 1 },
  { id: 18, name: 'James Nelson', sales_id1: 'CMP9410', email: '', is_active: 1 },
]

describe('getAccessibleVendors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
  })

  it('keys the paystub join off employees.id, not sales_id1', async () => {
    mockChain.execute.mockResolvedValueOnce(AGENT_FIXTURES)

    await getAccessibleVendors(managerCtx)

    const agentFilters = mockChain.where.mock.calls.filter(
      (call: unknown[]) => call[0] === 'paystubs.agent_id'
    )
    expect(agentFilters).toEqual([['paystubs.agent_id', 'in', [36, 18]]])
  })

  it('skips the vendor query entirely when no agents are accessible', async () => {
    const result = await getAccessibleVendors(orphanManagerCtx)

    expect(result).toEqual([])
    expect(mockChain.selectFrom).not.toHaveBeenCalledWith('vendors')
  })
})

describe('getPayrollAccessSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
    mockChain.executeTakeFirst.mockResolvedValue(null)
  })

  it('counts paystubs by employees.id, not sales_id1', async () => {
    mockChain.execute
      .mockResolvedValueOnce(AGENT_FIXTURES) // getAccessibleAgents (direct)
      .mockResolvedValueOnce(AGENT_FIXTURES) // getAccessibleAgents inside getAccessibleVendors
      .mockResolvedValueOnce([{ id: 1, name: 'Palmco', is_active: 1 }]) // vendors
    mockChain.executeTakeFirst.mockResolvedValueOnce({ count: 1170 })

    const summary = await getPayrollAccessSummary(managerCtx)

    const countFilters = mockChain.where.mock.calls.filter(
      (call: unknown[]) => call[0] === 'agent_id'
    )
    expect(countFilters).toEqual([['agent_id', 'in', [36, 18]]])
    expect(summary).toEqual({
      accessibleAgents: 2,
      accessibleVendors: 1,
      accessibleIssueDates: 0,
      totalPaystubs: 1170,
    })
  })

  it('reports zero paystubs without querying when no agents are accessible', async () => {
    const summary = await getPayrollAccessSummary(orphanManagerCtx)

    expect(summary.totalPaystubs).toBe(0)
    expect(mockChain.selectFrom).not.toHaveBeenCalledWith('paystubs')
  })
})

describe('validatePayrollAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.executeTakeFirst.mockResolvedValue(null)
  })

  it('checks paystub existence by employees.id, not sales_id1', async () => {
    mockChain.executeTakeFirst.mockResolvedValueOnce({ id: 99 })

    const allowed = await validatePayrollAccess(SELF, 1, '2026-04-01', managerCtx)

    expect(allowed).toBe(true)
    expect(mockChain.where).toHaveBeenCalledWith('agent_id', '=', SELF)
    expect(mockChain.selectFrom).not.toHaveBeenCalledWith('employees')
  })

  it('denies before querying when the employee is outside the caller scope', async () => {
    const allowed = await validatePayrollAccess(9999, 1, '2026-04-01', managerCtx)

    expect(allowed).toBe(false)
    expect(mockChain.selectFrom).not.toHaveBeenCalled()
  })
})
