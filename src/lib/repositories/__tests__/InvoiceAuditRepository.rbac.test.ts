import { InvoiceAuditRepository } from '../InvoiceAuditRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
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

describe('InvoiceAuditRepository RBAC', () => {
  let repo: InvoiceAuditRepository

  beforeEach(() => {
    repo = new InvoiceAuditRepository()
    jest.clearAllMocks()
  })

  describe('createAuditRecord (NO UserContext - internal use)', () => {
    it('should not require userContext parameter', () => {
      // createAuditRecord is called internally by InvoiceRepository
      // It should NOT have a userContext parameter
      expect(repo.createAuditRecord.length).toBeLessThanOrEqual(7) // original params only
    })
  })

  describe('searchAuditRecords', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.searchAuditRecords({}, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.searchAuditRecords({}, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getInvoiceAuditHistory', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getInvoiceAuditHistory(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getInvoiceAuditHistory(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getAuditSummary', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getAuditSummary(undefined, undefined, undefined, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getAuditSummary(undefined, undefined, undefined, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('hasAuditHistory', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.hasAuditHistory(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.hasAuditHistory(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getRecentAuditActivity', () => {
    it('should throw for non-admin (manager)', async () => {
      await expect(repo.getRecentAuditActivity(undefined, 20, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('should throw for non-admin (employee)', async () => {
      await expect(repo.getRecentAuditActivity(undefined, 20, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })
})
