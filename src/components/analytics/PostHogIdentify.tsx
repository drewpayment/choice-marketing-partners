'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import posthog from 'posthog-js'

/**
 * Ties PostHog's anonymous visitor to the signed-in NextAuth user, and resets
 * it on sign-out so the next person on a shared machine starts anonymous.
 *
 * During impersonation `session.user` is the target, but events are attributed
 * to the real actor (the SuperAdmin), with the target recorded as an event
 * property, so the target's analytics aren't polluted by someone else's clicks.
 */
export function PostHogIdentify() {
  const { data: session, status } = useSession()

  const actorId = session?.impersonation?.actorUserId ?? session?.user?.id
  const impersonatingId = session?.impersonation?.targetUserId
  const email = session?.impersonation ? undefined : session?.user?.email
  const name = session?.impersonation ? session.impersonation.actorName : session?.user?.name
  const isAdmin = session?.user?.isAdmin
  const isManager = session?.user?.isManager

  useEffect(() => {
    if (!posthog.__loaded || status === 'loading') return

    if (status === 'unauthenticated' || !actorId) {
      if (posthog._isIdentified()) posthog.reset()
      return
    }

    // Role flags are only meaningful for the real user, not an impersonated one.
    const personProps: Record<string, unknown> = { name }
    if (email) personProps.email = email
    if (!impersonatingId) {
      personProps.role = isAdmin ? 'admin' : isManager ? 'manager' : 'employee'
    }

    if (posthog.get_distinct_id() !== actorId) {
      // A different user signed in without signing out: start fresh rather
      // than merging two people into one PostHog person.
      if (posthog._isIdentified()) posthog.reset()
      posthog.identify(actorId, personProps)
    } else {
      posthog.setPersonProperties(personProps)
    }

    if (impersonatingId) {
      posthog.register({ impersonating_user_id: impersonatingId })
    } else {
      posthog.unregister('impersonating_user_id')
    }
  }, [status, actorId, impersonatingId, email, name, isAdmin, isManager])

  return null
}
