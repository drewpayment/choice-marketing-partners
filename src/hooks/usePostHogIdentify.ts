'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { identifyUser, resetUser } from '@/components/posthog-provider'

/**
 * Hook to automatically identify users to PostHog based on their NextAuth session
 * This will associate all PostHog events and session replays with the authenticated user
 */
export function usePostHogIdentify() {
  const sessionResult = useSession()
  const hasIdentified = useRef(false)
  const lastUserId = useRef<string | null>(null)
  
  // Safely destructure session data
  const session = sessionResult?.data
  const status = sessionResult?.status

  useEffect(() => {
    // Only run on client side and when PostHog is available
    if (typeof window === 'undefined' || !session || !status) return

    // User is authenticated and we have session data
    if (status === 'authenticated' && session?.user) {
      const currentUserId = session.user.id
      
      // Only identify if we haven't already identified this user, or if the user changed
      if (!hasIdentified.current || lastUserId.current !== currentUserId) {
        // Construct user properties for PostHog
        const userProperties = {
          email: session.user.email,
          name: session.user.name,
          isAdmin: session.user.isAdmin,
          isManager: session.user.isManager,
          isActive: session.user.isActive,
          ...(session.user.employeeId && { employeeId: session.user.employeeId }),
          salesIds: session.user.salesIds,
        }

        // Identify the user to PostHog
        identifyUser(currentUserId, userProperties)
        
        hasIdentified.current = true
        lastUserId.current = currentUserId
        
        console.log('PostHog: User identified', { userId: currentUserId, email: session.user.email })
      }
    } 
    // User is not authenticated
    else if (status === 'unauthenticated') {
      // Reset PostHog if user was previously identified but is now logged out
      if (hasIdentified.current) {
        resetUser()
        hasIdentified.current = false
        lastUserId.current = null
        console.log('PostHog: User reset after logout')
      }
    }
  }, [session, status])

  return { isIdentified: hasIdentified.current }
}