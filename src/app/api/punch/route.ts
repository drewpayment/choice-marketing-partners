import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const punchSchema = z.object({
  vendorId: z.coerce.number().int().positive(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().int().min(0).max(100000),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = punchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid punch payload', issues: parsed.error.issues }, { status: 400 })
    }

    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null
    const userAgent = request.headers.get('user-agent') ?? null

    const result = await dailyPayRepository.createPunch(
      { ...parsed.data, ipAddress, userAgent },
      ctx,
    )
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record punch'
    if (message.includes('Not enrolled')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    logger.error('Error creating punch:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
