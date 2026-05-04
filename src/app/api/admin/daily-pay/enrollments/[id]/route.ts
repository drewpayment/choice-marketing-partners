import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { dailyPayRepository } from '@/lib/repositories/DailyPayRepository'
import { db } from '@/lib/database/client'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const updateSchema = z.object({
  dailyRate: z.coerce.number().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { id } = await params
    const enrollmentId = parseInt(id, 10)
    if (Number.isNaN(enrollmentId)) {
      return NextResponse.json({ error: 'Invalid enrollment id' }, { status: 400 })
    }
    const body = (await request.json()) as unknown
    const parsed = updateSchema.parse(body)

    const existing = await db
      .selectFrom('daily_pay_enrollments')
      .select(['employee_id', 'vendor_id', 'daily_rate'])
      .where('id', '=', enrollmentId)
      .executeTakeFirst()
    if (!existing) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    await dailyPayRepository.upsertEnrollment(
      {
        employeeId: existing.employee_id,
        vendorId: existing.vendor_id,
        dailyRate:
          parsed.dailyRate !== undefined ? parsed.dailyRate : parseFloat(String(existing.daily_rate)),
        isActive: parsed.isActive,
      },
      ctx,
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update enrollment'
    logger.error('Error updating enrollment:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { id } = await params
    const enrollmentId = parseInt(id, 10)
    if (Number.isNaN(enrollmentId)) {
      return NextResponse.json({ error: 'Invalid enrollment id' }, { status: 400 })
    }
    const ctx = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager,
    )
    await dailyPayRepository.deactivateEnrollment(enrollmentId, ctx)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate enrollment'
    logger.error('Error deactivating enrollment:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
