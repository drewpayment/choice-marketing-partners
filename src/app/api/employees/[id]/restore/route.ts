import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { logger } from '@/lib/utils/logger'

const employeeRepository = new EmployeeRepository()

/**
 * PUT /api/employees/[id]/restore - Restore a soft-deleted employee
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const employeeId = parseInt(params.id)
    if (isNaN(employeeId)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 })
    }

    const success = await employeeRepository.restoreEmployee(employeeId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to restore employee or employee not found' },
        { status: 500 }
      )
    }

    const restoredEmployee = await employeeRepository.getEmployeeById(employeeId)

    return NextResponse.json({
      message: 'Employee restored successfully',
      employee: restoredEmployee
    })
  } catch (error) {
    logger.error('Error restoring employee:', error)
    return NextResponse.json(
      { error: 'Failed to restore employee' },
      { status: 500 }
    )
  }
}
