import { requireAuth } from '@/lib/auth/utils'
import { ClientNavigation } from './ClientNavigation'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation user={session.user} />
      <main>{children}</main>
    </div>
  )
}
