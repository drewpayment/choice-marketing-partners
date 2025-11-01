'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { PostHogIdentity } from './posthog-identity'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <PostHogIdentity />
      {children}
    </SessionProvider>
  )
}
