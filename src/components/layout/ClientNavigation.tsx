'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SignOutButton from './SignOutButton'
import { cn } from '@/lib/utils'

interface ClientNavigationProps {
  user: {
    name?: string | null
    email?: string | null
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
  }
}

export function ClientNavigation({ user }: ClientNavigationProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      show: true
    },
    {
      href: '/payroll',
      label: 'Payroll',
      show: true
    },
    {
      href: '/documents',
      label: 'Documents',
      show: true
    },
    {
      href: '/invoices',
      label: 'Invoices',
      show: user.isManager || user.isAdmin
    },
    {
      href: '/admin/invoice-search',
      label: 'Investigation',
      show: user.isManager || user.isAdmin
    },
    {
      href: '/admin',
      label: 'Admin Portal',
      show: user.isAdmin
    }
  ].filter(item => item.show)

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-foreground">
                Choice Marketing Partners
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {menuItems.map((item) => {
                const isActive = isActiveRoute(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {user.name} ({user.isAdmin ? 'Admin' : user.isManager ? 'Manager' : 'Employee'})
                </span>
                <SignOutButton className='border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left' />
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">{isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <SignOutButton className="border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left">
              Sign Out
            </SignOutButton>
          </div>
        </div>
      )}
    </nav>
  )
}