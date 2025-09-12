import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ManagerEmployeeRepository } from '@/lib/repositories/ManagerEmployeeRepository'
import { z } from 'zod'

const managerEmployeeRepository = new ManagerEmployeeRepository()

const assignmentSchema = z.object({
  managerId: z.number(),
  employeeId: z.number()
})

const bulkAssignmentSchema = z.object({
  assignments: z.array(assignmentSchema)
})

/**
 * GET /api/overrides/employees - Get all employees for assignment interface
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const availableEmployees = await managerEmployeeRepository.getAvailableEmployees()
    const unassignedEmployees = await managerEmployeeRepository.getUnassignedEmployees()

    return NextResponse.json({
      availableEmployees,
      unassignedEmployees
    })
  } catch (error) {
    console.error('Error fetching employees for assignment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/overrides/employees - Update manager-employee assignments
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const data = bulkAssignmentSchema.parse(body)

    // Validate all assignments
    for (const assignment of data.assignments) {
      const validation = await managerEmployeeRepository.validateAssignment(
        assignment.managerId,
        assignment.employeeId
      )

      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid assignment: ${validation.error}` },
          { status: 400 }
        )
      }
    }

    // Update assignments
    const success = await managerEmployeeRepository.updateAssignments(data.assignments)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Assignments updated successfully',
      assignmentsUpdated: data.assignments.length
    })
  } catch (error) {
    console.error('Error updating assignments:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update assignments' },
      { status: 500 }
    )
  }
}
