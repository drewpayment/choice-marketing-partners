import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

/**
 * `/manager` is an orphaned stub: nothing in the app's navigation links to it,
 * and its three primary cards pointed at /manager/employees, /manager/payroll
 * and /manager/reports, none of which exist. It was only ever reachable via the
 * post-sign-in redirect, which now sends managers to /dashboard — where their
 * own pay and the route into their team's pay live.
 *
 * The route is kept (rather than deleted) so existing bookmarks land somewhere
 * useful, and it keeps its auth guards so it never becomes an open redirect for
 * unauthenticated or unauthorized visitors.
 */
export default async function ManagerPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (!session.user.isAdmin && !session.user.isManager) {
    redirect('/forbidden')
  }

  redirect('/dashboard')
}
