import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { ScheduledExpenseRepository } from '@/lib/repositories/ScheduledExpenseRepository'
import { logger } from '@/lib/utils/logger'
import dayjs from 'dayjs'

const scheduledExpenseRepository = new ScheduledExpenseRepository()

function errorStatus(message: string): number {
  if (message.includes('Insufficient permissions')) return 403
  if (message.includes('Access denied')) return 403
  if (message.includes('not found')) return 404
  if (message.includes('Invalid frequency')) return 400
  if (message.includes('Invalid monthly_weekday')) return 400
  return 500
}

/**
 * GET /api/scheduled-expenses?agentId=&vendorId=&activeOnly=
 *
 * Two modes:
 *  - agentId provided → list templates for that single agent (role-filtered,
 *    unchanged legacy behavior — an employee may read their own).
 *  - agentId ABSENT → admin overview: ALL templates (admin) or the manager's
 *    direct reports (manager), each enriched with agent_name, vendor_name,
 *    last_applied and next_due. Plain employees get 403.
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
    const agentIdParam = searchParams.get('agentId')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // Overview mode: no agentId → return the enriched template list.
    if (!agentIdParam) {
      const data = await scheduledExpenseRepository.getAllTemplates(userContext, {
        activeOnly,
        today: dayjs().format('YYYY-MM-DD'),
      })
      return NextResponse.json({ success: true, data })
    }

    const agentId = parseInt(agentIdParam)
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
    }

    const data = await scheduledExpenseRepository.getTemplatesByAgent(agentId, userContext, {
      vendorId: searchParams.get('vendorId') ? parseInt(searchParams.get('vendorId')!) : undefined,
      activeOnly,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ GET /api/scheduled-expenses error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}

/**
 * POST /api/scheduled-expenses — create a template (admin/manager).
 * Body: { agentId, vendorId, type, amount, frequency, startDate, endDate?, notes?, isActive? }.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { agentId, vendorId, type, amount, frequency, monthlyWeek, monthlyWeekday, startDate, endDate, notes, isActive } = body

    if (agentId == null || vendorId == null || !type || amount == null || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, vendorId, type, amount, frequency, startDate' },
        { status: 400 }
      )
    }

    const created = await scheduledExpenseRepository.createTemplate(
      {
        agentid: Number(agentId),
        vendorId: Number(vendorId),
        type,
        amount: Number(amount),
        frequency,
        monthlyWeek: monthlyWeek != null ? Number(monthlyWeek) : null,
        monthlyWeekday: monthlyWeekday != null ? Number(monthlyWeekday) : null,
        startDate,
        endDate: endDate ?? null,
        notes,
        isActive,
      },
      userContext
    )

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ POST /api/scheduled-expenses error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}
