import { db } from '@/lib/database/client'

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
  /** Evaluate a single flag for a given context. */
  async evaluateFlag(flagName: string, context: FlagContext): Promise<boolean> {
    const flag = await db
      .selectFrom('feature_flags')
      .selectAll()
      .where('name', '=', flagName)
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

    // 5. Role override (admin > manager > subscriber)
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

    // 6. Subscriber override
    if (context.subscriberId) {
      const subOverride = overrides.find(
        (o) => o.context_type === 'subscriber' && o.context_value === String(context.subscriberId)
      )
      if (subOverride !== undefined) return !!subOverride.is_enabled
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
      .executeTakeFirst()
    return Number(result.insertId)
  }

  async updateFlag(id: number, data: {
    is_enabled?: boolean
    rollout_percentage?: number
    environment?: string
    description?: string
  }): Promise<void> {
    const updates: Record<string, unknown> = {}
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
      .onDuplicateKeyUpdate({ is_enabled: data.is_enabled ? 1 : 0 })
      .execute()
  }

  async deleteOverride(overrideId: number): Promise<void> {
    await db.deleteFrom('feature_flag_overrides').where('id', '=', overrideId).execute()
  }
}
