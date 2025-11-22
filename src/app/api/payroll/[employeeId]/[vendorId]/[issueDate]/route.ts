import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string; vendorId: string; issueDate: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const employeeId = parseInt(resolvedParams.employeeId)
    const vendorId = parseInt(resolvedParams.vendorId)
    const issueDate = resolvedParams.issueDate

    if (isNaN(employeeId) || isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid employee or vendor ID' }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(issueDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    const repository = new PayrollRepository()
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin || false,
      session.user.isManager || false
    )

    const paystubDetail = await repository.getPaystubDetail(
      employeeId,
      vendorId,
      issueDate,
      userContext
    )

    if (!paystubDetail) {
      return NextResponse.json({ error: 'Paystub not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(paystubDetail)

  } catch (error) {
    logger.error('Payroll detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
