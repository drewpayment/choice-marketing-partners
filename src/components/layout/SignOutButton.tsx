'use client'

import { signOut } from 'next-auth/react'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
      className={className}
    >
      {children || 'Sign Out'}
    </button>
  )
}
