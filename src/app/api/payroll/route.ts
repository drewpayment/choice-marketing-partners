import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (!session.user.isAdmin && !session.user.isManager)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    
    // Extract filters from query parameters
    const filters = {
      employeeId: searchParams.get('employeeId') ? parseInt(searchParams.get('employeeId')!) : undefined,
      vendorId: searchParams.get('vendorId') ? parseInt(searchParams.get('vendorId')!) : undefined,
      issueDate: searchParams.get('issueDate') || undefined,
      status: searchParams.get('status') as 'paid' | 'unpaid' | 'all' || 'all',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    }

    // Get user context
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const repository = new PayrollRepository()
    const result = await repository.getPayrollSummary(filters, userContext)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Payroll API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll data' },
      { status: 500 }
    )
  }
}
