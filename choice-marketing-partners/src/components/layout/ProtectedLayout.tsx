import Link from 'next/link'
import { requireAuth } from '@/lib/auth/utils'
import SignOutButton from './SignOutButton'

interface NavigationProps {
  user: {
    name?: string | null
    email?: string | null
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
  }
}

function Navigation({ user }: NavigationProps) {
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
      href: '/admin',
      label: 'Admin Portal',
      show: user.isAdmin
    }
  ].filter(item => item.show)

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Choice Marketing Partners
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user.name} ({user.isAdmin ? 'Admin' : user.isManager ? 'Manager' : 'Employee'})
                </span>
                <SignOutButton className='border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left' />
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
            >
              {item.label}
            </Link>
          ))}
          <SignOutButton className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left">
            Sign Out
          </SignOutButton>
        </div>
      </div>
    </nav>
  )
}

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={session.user} />
      <main>{children}</main>
    </div>
  )
}
