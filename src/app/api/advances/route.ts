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

/** Map repository RBAC/validation errors to HTTP status codes. */
function errorStatus(message: string): number {
  if (message.includes('Insufficient permissions')) return 403
  if (message.includes('Access denied')) return 403
  if (message.includes('not found')) return 404
  if (message.includes('greater than zero')) return 400
  return 500
}

/**
 * GET /api/advances?agentId=&vendorId=&issueDate=
 * List advances for an agent (role-filtered: employees see only their own).
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
    // Employees default to their own advances when no agentId is supplied.
    const agentId = agentIdParam ? parseInt(agentIdParam) : session.user.employeeId

    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
    }

    const filters = {
      vendorId: searchParams.get('vendorId') ? parseInt(searchParams.get('vendorId')!) : undefined,
      issueDate: searchParams.get('issueDate') || undefined,
      wkending: searchParams.get('wkending') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    }

    const data = await advanceRepository.getAdvancesByAgent(agentId, filters, userContext)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ GET /api/advances error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}

/**
 * POST /api/advances
 * Create an advance (admin/manager). Body: { agentId, vendorId, amount,
 * advanceDate, issueDate, wkending, method?, notes? }.
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
    const { agentId, vendorId, amount, advanceDate, issueDate, wkending, method, notes } = body

    if (
      agentId == null ||
      vendorId == null ||
      amount == null ||
      !advanceDate ||
      !issueDate ||
      !wkending
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, vendorId, amount, advanceDate, issueDate, wkending' },
        { status: 400 }
      )
    }

    const created = await advanceRepository.createAdvance(
      {
        agentid: Number(agentId),
        vendorId: Number(vendorId),
        amount: Number(amount),
        advanceDate,
        issueDate,
        wkending,
        method,
        notes,
      },
      userContext,
      { changedBy: session.user.employeeId, ipAddress: getIp(request) }
    )

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('❌ POST /api/advances error:', error)
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) })
  }
}
