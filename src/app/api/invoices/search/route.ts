import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { invoiceAuditRepository, InvoiceAuditSearchFilters } from '@/lib/repositories/InvoiceAuditRepository'

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

    // Only allow managers and admins to search invoices
    if (!session.user.isManager && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Manager or Admin access required.' },
        { status: 403 }
      )
    }

    const body = await request.json() as InvoiceAuditSearchFilters

    // For managers, restrict to their assigned agents only
    if (!session.user.isAdmin && session.user.isManager) {
      // If specific agentIds provided, validate they're assigned to this manager
      if (body.agentIds && body.agentIds.length > 0) {
        // Here you would typically check against manager_employees table
        // For now, we'll pass through but in production you'd validate:
        // const assignedAgents = await getManagerAssignedAgents(session.user.employeeId)
        // body.agentIds = body.agentIds.filter(id => assignedAgents.includes(id))
      } else if (body.agentId) {
        // Similar validation for single agent
        // const assignedAgents = await getManagerAssignedAgents(session.user.employeeId)
        // if (!assignedAgents.includes(body.agentId)) {
        //   return NextResponse.json({ error: 'Access denied to this agent' }, { status: 403 })
        // }
      }
    }

    // Perform the search
    const results = await invoiceAuditRepository.searchAuditRecords(body)

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Error searching invoice audit records:', error)
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

    // Only allow managers and admins
    if (!session.user.isManager && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Manager or Admin access required.' },
        { status: 403 }
      )
    }

    // Get summary statistics for the dashboard
    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    
    // For managers, get stats for their assigned agents only
    const agentIds: number[] | undefined = undefined
    if (!session.user.isAdmin && session.user.isManager) {
      // In production, you'd get assigned agents:
      // agentIds = await getManagerAssignedAgents(session.user.employeeId)
    }

    const summary = await invoiceAuditRepository.getAuditSummary(agentIds, dateFrom, dateTo)
    const recentActivity = await invoiceAuditRepository.getRecentAuditActivity(agentIds, 10)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        recentActivity
      }
    })

  } catch (error) {
    console.error('Error getting search page resources:', error)
    return NextResponse.json(
      { error: 'Failed to load search resources' },
      { status: 500 }
    )
  }
}