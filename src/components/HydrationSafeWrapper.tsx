'use client'

import { ReactNode } from 'react'
import { useIsClient } from '@/hooks/useIsClient'

interface HydrationSafeWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
}

/**
 * A wrapper component that prevents hydration mismatches by only rendering 
 * children on the client side. Useful for components that interact with 
 * browser extensions or other client-only features.
 */
export function HydrationSafeWrapper({ 
  children, 
  fallback, 
  className 
}: HydrationSafeWrapperProps) {
  const isClient = useIsClient()

  if (!isClient) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <div className={className} suppressHydrationWarning={true}>
      {children}
    </div>
  )
}
