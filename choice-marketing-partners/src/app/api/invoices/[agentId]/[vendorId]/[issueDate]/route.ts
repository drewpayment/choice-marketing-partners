import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

/**
 * GET /api/invoices/[agentId]/[vendorId]/[issueDate] - Get invoice details for editing
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; vendorId: string; issueDate: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user context and check permissions
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    // Invoice management requires manager or admin access
    if (!userContext.isAdmin && !userContext.isManager) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get params
    const params = await context.params
    const agentId = parseInt(params.agentId)
    const vendorId = parseInt(params.vendorId)
    const issueDate = params.issueDate

    console.log('🔍 API Route - Parsed params:', { agentId, vendorId, issueDate })

    if (isNaN(agentId) || isNaN(vendorId)) {
      console.error('❌ API Route - Invalid parameters:', { agentId: params.agentId, vendorId: params.vendorId })
      return NextResponse.json(
        { error: 'Invalid agent ID or vendor ID' },
        { status: 400 }
      )
    }

    console.log('✅ API Route - Calling invoiceRepository.getInvoiceDetail')
    // Get invoice details
    const details = await invoiceRepository.getInvoiceDetail(agentId, vendorId, issueDate)
    console.log('📊 API Route - Repository result:', details)

    if (!details) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: details
    })
  } catch (error) {
    console.error('Error fetching invoice details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
