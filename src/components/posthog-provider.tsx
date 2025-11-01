'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

function PostHogPageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page views when pathname or search params change
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        $pathname: pathname,
      })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize PostHog on the client side
    if (typeof window !== 'undefined') {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: 'identified_only', // Only create profiles for identified users
          capture_pageview: false, // We'll capture pageviews manually
          capture_pageleave: true, // Track when users leave pages
          session_recording: {
            recordCrossOriginIframes: false, // Security consideration for iframe content
            maskAllInputs: false, // Set to true if you want to mask all form inputs by default
            maskInputOptions: {
              // Mask sensitive form fields by CSS selector
              password: true,
              email: false, // Change to true if you want to mask emails
            },
            // Optional: Configure which CSS selectors to always mask
            maskTextSelector: '[data-ph-mask]',
          },
          autocapture: {
            // Capture clicks, form submissions, etc.
            dom_event_allowlist: ['click', 'change', 'submit'],
          },
        })

        // Capture the initial pageview
        posthog.capture('$pageview')
      } else {
        console.warn('PostHog API key not found. Please set NEXT_PUBLIC_POSTHOG_KEY environment variable.')
      }
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      {children}
    </>
  )
}

// Utility function to identify users (call this after login)
export function identifyUser(userId: string, userProps?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.identify(userId, userProps)
  }
}

// Utility function to track custom events
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(eventName, properties)
  }
}

// Utility function to reset user (call this after logout)
export function resetUser() {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.reset()
  }
}