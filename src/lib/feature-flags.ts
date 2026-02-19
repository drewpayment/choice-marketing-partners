import { FeatureFlagRepository, FlagContext } from '@/lib/repositories/FeatureFlagRepository'

/**
 * Check a feature flag server-side (for API routes).
 * Pass the full context from session.user for accurate targeting.
 */
export async function isFeatureEnabled(
  flagName: string,
  context: FlagContext | string | undefined
): Promise<boolean> {
  try {
    const repo = new FeatureFlagRepository()

    // Legacy call sites pass a string userId — normalize to FlagContext
    const ctx: FlagContext =
      typeof context === 'string' || context === undefined
        ? {
            userId: context ?? 'anonymous',
            isAdmin: false,
            isManager: false,
            isSubscriber: false,
            subscriberId: null,
          }
        : context

    return await repo.evaluateFlag(flagName, ctx)
  } catch {
    // DB unavailable — fail open in development, closed in production
    return process.env.NODE_ENV === 'development'
  }
}
