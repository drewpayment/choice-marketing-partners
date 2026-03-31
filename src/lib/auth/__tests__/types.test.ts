import type { UserContext } from '@/lib/auth/types'
import { buildUserContext } from '@/lib/auth/types'

describe('UserContext', () => {
  describe('buildUserContext', () => {
    it('returns admin context with no managedEmployeeIds', () => {
      const ctx: UserContext = buildUserContext({
        employeeId: 1,
        isAdmin: true,
        isManager: false,
      })
      expect(ctx.isAdmin).toBe(true)
      expect(ctx.isManager).toBe(false)
      expect(ctx.employeeId).toBe(1)
      expect(ctx.managedEmployeeIds).toBeUndefined()
    })

    it('returns manager context with managedEmployeeIds', () => {
      const ctx: UserContext = buildUserContext({
        employeeId: 2,
        isAdmin: false,
        isManager: true,
        managedEmployeeIds: [10, 11, 12],
      })
      expect(ctx.isManager).toBe(true)
      expect(ctx.managedEmployeeIds).toEqual([10, 11, 12])
    })

    it('returns employee context with minimal fields', () => {
      const ctx: UserContext = buildUserContext({
        employeeId: 3,
        isAdmin: false,
        isManager: false,
      })
      expect(ctx.isAdmin).toBe(false)
      expect(ctx.isManager).toBe(false)
      expect(ctx.employeeId).toBe(3)
    })

    it('handles missing employeeId', () => {
      const ctx: UserContext = buildUserContext({
        isAdmin: false,
        isManager: false,
      })
      expect(ctx.employeeId).toBeUndefined()
    })
  })
})
