import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { logger } from '@/lib/utils/logger'

export async function GET(
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

    const repo = new PayrollRepository()
    const preview = await repo.previewPaystubDeletion(agentId, vendorId, issueDate, {
      employeeId: session.user.employeeId,
      isAdmin: session.user.isAdmin,
      isManager: session.user.isManager,
    })

    return NextResponse.json(preview)
  } catch (error) {
    logger.error('Error previewing pay statement deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
