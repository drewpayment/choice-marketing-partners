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
  return 500
}

/**
 * GET /api/scheduled-expenses/[id]/applications
 * Application history for a template (read RBAC identical to the template itself).
 * Returns { data: [{ id, issue_date, wkending, amount, applied_at, applied_by_name }] }.
 */
export async function GET(
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

    const data = await scheduledExpenseRepository.getApplications(templateId, userContext)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ GET /api/scheduled-expenses/[id]/applications error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}
