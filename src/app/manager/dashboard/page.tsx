import { requireAuth } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'

/**
 * `/manager/dashboard` was the page managers actually landed on after sign-in,
 * via a `/manager` → `/manager/dashboard` rewrite in next.config.ts. It was a
 * stub whose links pointed at /manager/team, /manager/approvals, /manager/jobs,
 * /manager/payroll, /manager/reports and /manager/schedule — none of which
 * exist. Managers now land on /dashboard, where their own pay and the route
 * into their team's pay live.
 *
 * Kept (rather than deleted) so existing bookmarks land somewhere useful, and
 * it keeps its auth guards so it never becomes an open redirect. Mirrors
 * `/manager`, which redirects the same way.
 */
export default async function ManagerDashboard() {
  const session = await requireAuth()

  if (!session.user.isManager && !session.user.isAdmin) {
    redirect('/forbidden')
  }

  redirect('/dashboard')
}
