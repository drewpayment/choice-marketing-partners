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

/**
 * Employee IDs a non-admin user may READ list-level data for: their own
 * employee record plus every employee they manage.
 *
 * `managedEmployeeIds` comes from `manager_employees`, which never contains the
 * manager themselves, so self must be added explicitly — otherwise a manager
 * with at least one subordinate silently loses visibility of their own records.
 * Deduped defensively in case a self-referential `manager_employees` row exists.
 *
 * Returns an empty array when there is no employeeId and nothing managed; the
 * caller decides what "no accessible ids" means for its query.
 *
 * NOTE: read scope only. Write-permission checks (invoices, advances, scheduled
 * expenses) deliberately exclude self and must keep using `managedEmployeeIds`.
 */
export function accessibleEmployeeIds(
  userContext: Pick<UserContext, 'employeeId' | 'managedEmployeeIds'>
): number[] {
  const ids: number[] = []

  if (userContext.employeeId) {
    ids.push(userContext.employeeId)
  }

  for (const id of userContext.managedEmployeeIds ?? []) {
    if (!ids.includes(id)) {
      ids.push(id)
    }
  }

  return ids
}
