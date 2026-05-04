import { Suspense } from 'react'
import { requireAuth } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import PunchInClient from './punch-in-client'

export const dynamic = 'force-dynamic'

export default async function PunchInPage() {
  const session = await requireAuth()
  const employeeId = session.user.employeeId

  if (!employeeId) {
    redirect('/dashboard')
  }

  const ctx = await getEmployeeContext(
    employeeId,
    session.user.isAdmin,
    session.user.isManager,
  )

  const [enrollmentsAll, todayPunches, recentPunches, settings] = await Promise.all([
    dailyPayRepository.getEnrollmentsForEmployee(employeeId, ctx),
    dailyPayRepository.getTodayPunches(ctx),
    dailyPayRepository.getRecentPunchesForEmployee(employeeId, 5, ctx),
    dailyPayRepository.getSettings(),
  ])

  const enrollments = enrollmentsAll
    .filter((e) => e.isActive)
    .map((e) => ({
      id: e.id,
      vendorId: e.vendorId,
      vendorName: e.vendorName,
      dailyRate: e.dailyRate,
      lastPunchAt: e.lastPunchAt ? e.lastPunchAt.toISOString() : null,
    }))

  const initialPayload = {
    employeeName: session.user.name ?? '',
    enrollments,
    timezone: settings.cutoffTimezone,
    todayPunches: todayPunches.map((p) => ({
      id: p.id,
      vendorName: p.vendorName,
      punchedAt: p.punchedAt.toISOString(),
      status: p.status,
      amount: p.amount,
    })),
    recentPunches: recentPunches.map((p) => ({
      id: p.id,
      vendorName: p.vendorName,
      punchedAt: p.punchedAt.toISOString(),
      workDate: p.workDate,
      status: p.status,
      amount: p.amount,
    })),
  }

  return (
    <Suspense fallback={null}>
      <PunchInClient initial={initialPayload} />
    </Suspense>
  )
}
