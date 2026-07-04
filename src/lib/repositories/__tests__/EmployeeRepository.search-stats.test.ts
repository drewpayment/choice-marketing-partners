import { EmployeeRepository } from '../EmployeeRepository'
import { db } from '@/lib/database/client'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    fn: {
      count: jest.fn().mockReturnValue({
        as: jest.fn().mockReturnValue('count_expr'),
      }),
    },
  },
}))

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10, 11, 12] }
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }
const nobodyCtx: UserContext = { isAdmin: false, isManager: false }

/**
 * A recording expression-builder stand-in. The real Kysely `eb` produces SQL
 * fragments; here we just capture which columns/operators were referenced and
 * whether exists()/not()/or() were used, so we can assert on the *shape* of the
 * predicates the repository builds. SQL semantics (join fan-out, EXISTS results,
 * distinct counts) are verified separately against a live MySQL via the probe
 * script in .pi/probe/employees.ts — pure mocks cannot express those.
 */
function makeRecordingEb() {
  const calls: Array<{ type: string; args?: unknown[]; col?: unknown }> = []
  const subquery: Record<string, unknown> = {}
  subquery.select = jest.fn(() => subquery)
  subquery.innerJoin = jest.fn(() => subquery)
  subquery.whereRef = jest.fn(() => subquery)
  subquery.limit = jest.fn(() => subquery)
  subquery.as = jest.fn(() => ({}))

  const eb = ((...args: unknown[]) => {
    calls.push({ type: 'cmp', args, col: args[0] })
    return { __cmp: args }
  }) as unknown as {
    (...args: unknown[]): unknown
    or: (a: unknown[]) => unknown
    and: (a: unknown[]) => unknown
    not: (x: unknown) => unknown
    exists: (x: unknown) => unknown
    selectFrom: () => Record<string, unknown>
    calls: typeof calls
  }
  eb.or = (arr: unknown[]) => ({ __or: arr })
  eb.and = (arr: unknown[]) => ({ __and: arr })
  eb.not = (x: unknown) => {
    calls.push({ type: 'not', args: [x] })
    return { __not: x }
  }
  eb.exists = (x: unknown) => {
    calls.push({ type: 'exists', args: [x] })
    return { __exists: x }
  }
  eb.selectFrom = () => subquery
  eb.calls = calls
  return eb
}

function setupGetEmployeesMock() {
  const mockQuery = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue({ count: 0 }),
  }
  ;(db.selectFrom as jest.Mock).mockReturnValue(mockQuery)
  return mockQuery
}

/** Invoke every function-valued `where(...)` argument with a fresh recording eb
 * and aggregate what each predicate referenced. */
function collectWhereEbRecords(mockQuery: { where: jest.Mock }) {
  const records: Array<{ type: string; args?: unknown[]; col?: unknown }> = []
  for (const call of mockQuery.where.mock.calls) {
    if (typeof call[0] === 'function') {
      const eb = makeRecordingEb()
      call[0](eb)
      records.push(...eb.calls)
    }
  }
  return records
}

