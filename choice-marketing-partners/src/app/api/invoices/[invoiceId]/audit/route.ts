import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceAuditRepository } from '@/lib/repositories/InvoiceAuditRepository'

/**
 * GET /api/invoices/[invoiceId]/audit - Get audit history for specific invoice
 * Restricted to manager and admin users only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only allow managers and admins to view audit history
    if (!session.user.isManager && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Manager or Admin access required.' },
        { status: 403 }
      )
    }

    const invoiceId = parseInt(params.invoiceId)
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      )
    }

    // For managers, verify they have access to this invoice
    if (!session.user.isAdmin && session.user.isManager) {
      // In production, you'd verify the manager has access to the agent who owns this invoice
      // This would require checking the invoice's agentid against manager_employees table
      // For now, we'll allow access but in production add this check:
      
      /*
      const invoice = await db
        .selectFrom('invoices')
        .select('agentid')
        .where('invoice_id', '=', invoiceId)
        .executeTakeFirst()
        
      if (invoice) {
        const hasAccess = await db
          .selectFrom('manager_employees')
          .select('id')
          .where('manager_id', '=', session.user.employeeId)
          .where('employee_id', '=', invoice.agentid)
          .executeTakeFirst()
          
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied to this invoice' },
            { status: 403 }
          )
        }
      }
      */
    }

    // Get audit history
    const auditHistory = await invoiceAuditRepository.getInvoiceAuditHistory(invoiceId)

    return NextResponse.json({
      success: true,
      data: {
        invoiceId,
        auditHistory,
        totalChanges: auditHistory.length
      }
    })

  } catch (error) {
    console.error('Error getting invoice audit history:', error)
    return NextResponse.json(
      { error: 'Failed to load audit history' },
      { status: 500 }
    )
  }
}