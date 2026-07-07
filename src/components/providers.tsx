'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        {/* Mounted inside ThemeProvider so Sonner reads the active theme.
            Bottom placement keeps toasts clear of sticky top mobile headers. */}
        <Toaster position="bottom-center" richColors closeButton />
      </ThemeProvider>
    </SessionProvider>
  )
}
