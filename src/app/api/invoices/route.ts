import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository.simple'
import { invoiceRepository as mainInvoiceRepository } from '@/lib/repositories/InvoiceRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/invoices - Get invoice page resources or invoice details
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const vendorId = searchParams.get('vendorId')
    const issueDate = searchParams.get('issueDate')

    // If specific parameters are provided, get invoice details
    if (agentId && vendorId && issueDate) {
      logger.log('📋 Getting invoice details for:', { agentId, vendorId, issueDate })
      const details = await invoiceRepository.getInvoiceDetail(
        parseInt(agentId),
        parseInt(vendorId),
        issueDate
      )
      
      return NextResponse.json({
        success: true,
        data: details
      })
    }

    // Otherwise, get page resources
    logger.log('📊 Getting invoice page resources')
    const resources = await invoiceRepository.getInvoicePageResources()

    return NextResponse.json({
      success: true,
      data: resources
    })
  } catch (error) {
    logger.error('❌ GET /api/invoices error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoices - Save invoice data with audit trail
 */
export async function POST(request: NextRequest) {
  logger.log('🚀 API POST /api/invoices - With audit trail')
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      logger.log('❌ No session or employee ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.log('👤 User session:', {
      employeeId: session.user.employeeId,
      isAdmin: session.user.isAdmin,
      isManager: session.user.isManager
    })

    const body = await request.json()
    logger.log('📝 Request body received')

    // Add audit metadata
    const requestWithAudit = {
      ...body,
      auditMetadata: {
        userId: session.user.employeeId,
        userEmail: session.user.email || '',
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    }

    // Save invoice data using simplified repository
    const result = await invoiceRepository.saveInvoiceData(requestWithAudit)

    logger.log('✅ Save result:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Invoice data saved successfully with audit trail',
      data: result
    })

  } catch (error) {
    logger.error('❌ POST /api/invoices error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save invoice data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/invoices - Delete entire paystub (all invoices, overrides, expenses, payroll record)
 * Body: { agentId, vendorId, issueDate }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { agentId, vendorId, issueDate } = body

    if (!agentId || !vendorId || !issueDate) {
      return NextResponse.json(
        { error: 'agentId, vendorId, and issueDate are required' },
        { status: 400 }
      )
    }

    const success = await mainInvoiceRepository.deletePaystub(agentId, vendorId, issueDate)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete paystub' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Paystub deleted successfully' })
  } catch (error) {
    logger.error('DELETE /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}