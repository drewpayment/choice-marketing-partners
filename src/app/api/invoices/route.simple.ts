import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository.simple'
import { logger } from '@/lib/utils/logger'

/**
 * Simplified POST /api/invoices - Just save invoice data for testing
 */
export async function POST(request: NextRequest) {
  logger.log('🚀 API POST /api/invoices - Simplified version')
  
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
    logger.log('📝 Request body:', JSON.stringify(body, null, 2))

    // Save invoice data using simplified repository
    const result = await invoiceRepository.saveInvoiceData(body)
    
    logger.log('✅ Save result:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Invoice data saved successfully',
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
 * Simple GET for testing - just return a basic response
 */
export async function GET() {
  return NextResponse.json({
    message: 'Simplified Invoice API - only POST is implemented for testing',
    endpoints: {
      POST: 'Save invoice data'
    }
  })
}