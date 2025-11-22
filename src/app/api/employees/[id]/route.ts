import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const employeeRepository = new EmployeeRepository()

const updateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone_no: z.string().optional(),
  address: z.string().min(1, 'Address is required').optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_mgr: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sales_id1: z.string().optional(),
  sales_id2: z.string().optional(),
  sales_id3: z.string().optional(),
  hidden_payroll: z.boolean().optional()
})

/**
 * GET /api/employees/[id] - Get employee details by ID
 */
export async function GET(
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

    const employee = await employeeRepository.getEmployeeById(employeeId)

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    logger.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/employees/[id] - Update employee details
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

    const body = await request.json()
    const data = updateEmployeeSchema.parse(body)

    // Check if employee exists
    const existingEmployee = await employeeRepository.getEmployeeById(employeeId)
    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check email availability if email is being changed
    if (data.email && data.email !== existingEmployee.email) {
      const emailAvailable = await employeeRepository.isEmailAvailable(data.email, employeeId)
      if (!emailAvailable) {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 400 }
        )
      }
    }

    const updatedEmployee = await employeeRepository.updateEmployee(employeeId, data)

    return NextResponse.json({ employee: updatedEmployee })
  } catch (error) {
    logger.error('Error updating employee:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/employees/[id] - Soft delete employee
 */
export async function DELETE(
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

    // Check if employee exists
    const existingEmployee = await employeeRepository.getEmployeeById(employeeId)
    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const success = await employeeRepository.softDeleteEmployee(employeeId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete employee' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    logger.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
