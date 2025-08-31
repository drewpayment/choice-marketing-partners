import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository'
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
    const result = await invoiceRepository.saveInvoiceData(saveRequest)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error saving invoice data:', error)
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

    // Delete invoices
    const result = await invoiceRepository.deleteInvoices(invoiceIds)

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
