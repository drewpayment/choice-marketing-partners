import { db } from '@/lib/database/client'

export interface ActiveImpersonation {
  id: number
  actor_user_id: string
  target_user_id: string
  actor_employee_id: number | null
  target_employee_id: number | null
  started_at: Date
  expires_at: Date | null
}

export interface ImpersonationStartInput {
  actorUserId: string
  targetUserId: string
  actorEmployeeId?: number | null
  targetEmployeeId?: number | null
  expiresAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}

export interface BlockedMutationInput {
  actorUserId: string
  targetUserId: string
  method: string
  path: string
  ipAddress?: string | null
  userAgent?: string | null
}

export class ImpersonationRepository {
  async getActiveImpersonation(actorUserId: string): Promise<ActiveImpersonation | null> {
    const row = await db
      .selectFrom('user_impersonation_log')
      .select([
        'id',
        'actor_user_id',
        'target_user_id',
        'actor_employee_id',
        'target_employee_id',
        'started_at',
        'expires_at',
      ])
      .where('actor_user_id', '=', actorUserId)
      .where('ended_at', 'is', null)
      .where('end_reason', 'is', null)
      .orderBy('started_at', 'desc')
      .executeTakeFirst()

    if (!row) return null
    return row as ActiveImpersonation
  }

  async startImpersonation(input: ImpersonationStartInput): Promise<number> {
    const result = await db
      .insertInto('user_impersonation_log')
      .values({
        actor_user_id: input.actorUserId,
        target_user_id: input.targetUserId,
        actor_employee_id: input.actorEmployeeId ?? null,
        target_employee_id: input.targetEmployeeId ?? null,
        expires_at: input.expiresAt,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }

  async stopImpersonation(
    actorUserId: string,
    reason: 'manual' | 'expired'
  ): Promise<number> {
    const result = await db
      .updateTable('user_impersonation_log')
      .set({
        ended_at: new Date(),
        end_reason: reason,
      })
      .where('actor_user_id', '=', actorUserId)
      .where('ended_at', 'is', null)
      .where('end_reason', 'is', null)
      .executeTakeFirst()

    return Number(result.numUpdatedRows)
  }

  async logBlockedMutation(input: BlockedMutationInput): Promise<void> {
    const now = new Date()
    await db
      .insertInto('user_impersonation_log')
      .values({
        actor_user_id: input.actorUserId,
        target_user_id: input.targetUserId,
        ended_at: now,
        end_reason: 'rejected_mutation',
        blocked_method: input.method,
        blocked_path: input.path,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      })
      .execute()
  }
}
