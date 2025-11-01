import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

/**
 * DELETE /api/invoices/[id] - Delete single invoice
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    // Invoice management requires admin access for deletions
    if (!userContext.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get invoice ID from params
    const params = await context.params
    const invoiceId = parseInt(params.id)
    
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      )
    }

    // Delete invoice with audit trail
    const success = await invoiceRepository.deleteInvoice(
      invoiceId,
      session.user.employeeId, // deletedBy
      'Invoice deleted via web interface', // reason
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown' // ipAddress
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
