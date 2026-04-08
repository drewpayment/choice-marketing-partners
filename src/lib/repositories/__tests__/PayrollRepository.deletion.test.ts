import type { UserContext } from '@/lib/auth/types'

// Must use `var` (not const/let) so jest.mock hoisting doesn't hit TDZ
// eslint-disable-next-line no-var
var mockChain: any

jest.mock('../VendorFieldRepository', () => ({
  VendorFieldRepository: jest.fn().mockImplementation(() => ({
    getFieldsByVendor: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock('@/lib/database/client', () => {
  mockChain = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    fn: Object.assign(jest.fn().mockReturnValue('DATE_EXPR'), {
      count: jest.fn().mockReturnValue({ as: jest.fn() }),
      sum: jest.fn().mockReturnValue({ as: jest.fn() }),
    }),
  }
  return { db: mockChain }
})

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { PayrollRepository } from '../PayrollRepository'

describe('PayrollRepository - Deletion', () => {
  let repo: PayrollRepository

  const adminCtx: UserContext = {
    employeeId: 1,
    isAdmin: true,
    isManager: false,
  }

  const managerCtx: UserContext = {
    employeeId: 2,
    isAdmin: false,
    isManager: true,
    managedEmployeeIds: [3, 4],
  }

  const employeeCtx: UserContext = {
    employeeId: 3,
    isAdmin: false,
    isManager: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new PayrollRepository()
  })

  describe('previewPaystubDeletion', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.previewPaystubDeletion(1, 1, '2026-01-01', managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.previewPaystubDeletion(1, 1, '2026-01-01', employeeCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('returns canDelete: false when payroll is paid', async () => {
      mockChain.executeTakeFirst.mockResolvedValueOnce({ is_paid: 1 })
      const result = await repo.previewPaystubDeletion(1, 5, '2026-01-01', adminCtx)
      expect(result.canDelete).toBe(false)
      expect(result.isPaid).toBe(true)
    })
  })

  describe('deletePaystubWithAudit', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.deletePaystubWithAudit(1, 1, '2026-01-01', managerCtx, 2, 'test reason', '127.0.0.1')
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.deletePaystubWithAudit(1, 1, '2026-01-01', employeeCtx, 3, 'test reason', '127.0.0.1')
      ).rejects.toThrow('Admin access required')
    })
  })
})
