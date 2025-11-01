'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to safely check if we're on the client side.
 * This helps prevent hydration mismatches caused by browser extensions
 * or other client-side only features.
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}
