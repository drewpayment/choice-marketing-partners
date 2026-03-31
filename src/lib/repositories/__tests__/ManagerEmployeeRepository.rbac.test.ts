import { ManagerEmployeeRepository } from '../ManagerEmployeeRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    deleteFrom: jest.fn(),
    transaction: jest.fn(),
    fn: {
      count: jest.fn().mockReturnValue({
        as: jest.fn().mockReturnValue('count_expr'),
      }),
    },
  },
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() },
}))

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

describe('ManagerEmployeeRepository RBAC', () => {
  let repo: ManagerEmployeeRepository

  beforeEach(() => {
    repo = new ManagerEmployeeRepository()
    jest.clearAllMocks()
  })

  describe('getManagers', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getManagers(managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getManagers(employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getManagerWithEmployees', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getManagerWithEmployees(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getManagerWithEmployees(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getManagerEmployees', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getManagerEmployees(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getManagerEmployees(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getUnassignedEmployees', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getUnassignedEmployees(managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getUnassignedEmployees(employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getAvailableEmployees', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getAvailableEmployees(managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getAvailableEmployees(employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getManagedEmployeeIds', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getManagedEmployeeIds(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getManagedEmployeeIds(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('assignEmployeeToManager', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.assignEmployeeToManager(1, 2, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.assignEmployeeToManager(1, 2, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('removeEmployeeFromManager', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.removeEmployeeFromManager(1, 2, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.removeEmployeeFromManager(1, 2, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('unassignEmployee', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.unassignEmployee(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.unassignEmployee(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('bulkUpdateAssignments', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.bulkUpdateAssignments(1, [2, 3], managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.bulkUpdateAssignments(1, [2, 3], employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('updateAssignments', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.updateAssignments([{ managerId: 1, employeeId: 2 }], managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.updateAssignments([{ managerId: 1, employeeId: 2 }], employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getAssignmentStats', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getAssignmentStats(managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getAssignmentStats(employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('validateAssignment', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.validateAssignment(1, 2, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.validateAssignment(1, 2, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })
})
