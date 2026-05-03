import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import DailyPaySubNav from './sub-nav'

export const dynamic = 'force-dynamic'

export default async function DailyPayLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  let pendingCount = 0
  if (session?.user?.isAdmin) {
    try {
      const ctx = await getEmployeeContext(
        session.user.employeeId,
        session.user.isAdmin,
        session.user.isManager,
      )
      const result = await dailyPayRepository.getPunches({ status: 'pending', limit: 1 }, ctx)
      pendingCount = result.counts.pending
    } catch {
      pendingCount = 0
    }
  }

  return (
    <div className="px-6 py-6">
      <DailyPaySubNav pendingCount={pendingCount} />
      {children}
    </div>
  )
}
