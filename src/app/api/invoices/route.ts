import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository.simple'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

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
      console.log('📋 Getting invoice details for:', { agentId, vendorId, issueDate })
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
    console.log('📊 Getting invoice page resources')
    const resources = await invoiceRepository.getInvoicePageResources()

    return NextResponse.json({
      success: true,
      data: resources
    })
  } catch (error) {
    console.error('❌ GET /api/invoices error:', error)
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
  console.log('🚀 API POST /api/invoices - With audit trail')
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      console.log('❌ No session or employee ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 User session:', {
      employeeId: session.user.employeeId,
      isAdmin: session.user.isAdmin,
      isManager: session.user.isManager
    })

    const body = await request.json()
    console.log('📝 Request body received')

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
    
    console.log('✅ Save result:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Invoice data saved successfully with audit trail',
      data: result
    })

  } catch (error) {
    console.error('❌ POST /api/invoices error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save invoice data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}