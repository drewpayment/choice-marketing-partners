import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )

    const [todayPunches, enrollments] = await Promise.all([
      dailyPayRepository.getTodayPunches(ctx),
      dailyPayRepository.getEnrollmentsForEmployee(session.user.employeeId, ctx),
    ])

    const recent = await dailyPayRepository.getRecentPunchesForEmployee(
      session.user.employeeId,
      5,
      ctx,
    )

    return NextResponse.json({
      todayPunches,
      recentPunches: recent,
      enrollments: enrollments.filter((e) => e.isActive),
    })
  } catch (error) {
    logger.error('Error fetching today punches:', error)
    return NextResponse.json({ error: 'Failed to load today punches' }, { status: 500 })
  }
}
