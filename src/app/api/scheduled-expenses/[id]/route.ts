import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { ScheduledExpenseRepository } from '@/lib/repositories/ScheduledExpenseRepository'
import { logger } from '@/lib/utils/logger'

const scheduledExpenseRepository = new ScheduledExpenseRepository()

function errorStatus(message: string): number {
  if (message.includes('Insufficient permissions')) return 403
  if (message.includes('Access denied')) return 403
  if (message.includes('not found')) return 404
  if (message.includes('Invalid frequency')) return 400
  return 500
}

/**
 * PATCH /api/scheduled-expenses/[id] — update a template (admin/manager).
 * Body: subset of { type, amount, notes, frequency, startDate, endDate, isActive }.
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
    const templateId = parseInt(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template id' }, { status: 400 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const body = await request.json()
    const { type, amount, notes, frequency, startDate, endDate, isActive } = body

    const updated = await scheduledExpenseRepository.updateTemplate(
      templateId,
      {
        type,
        amount: amount != null ? Number(amount) : undefined,
        notes,
        frequency,
        startDate,
        endDate,
        isActive,
      },
      userContext
    )

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ PATCH /api/scheduled-expenses/[id] error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}

/**
 * DELETE /api/scheduled-expenses/[id] — delete a template (admin/manager).
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
    const templateId = parseInt(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template id' }, { status: 400 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const result = await scheduledExpenseRepository.deleteTemplate(templateId, userContext)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ DELETE /api/scheduled-expenses/[id] error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}
