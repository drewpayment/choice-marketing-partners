/**
 * Shared user context type for role-based access control.
 * Used by all repositories and access-check functions.
 */
export interface UserContext {
  employeeId?: number
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin?: boolean
  isSubscriber?: boolean
  subscriberId?: number
  managedEmployeeIds?: number[]
}

/**
 * Build a UserContext from partial input.
 * This is the canonical way to construct a UserContext from session data.
 */
export function buildUserContext(input: {
  employeeId?: number | null
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin?: boolean
  isSubscriber?: boolean
  subscriberId?: number | null
  managedEmployeeIds?: number[]
}): UserContext {
  return {
    employeeId: input.employeeId ?? undefined,
    isAdmin: input.isAdmin,
    isManager: input.isManager,
    isSuperAdmin: input.isSuperAdmin,
    isSubscriber: input.isSubscriber,
    subscriberId: input.subscriberId ?? undefined,
    managedEmployeeIds: input.managedEmployeeIds,
  }
}
