import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/database/client'
import { logger } from '@/lib/utils/logger'

const employeeRepository = new EmployeeRepository()

const passwordResetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  forceChange: z.boolean().optional().default(false)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

/**
 * POST /api/employees/[id]/password-reset - Admin-initiated password reset
 */
export async function POST(
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
    const data = passwordResetSchema.parse(body)

    // Check if employee exists and has a user account
    const employee = await employeeRepository.getEmployeeById(employeeId)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (!employee.user) {
      return NextResponse.json(
        { error: 'Employee does not have a user account' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Update the user's password
    await db
      .updateTable('users')
      .set({
        password: hashedPassword,
        updated_at: new Date()
      })
      .where('uid', '=', employee.user.uid)
      .execute()

    // Log the password reset activity
    // Note: In a production system, you might want to create an audit log table
    logger.log(`Password reset for user ${employee.user.uid} by admin ${session.user.id} at ${new Date().toISOString()}`)

    return NextResponse.json({
      message: 'Password reset successfully',
      forceChange: data.forceChange
    })
  } catch (error) {
    logger.error('Error resetting password:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
