import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceAuditRepository, InvoiceAuditSearchFilters } from '@/lib/repositories/InvoiceAuditRepository'
import { logger } from '@/lib/utils/logger'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

/**
 * POST /api/invoices/search - Search invoices with audit history
 * Restricted to manager and admin users only
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only allow admins to search invoice audit records
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json() as InvoiceAuditSearchFilters

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    // Perform the search
    const results = await invoiceAuditRepository.searchAuditRecords(body, userContext)

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    logger.error('Error searching invoice audit records:', error)
    return NextResponse.json(
      { error: 'Failed to search invoice records' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invoices/search - Get resources for search page
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only allow admins to view audit search dashboard
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get summary statistics for the dashboard
    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const agentIds: number[] | undefined = undefined

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const summary = await invoiceAuditRepository.getAuditSummary(agentIds, dateFrom, dateTo, userContext)
    const recentActivity = await invoiceAuditRepository.getRecentAuditActivity(agentIds, 10, userContext)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        recentActivity
      }
    })

  } catch (error) {
    logger.error('Error getting search page resources:', error)
    return NextResponse.json(
      { error: 'Failed to load search resources' },
      { status: 500 }
    )
  }
}