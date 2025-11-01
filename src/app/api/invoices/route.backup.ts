import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository.simple'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

/**
 * GET /api/invoices - Get invoice page resources (agents, vendors, issue dates)
 */
export async function GET() {
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

    // Get invoice page resources
    const resources = await invoiceRepository.getInvoicePageResources()

    return NextResponse.json({
      success: true,
      data: resources
    })
  } catch (error) {
    console.error('Error fetching invoice resources:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoices - Save invoice data (sales, overrides, expenses)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Invoice API - POST request received')
    const session = await getServerSession(authOptions)
    console.log('👤 Invoice API - Session details:', { 
      hasSession: !!session,
      hasUser: !!session?.user,
      employeeId: session?.user?.employeeId, 
      isAdmin: session?.user?.isAdmin,
      isManager: session?.user?.isManager,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    })
    
    if (!session?.user?.employeeId) {
      console.error('❌ Invoice API - Unauthorized: No employeeId in session')
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

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.agentId || !body.vendor || !body.issueDate || !body.weekending) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, vendor, issueDate, weekending' },
        { status: 400 }
      )
    }

    // Validate arrays exist
    if (!Array.isArray(body.sales) || !Array.isArray(body.overrides) || !Array.isArray(body.expenses)) {
      return NextResponse.json(
        { error: 'sales, overrides, and expenses must be arrays' },
        { status: 400 }
      )
    }

    // Transform form data to repository format
    const saveRequest = {
      agentId: body.agentId,
      vendorId: parseInt(body.vendor), // Convert vendor string to vendorId number
      issueDate: body.issueDate,
      weekending: body.weekending,
      // Add audit information
      changedBy: session.user.employeeId || 0, // Fallback to 0 if undefined
      changeReason: body.changeReason || 'Invoice update via web interface',
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      sales: body.sales.map((sale: {
        invoiceId?: number;
        sale_date: string;
        first_name: string;
        last_name: string;
        address: string;
        city: string;
        status: string;
        amount: number;
      }) => ({
        invoiceId: sale.invoiceId,
        saleDate: sale.sale_date,
        firstName: sale.first_name,
        lastName: sale.last_name,
        address: sale.address,
        city: sale.city,
        status: sale.status,
        amount: sale.amount
      })),
      overrides: body.overrides.map((override: {
        overrideId?: number;
        name: string;
        sales: number;
        commission: number;
        total: number;
      }) => ({
        overrideId: override.overrideId,
        name: override.name,
        sales: override.sales,
        commission: override.commission,
        total: override.total
      })),
      expenses: body.expenses.map((expense: {
        expenseId?: number;
        type: string;
        amount: number;
        notes: string;
      }) => ({
        expenseId: expense.expenseId,
        type: expense.type,
        amount: expense.amount,
        notes: expense.notes
      }))
    }

    // Save invoice data
    console.log('💾 Invoice API - About to save with request:', {
      agentId: saveRequest.agentId,
      vendorId: saveRequest.vendorId,
      changedBy: saveRequest.changedBy,
      salesCount: saveRequest.sales.length
    })
    
    const result = await invoiceRepository.saveInvoiceData(saveRequest)
    console.log('✅ Invoice API - Save successful')

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('❌ Invoice API - Error saving invoice data:', error)
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/invoices?ids=1,2,3 - Bulk delete invoices
 */
export async function DELETE(request: NextRequest) {
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

    // Get invoice IDs from query parameter
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids query parameter' },
        { status: 400 }
      )
    }

    // Parse invoice IDs
    const invoiceIds = idsParam.split(',').map(id => {
      const parsed = parseInt(id.trim())
      if (isNaN(parsed)) {
        throw new Error(`Invalid invoice ID: ${id}`)
      }
      return parsed
    })

    if (invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid invoice IDs provided' },
        { status: 400 }
      )
    }

    // Delete invoices with audit trail
    const result = await invoiceRepository.deleteInvoices(
      invoiceIds,
      session.user.employeeId, // deletedBy
      'Bulk invoice deletion via web interface', // reason
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown' // ipAddress
    )

    if (result.deletedCount !== result.expectedCount) {
      return NextResponse.json({
        success: false,
        error: `Expected to delete ${result.expectedCount} records, but only deleted ${result.deletedCount}`,
        data: result
      }, { status: 206 }) // Partial success
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error deleting invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
