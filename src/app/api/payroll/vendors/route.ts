import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getAccessibleVendors } from '@/lib/auth/payroll-access'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
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

    const vendors = await getAccessibleVendors(userContext)
    
    return NextResponse.json(vendors)
  } catch (error) {
    logger.error('Error fetching accessible vendors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
