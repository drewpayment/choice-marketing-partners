import { db } from '@/lib/database/client'
import { sql } from 'kysely'

export interface FlagContext {
  userId: string
  isAdmin: boolean
  isManager: boolean
  isSubscriber: boolean
  subscriberId?: number | null
}

export interface FeatureFlag {
  id: number
  name: string
  description: string | null
  is_enabled: number
  rollout_percentage: number
  environment: string
  created_at: Date | null
  updated_at: Date | null
  overrides: FeatureFlagOverride[]
}

export interface FeatureFlagOverride {
  id: number
  flag_id: number
  context_type: 'user' | 'role' | 'subscriber'
  context_value: string
  is_enabled: number
}

/** Stable 0-99 bucket for a user ID string */
function userBucket(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return hash % 100
}

export class FeatureFlagRepository {
  /**
   * Evaluate a single flag for a given context.
   *
   * `feature_flags.name` was matched case-insensitively under MySQL
   * (`utf8mb4_0900_ai_ci`) and is case-SENSITIVE under Postgres. Unlike the
   * Stripe ids elsewhere in this codebase, this key is human-entered:
   * `createFlag` stores whatever the admin UI submits, with no normalisation
   * and no format constraint. A flag created as `NewPayrollUI` but evaluated as
   * `newpayrollui` matched under MySQL and would silently miss here — returning
   * `false` with no error and no log, while the admin list shows the flag as
   * enabled. Compare on `lower()` on both sides to keep today's behaviour.
   * (4 rows in the snapshot; the seq scan is free. The source unique index on
   * `name` is deliberately left case-sensitive — see
   * scripts/pg-migration/README.md §3 — so the lookup is the layer that has to
   * stay CI.)
   */
  async evaluateFlag(flagName: string, context: FlagContext): Promise<boolean> {
    const flag = await db
      .selectFrom('feature_flags')
      .selectAll()
      .where(sql`lower(name)`, '=', flagName.toLowerCase())
      .executeTakeFirst()

    if (!flag) return false

    // 1. Environment check
    const env = process.env.NODE_ENV ?? 'production'
    if (flag.environment !== 'all' && flag.environment !== env) return false

    // 2. Global kill switch
    if (!flag.is_enabled) return false

    // 3. Load overrides
    const overrides = await db
      .selectFrom('feature_flag_overrides')
      .selectAll()
      .where('flag_id', '=', flag.id)
      .execute()

    // 4. User override
    const userOverride = overrides.find(
      (o) => o.context_type === 'user' && o.context_value === context.userId
    )
    if (userOverride !== undefined) return !!userOverride.is_enabled

    // 5. Subscriber-ID override (more specific than role)
    if (context.subscriberId) {
      const subOverride = overrides.find(
        (o) => o.context_type === 'subscriber' && o.context_value === String(context.subscriberId)
      )
      if (subOverride !== undefined) return !!subOverride.is_enabled
    }

    // 6. Role override (admin > manager > subscriber)
    const rolesToCheck: Array<[boolean, string]> = [
      [context.isAdmin, 'admin'],
      [context.isManager, 'manager'],
      [context.isSubscriber, 'subscriber'],
    ]
    for (const [hasRole, roleName] of rolesToCheck) {
      if (!hasRole) continue
      const roleOverride = overrides.find(
        (o) => o.context_type === 'role' && o.context_value === roleName
      )
      if (roleOverride !== undefined) return !!roleOverride.is_enabled
    }

    // 7. Percentage rollout
    return userBucket(context.userId) < flag.rollout_percentage
  }

  async listFlags(): Promise<FeatureFlag[]> {
    const flags = await db
      .selectFrom('feature_flags')
      .selectAll()
      .orderBy('name', 'asc')
      .execute()

    const overrides = await db
      .selectFrom('feature_flag_overrides')
      .selectAll()
      .execute()

    return flags.map((f) => ({
      ...f,
      overrides: overrides.filter((o) => o.flag_id === f.id) as FeatureFlagOverride[],
    }))
  }

  async getFlag(id: number): Promise<FeatureFlag | null> {
    const flag = await db
      .selectFrom('feature_flags')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!flag) return null

    const overrides = await db
      .selectFrom('feature_flag_overrides')
      .selectAll()
      .where('flag_id', '=', id)
      .execute()

    return { ...flag, overrides: overrides as FeatureFlagOverride[] }
  }

  async createFlag(data: {
    name: string
    description?: string
    is_enabled?: boolean
    rollout_percentage?: number
    environment?: string
  }): Promise<number> {
    const result = await db
      .insertInto('feature_flags')
      .values({
        name: data.name,
        description: data.description ?? null,
        is_enabled: data.is_enabled ? 1 : 0,
        rollout_percentage: data.rollout_percentage ?? 0,
        environment: data.environment ?? 'production',
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    return Number(result.id)
  }

  async updateFlag(id: number, data: {
    is_enabled?: boolean
    rollout_percentage?: number
    environment?: string
    description?: string
  }): Promise<void> {
    type UpdateData = {
      is_enabled?: 0 | 1
      rollout_percentage?: number
      environment?: string
      description?: string
    }
    const updates: UpdateData = {}
    if (data.is_enabled !== undefined) updates.is_enabled = data.is_enabled ? 1 : 0
    if (data.rollout_percentage !== undefined) updates.rollout_percentage = data.rollout_percentage
    if (data.environment !== undefined) updates.environment = data.environment
    if (data.description !== undefined) updates.description = data.description

    await db
      .updateTable('feature_flags')
      .set(updates)
      .where('id', '=', id)
      .execute()
  }

  async deleteFlag(id: number): Promise<void> {
    await db.deleteFrom('feature_flags').where('id', '=', id).execute()
  }

  async upsertOverride(flagId: number, data: {
    context_type: 'user' | 'role' | 'subscriber'
    context_value: string
    is_enabled: boolean
  }): Promise<void> {
    await db
      .insertInto('feature_flag_overrides')
      .values({
        flag_id: flagId,
        context_type: data.context_type,
        context_value: data.context_value,
        is_enabled: data.is_enabled ? 1 : 0,
      })
      .onConflict((oc) =>
        oc
          .columns(['flag_id', 'context_type', 'context_value'])
          .doUpdateSet({ is_enabled: data.is_enabled ? 1 : 0 })
      )
      .execute()
  }

  async deleteOverride(overrideId: number): Promise<void> {
    await db.deleteFrom('feature_flag_overrides').where('id', '=', overrideId).execute()
  }
}
