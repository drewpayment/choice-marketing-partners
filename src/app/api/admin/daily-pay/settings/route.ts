import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const updateSchema = z.object({
  isAutoCutoffEnabled: z.boolean().optional(),
  cutoffDayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  cutoffTimeLocal: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  cutoffTimezone: z.string().min(1).max(64).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const settings = await dailyPayRepository.getSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    logger.error('Error fetching daily-pay settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const body = (await request.json()) as unknown
    const parsed = updateSchema.parse(body)
    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    const settings = await dailyPayRepository.updateSettings(parsed, ctx)
    return NextResponse.json({ settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update settings'
    logger.error('Error updating daily-pay settings:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
