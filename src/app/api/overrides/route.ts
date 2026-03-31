import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ManagerEmployeeRepository } from '@/lib/repositories/ManagerEmployeeRepository'
import { logger } from '@/lib/utils/logger'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

const managerEmployeeRepository = new ManagerEmployeeRepository()

/**
 * GET /api/overrides - Get list of managers with employee counts
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const managers = await managerEmployeeRepository.getManagers(userContext)
    const stats = await managerEmployeeRepository.getAssignmentStats(userContext)

    return NextResponse.json({
      managers,
      stats
    })
  } catch (error) {
    logger.error('Error fetching managers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    )
  }
}
