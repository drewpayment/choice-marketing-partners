import { requireAuth } from '@/lib/auth/utils'
import ProtectedLayout from '@/components/layout/ProtectedLayout'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is authenticated for all portal pages
  await requireAuth()

  return (
    <ProtectedLayout>
      {children}
    </ProtectedLayout>
  )
}
