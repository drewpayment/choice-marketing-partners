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
  return 500
}

/**
 * GET /api/scheduled-expenses/due?agentId=&vendorId=&wkending=YYYY-MM-DD
 * Returns active recurring templates whose cadence lands in the statement week
 * ending `wkending` (admin/manager). Wave 2's statement builder calls this to
 * materialize concrete expense rows.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId') ? parseInt(searchParams.get('agentId')!) : NaN
    const vendorId = searchParams.get('vendorId') ? parseInt(searchParams.get('vendorId')!) : NaN
    const wkending = searchParams.get('wkending')

    if (isNaN(agentId) || isNaN(vendorId) || !wkending) {
      return NextResponse.json(
        { error: 'Missing or invalid required query params: agentId, vendorId, wkending (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const data = await scheduledExpenseRepository.getDueTemplates(agentId, vendorId, wkending, userContext)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ GET /api/scheduled-expenses/due error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}
