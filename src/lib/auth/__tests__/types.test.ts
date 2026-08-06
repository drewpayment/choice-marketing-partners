import type { UserContext } from '@/lib/auth/types'
import { accessibleEmployeeIds, buildUserContext } from '@/lib/auth/types'

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

  describe('accessibleEmployeeIds', () => {
    it('puts self first, followed by managed employees', () => {
      expect(
        accessibleEmployeeIds({ employeeId: 36, managedEmployeeIds: [1184] })
      ).toEqual([36, 1184])
    })

    it('returns self only when the manager has no subordinates', () => {
      expect(accessibleEmployeeIds({ employeeId: 36, managedEmployeeIds: [] })).toEqual([36])
    })

    it('returns self only when managedEmployeeIds is undefined', () => {
      expect(accessibleEmployeeIds({ employeeId: 36 })).toEqual([36])
    })

    it('dedupes when managedEmployeeIds already contains self', () => {
      expect(
        accessibleEmployeeIds({ employeeId: 36, managedEmployeeIds: [36, 1184, 1184] })
      ).toEqual([36, 1184])
    })

    it('returns an empty array when there is no employeeId and nothing managed', () => {
      expect(accessibleEmployeeIds({})).toEqual([])
    })

    it('falls back to managed ids when employeeId is missing', () => {
      expect(accessibleEmployeeIds({ managedEmployeeIds: [10, 11] })).toEqual([10, 11])
    })
  })
})
