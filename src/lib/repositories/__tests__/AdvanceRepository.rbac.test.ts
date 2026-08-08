import type { UserContext } from '@/lib/auth/types'

// Chainable db mock. execute()/executeTakeFirst() resolve empty by default so
// RBAC "allowed" paths that fall through to a query don't blow up.
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
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    executeTakeFirstOrThrow: jest.fn().mockResolvedValue({}),
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
const managerCtx: UserContext = {
  employeeId: 2,
  isAdmin: false,
  isManager: true,
  managedEmployeeIds: [10, 11],
}
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

const audit = { changedBy: 1 }

const baseCreate = {
  agentid: 10,
  vendorId: 5,
  amount: 100,
  advanceDate: '2026-01-05',
  issueDate: '2026-01-09',
  wkending: '2026-01-04',
}

describe('AdvanceRepository', () => {
  let repo: AdvanceRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockChain.execute.mockResolvedValue([])
    mockChain.executeTakeFirst.mockResolvedValue(null)
    mockChain.executeTakeFirstOrThrow.mockResolvedValue({})
    repo = new AdvanceRepository()
  })

  describe('createAdvance generated key', () => {
    // Postgres never populates InsertResult.insertId — the new advance_id must come
    // back through RETURNING, because it is immediately used as the advance_audit FK
    // and to re-read the created row. Under the old insertId read this was NaN.
    it('reads advance_id via RETURNING and threads it into the audit row', async () => {
      mockChain.executeTakeFirstOrThrow.mockResolvedValue({ advance_id: 4242 })
      mockChain.executeTakeFirst.mockResolvedValue({
        advance_id: 4242,
        agentid: 10,
        vendor_id: 5,
        amount: '100.00',
        advance_date: new Date(2026, 0, 5),
        issue_date: new Date(2026, 0, 9),
        wkending: new Date(2026, 0, 4),
        method: 'other',
        notes: '',
        created_by: 1,
        created_at: null,
        updated_at: null,
      })

      const created = await repo.createAdvance(baseCreate, adminCtx, audit)

      expect(mockChain.returning).toHaveBeenCalledWith('advance_id')
      expect(created.advance_id).toBe(4242)

      const auditValues = mockChain.values.mock.calls
        .map((c: unknown[]) => c[0] as Record<string, unknown>)
        .find((v: Record<string, unknown>) => v && 'action_type' in v)
      expect(auditValues).toBeDefined()
      expect(auditValues!.advance_id).toBe(4242)
      expect(Number.isNaN(auditValues!.advance_id as number)).toBe(false)
    })
  })

  describe('createAdvance amount sign', () => {
    it('rejects amount of 0', async () => {
      await expect(
        repo.createAdvance({ ...baseCreate, amount: 0 }, adminCtx, audit)
      ).rejects.toThrow('Advance amount must be greater than zero')
    })

    it('rejects negative amount', async () => {
      await expect(
        repo.createAdvance({ ...baseCreate, amount: -50 }, adminCtx, audit)
      ).rejects.toThrow('Advance amount must be greater than zero')
    })

    it('rejects for employee role (permissions) before touching amount', async () => {
      await expect(
        repo.createAdvance({ ...baseCreate, amount: 100 }, employeeCtx, audit)
      ).rejects.toThrow('Insufficient permissions')
    })

    it('rejects manager creating for a non-managed agent', async () => {
      await expect(
        repo.createAdvance({ ...baseCreate, agentid: 99, amount: 100 }, managerCtx, audit)
      ).rejects.toThrow('Access denied')
    })
  })

  describe('getAdvancesByAgent RBAC reads', () => {
    it('lets an employee read their OWN advances', async () => {
      // employeeCtx.employeeId === 3
      await expect(repo.getAdvancesByAgent(3, {}, employeeCtx)).resolves.toEqual([])
    })

    it('forbids an employee reading another agent', async () => {
      await expect(repo.getAdvancesByAgent(99, {}, employeeCtx)).rejects.toThrow(
        'Access denied'
      )
    })

    it('lets a manager read a managed agent', async () => {
      await expect(repo.getAdvancesByAgent(10, {}, managerCtx)).resolves.toEqual([])
    })

    it('forbids a manager reading a non-managed agent', async () => {
      await expect(repo.getAdvancesByAgent(99, {}, managerCtx)).rejects.toThrow(
        'Access denied'
      )
    })

    it('lets an admin read any agent', async () => {
      await expect(repo.getAdvancesByAgent(99, {}, adminCtx)).resolves.toEqual([])
    })
  })

  describe('getAdvanceById read RBAC', () => {
    it('forbids an employee reading another agent’s advance', async () => {
      mockChain.executeTakeFirst.mockResolvedValueOnce({ advance_id: 1, agentid: 99, amount: '10' })
      await expect(repo.getAdvanceById(1, employeeCtx)).rejects.toThrow('Access denied')
    })

    it('returns null when the advance does not exist', async () => {
      mockChain.executeTakeFirst.mockResolvedValueOnce(null)
      await expect(repo.getAdvanceById(123, adminCtx)).resolves.toBeNull()
    })
  })
})
