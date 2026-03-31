import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ManagerEmployeeRepository } from '@/lib/repositories/ManagerEmployeeRepository'
import { logger } from '@/lib/utils/logger'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

const managerEmployeeRepository = new ManagerEmployeeRepository()

/**
 * GET /api/overrides/[id] - Get manager details with assigned employees
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const managerId = parseInt(id)
    if (isNaN(managerId)) {
      return NextResponse.json({ error: 'Invalid manager ID' }, { status: 400 })
    }

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const manager = await managerEmployeeRepository.getManagerWithEmployees(managerId, userContext)

    if (!manager) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
    }

    const availableEmployees = await managerEmployeeRepository.getAvailableEmployees(userContext)
    const unassignedEmployees = await managerEmployeeRepository.getUnassignedEmployees(userContext)

    return NextResponse.json({
      manager,
      availableEmployees,
      unassignedEmployees
    })
  } catch (error) {
    logger.error('Error fetching manager details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manager details' },
      { status: 500 }
    )
  }
}
