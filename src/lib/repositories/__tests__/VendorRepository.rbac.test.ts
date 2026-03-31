import { VendorRepository } from '../VendorRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    deleteFrom: jest.fn(),
    fn: {
      count: jest.fn().mockReturnValue({
        as: jest.fn().mockReturnValue('count_expr'),
      }),
    },
  },
}))

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }
const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

describe('VendorRepository RBAC', () => {
  let repo: VendorRepository

  beforeEach(() => {
    repo = new VendorRepository()
    jest.clearAllMocks()
  })

  describe('getVendors', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getVendors({}, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getVendors({}, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getVendorById', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getVendorById(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getVendorById(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('isNameAvailable', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.isNameAvailable('test', undefined, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.isNameAvailable('test', undefined, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('createVendor', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.createVendor({ name: 'Test' }, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.createVendor({ name: 'Test' }, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('updateVendor', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.updateVendor(1, { name: 'New' }, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.updateVendor(1, { name: 'New' }, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('toggleActive', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.toggleActive(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.toggleActive(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('deleteVendor', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.deleteVendor(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.deleteVendor(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })
})
