import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user context
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const payrollRepository = new PayrollRepository()
    
    // Test with no filters
    const result = await payrollRepository.getPayrollSummary({}, userContext)
    
    return NextResponse.json({
      userContext,
      pagination: result.pagination,
      dataLength: result.data.length,
      actualData: result.data.slice(0, 3) // Just first 3 for debugging
    })
  } catch (error) {
    logger.error('Debug count error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
