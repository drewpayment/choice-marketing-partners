import { EmployeeRepository } from '../EmployeeRepository'
import { db } from '@/lib/database/client'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    fn: {
      count: jest.fn().mockReturnValue({
        as: jest.fn().mockReturnValue('count_expr'),
      }),
    },
    case: jest.fn(),
    transaction: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}))

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10, 11, 12] }
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

describe('EmployeeRepository RBAC', () => {
  let repo: EmployeeRepository

  beforeEach(() => {
    repo = new EmployeeRepository()
    jest.clearAllMocks()
  })

  describe('getEmployees', () => {
    function setupMockQuery() {
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
      ;(db.case as jest.Mock).mockReturnValue({
        when: jest.fn().mockReturnValue({
          then: jest.fn().mockReturnValue({
            else: jest.fn().mockReturnValue({
              end: jest.fn().mockReturnValue({
                as: jest.fn().mockReturnValue('hasUser_expr'),
              }),
            }),
          }),
        }),
      })
      return mockQuery
    }

    it('does not throw for admin', async () => {
      setupMockQuery()
      const result = await repo.getEmployees({}, adminCtx)
      expect(result).toHaveProperty('employees')
      expect(result).toHaveProperty('total')
    })

    it('does not throw for manager', async () => {
      setupMockQuery()
      const result = await repo.getEmployees({}, managerCtx)
      expect(result).toHaveProperty('employees')
    })

    it('does not throw for employee', async () => {
      setupMockQuery()
      const result = await repo.getEmployees({}, employeeCtx)
      expect(result).toHaveProperty('employees')
    })

    it('returns empty for user with no employeeId and not admin', async () => {
      const noIdCtx: UserContext = { isAdmin: false, isManager: false }
      const result = await repo.getEmployees({}, noIdCtx)
      expect(result.employees).toEqual([])
      expect(result.total).toBe(0)
    })

    it('applies where filter for manager with managed IDs', async () => {
      const mockQuery = setupMockQuery()
      await repo.getEmployees({}, managerCtx)
      // Manager should have where called with 'in' for accessible IDs
      expect(mockQuery.where).toHaveBeenCalledWith(
        'employees.id',
        'in',
        [2, 10, 11, 12]
      )
    })

    it('applies where filter for regular employee', async () => {
      const mockQuery = setupMockQuery()
      await repo.getEmployees({}, employeeCtx)
      expect(mockQuery.where).toHaveBeenCalledWith(
        'employees.id',
        '=',
        3
      )
    })
  })

  describe('createEmployee', () => {
    it('throws Admin access required for manager', async () => {
      await expect(
        repo.createEmployee({ name: 'Test', email: 'test@test.com', address: '123 St' }, managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws Admin access required for employee', async () => {
      await expect(
        repo.createEmployee({ name: 'Test', email: 'test@test.com', address: '123 St' }, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('does not throw for admin', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ insertId: BigInt(1) }),
      }
      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      // Mock getEmployeeById for the follow-up call
      const mockSelect = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({
          id: 1, name: 'Test', email: 'test@test.com', phone_no: null,
          address: '123 St', address_2: null, city: null, state: null,
          postal_code: null, country: 'US', is_active: 1, is_admin: 0,
          is_mgr: 0, sales_id1: '', sales_id2: '', sales_id3: '',
          hidden_payroll: 0, created_at: new Date(), deleted_at: null,
          user_uid: null, user_email: null, user_role: null, user_created_at: null,
        }),
      }
      ;(db.selectFrom as jest.Mock).mockReturnValue(mockSelect)

      const result = await repo.createEmployee(
        { name: 'Test', email: 'test@test.com', address: '123 St' },
        adminCtx
      )
      expect(result).toHaveProperty('id')
    })
  })

  describe('updateEmployee', () => {
    it('throws Admin access required for manager', async () => {
      await expect(
        repo.updateEmployee(1, { name: 'Updated' }, managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws Admin access required for employee', async () => {
      await expect(
        repo.updateEmployee(1, { name: 'Updated' }, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('softDeleteEmployee', () => {
    it('throws Admin access required for manager', async () => {
      await expect(
        repo.softDeleteEmployee(1, managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws Admin access required for employee', async () => {
      await expect(
        repo.softDeleteEmployee(1, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('restoreEmployee', () => {
    it('throws Admin access required for non-admin', async () => {
      await expect(
        repo.restoreEmployee(1, managerCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('createEmployeeWithUser', () => {
    it('throws Admin access required for non-admin', async () => {
      await expect(
        repo.createEmployeeWithUser(
          { name: 'Test', email: 'test@test.com', address: '123 St' },
          undefined,
          managerCtx
        )
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('createEmployeeUser', () => {
    it('throws Admin access required for non-admin', async () => {
      await expect(
        repo.createEmployeeUser(1, { password: 'test1234' }, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('getEmployeeById', () => {
    function setupMockSelect(employeeData: Record<string, unknown> | undefined) {
      const mockSelect = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(employeeData),
      }
      ;(db.selectFrom as jest.Mock).mockReturnValue(mockSelect)
      return mockSelect
    }

    const mockEmployee = {
      id: 10, name: 'Test', email: 'test@test.com', phone_no: null,
      address: '123 St', address_2: null, city: null, state: null,
      postal_code: null, country: 'US', is_active: 1, is_admin: 0,
      is_mgr: 0, sales_id1: '', sales_id2: '', sales_id3: '',
      hidden_payroll: 0, created_at: new Date(), deleted_at: null,
      user_uid: null, user_email: null, user_role: null, user_created_at: null,
    }

    it('returns employee for admin regardless of ID', async () => {
      setupMockSelect(mockEmployee)
      const result = await repo.getEmployeeById(10, adminCtx)
      expect(result).not.toBeNull()
    })

    it('returns null for employee accessing another employees record', async () => {
      setupMockSelect(mockEmployee)
      const result = await repo.getEmployeeById(10, employeeCtx)
      expect(result).toBeNull()
    })

    it('returns employee for manager accessing managed employee', async () => {
      setupMockSelect(mockEmployee)
      const result = await repo.getEmployeeById(10, managerCtx)
      expect(result).not.toBeNull()
    })

    it('returns null for manager accessing unmanaged employee', async () => {
      setupMockSelect(mockEmployee)
      const result = await repo.getEmployeeById(99, managerCtx)
      expect(result).toBeNull()
    })

    it('returns employee when no userContext is provided (backward compat)', async () => {
      setupMockSelect(mockEmployee)
      const result = await repo.getEmployeeById(10)
      expect(result).not.toBeNull()
    })
  })
})
