import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const bodySchema = z.object({
  reason: z.string().max(2000).nullable().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { id } = await params
    const punchId = parseInt(id, 10)
    if (Number.isNaN(punchId)) {
      return NextResponse.json({ error: 'Invalid punch id' }, { status: 400 })
    }
    const body = (await request.json().catch(() => ({}))) as unknown
    const parsed = bodySchema.parse(body ?? {})
    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    await dailyPayRepository.declinePunch(punchId, { reason: parsed.reason ?? null }, ctx)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to decline punch'
    logger.error('Error declining punch:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
