import type { UserContext } from '@/lib/auth/types'

const mockExecute = jest.fn()
const mockExecuteTakeFirst = jest.fn()

const mockChain = {
  selectFrom: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: mockExecute,
  executeTakeFirst: mockExecuteTakeFirst,
  fn: jest.fn().mockReturnValue('DATE_EXPR'),
}

;(mockChain.fn as any).count = jest.fn().mockReturnValue({ as: jest.fn() })
;(mockChain.fn as any).sum = jest.fn().mockReturnValue({ as: jest.fn() })

jest.mock('@/lib/database/client', () => ({
  db: mockChain,
}))

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
      mockExecuteTakeFirst.mockResolvedValueOnce({ is_paid: 1 })
      const result = await repo.previewPaystubDeletion(1, 5, '2026-01-01', adminCtx)
      expect(result.canDelete).toBe(false)
      expect(result.isPaid).toBe(true)
    })
  })
})
