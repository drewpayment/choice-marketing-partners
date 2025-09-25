'use client'

import { usePostHogIdentify } from '@/hooks/usePostHogIdentify'

/**
 * Component that handles PostHog user identification
 * Include this component in your authenticated layout or pages
 * to automatically identify users when they log in
 */
export function PostHogIdentity() {
  usePostHogIdentify()
  return null
}