describe('EmployeeRepository.getEmployees — search & join changes', () => {
  let repo: EmployeeRepository

  beforeEach(() => {
    repo = new EmployeeRepository()
    jest.clearAllMocks()
  })

  it('no longer left-joins employee_user/users (row-multiplying joins removed)', async () => {
    const mockQuery = setupGetEmployeesMock()
    await repo.getEmployees({}, adminCtx)
    expect(mockQuery.leftJoin).not.toHaveBeenCalled()
  })

  it('search matches employees.phone_no in addition to name/email/sales ids', async () => {
    const mockQuery = setupGetEmployeesMock()
    await repo.getEmployees({ search: '4199619029' }, adminCtx)

    const cols = collectWhereEbRecords(mockQuery)
      .filter((r) => r.type === 'cmp')
      .map((r) => r.col)

    expect(cols).toContain('employees.phone_no')
    expect(cols).toContain('employees.name')
    expect(cols).toContain('employees.email')
    expect(cols).toContain('employees.sales_id1')
    expect(cols).toContain('employees.sales_id2')
    expect(cols).toContain('employees.sales_id3')
  })

  it('hasUser: true filters with an EXISTS subquery (no NOT)', async () => {
    const mockQuery = setupGetEmployeesMock()
    await repo.getEmployees({ hasUser: true }, adminCtx)

    const records = collectWhereEbRecords(mockQuery)
    expect(records.some((r) => r.type === 'exists')).toBe(true)
    expect(records.some((r) => r.type === 'not')).toBe(false)
  })

  it('hasUser: false filters with a NOT EXISTS subquery', async () => {
    const mockQuery = setupGetEmployeesMock()
    await repo.getEmployees({ hasUser: false }, adminCtx)

    const records = collectWhereEbRecords(mockQuery)
    expect(records.some((r) => r.type === 'exists')).toBe(true)
    expect(records.some((r) => r.type === 'not')).toBe(true)
  })

  it('maps hasUser/user_id onto the returned EmployeeSummary shape', async () => {
    const mockQuery = setupGetEmployeesMock()
    mockQuery.execute.mockResolvedValueOnce([
      {
        id: 70, name: '41 Energy', email: 'e@e.com', is_active: 1, is_admin: 0,
        is_mgr: 0, sales_id1: '', sales_id2: '', sales_id3: '', phone_no: '22343232',
        created_at: new Date(), deleted_at: null, hasUser: 1, user_id: 70,
      },
      {
        id: 1014, name: 'Aaron Bond', email: 'a@a.com', is_active: 1, is_admin: 0,
        is_mgr: 0, sales_id1: '', sales_id2: '', sales_id3: '', phone_no: '4199619029',
        created_at: new Date(), deleted_at: null, hasUser: 0, user_id: null,
      },
    ])
    mockQuery.executeTakeFirst.mockResolvedValueOnce({ count: 2 })

    const result = await repo.getEmployees({}, adminCtx)

    expect(result.total).toBe(2)
    expect(result.employees[0]).toMatchObject({ id: 70, hasUser: true, user_id: 70 })
    expect(result.employees[1]).toMatchObject({ id: 1014, hasUser: false, user_id: null })
  })
})

describe('EmployeeRepository.getEmployeeStats', () => {
  let repo: EmployeeRepository

  function setupStatsMock(row: Record<string, unknown> | undefined) {
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue(row),
    }
    ;(db.selectFrom as jest.Mock).mockReturnValue(mockQuery)
    return mockQuery
  }

  beforeEach(() => {
    repo = new EmployeeRepository()
    jest.clearAllMocks()
  })

  it('returns the four coerced numeric stats from the aggregate row', async () => {
    // MySQL SUM(...) commonly returns strings — assert they are coerced to numbers.
    setupStatsMock({ total: '543', active: '541', withUserAccounts: '27', managersAdmins: '9' })

    const stats = await repo.getEmployeeStats(adminCtx)

    expect(stats).toEqual({ total: 543, active: 541, withUserAccounts: 27, managersAdmins: 9 })
  })

  it('coerces a null/empty aggregate (no matching rows) to zeros', async () => {
    setupStatsMock({ total: null, active: null, withUserAccounts: null, managersAdmins: null })

    const stats = await repo.getEmployeeStats(adminCtx)

    expect(stats).toEqual({ total: 0, active: 0, withUserAccounts: 0, managersAdmins: 0 })
  })

  it('admin: does not scope by employee id (global stats)', async () => {
    const mockQuery = setupStatsMock({ total: 1, active: 1, withUserAccounts: 1, managersAdmins: 1 })

    await repo.getEmployeeStats(adminCtx)

    expect(mockQuery.where).not.toHaveBeenCalled()
    expect(mockQuery.executeTakeFirst).toHaveBeenCalledTimes(1)
  })

  it('manager: scopes to self plus managed employee ids', async () => {
    const mockQuery = setupStatsMock({ total: 4, active: 4, withUserAccounts: 2, managersAdmins: 1 })

    await repo.getEmployeeStats(managerCtx)

    expect(mockQuery.where).toHaveBeenCalledWith('employees.id', 'in', [2, 10, 11, 12])
  })

  it('plain employee: scopes to only their own id', async () => {
    const mockQuery = setupStatsMock({ total: 1, active: 1, withUserAccounts: 0, managersAdmins: 0 })

    await repo.getEmployeeStats(employeeCtx)

    expect(mockQuery.where).toHaveBeenCalledWith('employees.id', '=', 3)
  })

  it('no employeeId and not admin: returns all zeros without querying', async () => {
    const mockQuery = setupStatsMock({ total: 999, active: 999, withUserAccounts: 999, managersAdmins: 999 })

    const stats = await repo.getEmployeeStats(nobodyCtx)

    expect(stats).toEqual({ total: 0, active: 0, withUserAccounts: 0, managersAdmins: 0 })
    expect(mockQuery.executeTakeFirst).not.toHaveBeenCalled()
  })
})
