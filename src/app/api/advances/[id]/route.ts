import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { AdvanceRepository } from '@/lib/repositories/AdvanceRepository'
import { logger } from '@/lib/utils/logger'

const advanceRepository = new AdvanceRepository()

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function errorStatus(message: string): number {
  if (message.includes('Insufficient permissions')) return 403
  if (message.includes('Access denied')) return 403
  if (message.includes('not found')) return 404
  if (message.includes('greater than zero')) return 400
  return 500
}

/**
 * PATCH /api/advances/[id] — update an advance (admin/manager).
 * Body: any subset of { amount, advanceDate, issueDate, wkending, method, notes, reason }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const advanceId = parseInt(id)
    if (isNaN(advanceId)) {
      return NextResponse.json({ error: 'Invalid advance id' }, { status: 400 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const body = await request.json()
    const { amount, advanceDate, issueDate, wkending, method, notes, reason } = body

    const updated = await advanceRepository.updateAdvance(
      advanceId,
      {
        amount: amount != null ? Number(amount) : undefined,
        advanceDate,
        issueDate,
        wkending,
        method,
        notes,
      },
      userContext,
      { changedBy: session.user.employeeId, ipAddress: getIp(request), reason }
    )

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ PATCH /api/advances/[id] error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}

/**
 * DELETE /api/advances/[id] — delete an advance (admin/manager).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const advanceId = parseInt(id)
    if (isNaN(advanceId)) {
      return NextResponse.json({ error: 'Invalid advance id' }, { status: 400 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || undefined

    const result = await advanceRepository.deleteAdvance(advanceId, userContext, {
      changedBy: session.user.employeeId,
      ipAddress: getIp(request),
      reason,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ DELETE /api/advances/[id] error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}
