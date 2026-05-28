import { db } from '@/lib/database/client'
import type { ImpersonationSnapshot } from '@/types/auth'

export interface BuildSnapshotResult {
  snapshot: ImpersonationSnapshot
  targetUserId: string
  targetEmployeeId: number | null
  isSuperAdmin: boolean
}

/**
 * Build an impersonation snapshot for the given users.id. Mirrors the role/flag
 * lookup done in authorize() in src/lib/auth/config.ts. Returns null when the
 * user does not exist or is not active.
 *
 * The caller is responsible for refusing to impersonate SuperAdmins — this
 * helper returns the isSuperAdmin flag so the caller can decide.
 */
export async function buildImpersonationSnapshot(
  targetUserId: string,
  expiresAt: number
): Promise<BuildSnapshotResult | null> {
  const numericId = Number(targetUserId)
  if (!Number.isFinite(numericId)) return null

  const user = await db
    .selectFrom('users')
    .select(['id', 'name'])
    .where('id', '=', numericId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()

  if (!user) return null

  const employee = await db
    .selectFrom('employees')
    .select([
      'id as employee_id',
      'name as employee_name',
      'is_admin',
      'is_mgr',
      'is_super_admin',
      'is_active',
      'sales_id1',
      'sales_id2',
      'sales_id3',
    ])
    .where('id', '=', numericId)
    .executeTakeFirst()

  let subscriberLink: { subscriber_id: number } | undefined
  try {
    subscriberLink = await db
      .selectFrom('subscriber_user')
      .innerJoin('subscribers', 'subscriber_user.subscriber_id', 'subscribers.id')
      .select(['subscribers.id as subscriber_id'])
      .where('subscriber_user.user_id', '=', numericId)
      .where('subscribers.deleted_at', 'is', null)
      .executeTakeFirst()
  } catch {
    // Billing tables may not exist in this environment.
  }

  const isActive = employee?.is_active === 1 || !!subscriberLink
  if (!isActive) return null

  return {
    snapshot: {
      actAsUserId: String(user.id),
      targetName: user.name || employee?.employee_name || 'User',
      targetEmployeeId: employee?.employee_id ?? null,
      isAdmin: employee?.is_admin === 1,
      isManager: employee?.is_mgr === 1,
      isSubscriber: !!subscriberLink,
      isActive: true,
      employeeId: employee?.employee_id,
      subscriberId: subscriberLink?.subscriber_id ?? null,
      salesIds: [
        employee?.sales_id1,
        employee?.sales_id2,
        employee?.sales_id3,
      ].filter(Boolean) as string[],
      expiresAt,
    },
    targetUserId: String(user.id),
    targetEmployeeId: employee?.employee_id ?? null,
    isSuperAdmin: employee?.is_super_admin === 1,
  }
}
