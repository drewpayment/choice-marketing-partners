'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to check a feature flag on the client.
 * Returns null while loading, then boolean.
 */
export function useFeatureFlag(flagName: string): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/feature-flags/${encodeURIComponent(flagName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEnabled(!!data.enabled)
      })
      .catch(() => {
        if (!cancelled) setEnabled(false)
      })
    return () => { cancelled = true }
  }, [flagName])

  return enabled
}
