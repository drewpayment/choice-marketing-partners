import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { logger } from '@/lib/utils/logger'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; vendorId: string; issueDate: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = await context.params
    const agentId = parseInt(params.agentId)
    const vendorId = parseInt(params.vendorId)
    const issueDate = params.issueDate

    if (isNaN(agentId) || isNaN(vendorId) || !issueDate) {
      return NextResponse.json(
        { error: 'Invalid parameters: agentId, vendorId, and issueDate are required' },
        { status: 400 }
      )
    }

    if (!session.user.employeeId) {
      return NextResponse.json(
        { error: 'Admin employee record not found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'A deletion reason is required' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const repo = new PayrollRepository()
    const result = await repo.deletePaystubWithAudit(
      agentId,
      vendorId,
      issueDate,
      {
        employeeId: session.user.employeeId,
        isAdmin: session.user.isAdmin,
        isManager: session.user.isManager,
      },
      session.user.employeeId,
      reason,
      ipAddress
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      auditId: result.auditId,
    })
  } catch (error) {
    logger.error('Error deleting pay statement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
