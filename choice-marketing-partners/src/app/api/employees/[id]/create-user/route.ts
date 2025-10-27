import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/database/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/services/email'

// Generate secure random password
function generatePassword(length: number = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }

  return password
}

const createUserSchema = z.object({
  role: z.enum(['admin', 'author', 'subscriber']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const { role } = createUserSchema.parse(body)

    const resolvedParams = await params
    const employeeId = resolvedParams.id

    // Check if employee exists
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name', 'email'])
      .where('id', '=', employeeId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if user already exists for this employee
    const existingUser = await db
      .selectFrom('employee_user')
      .select('user_id')
      .where('employee_id', '=', employeeId)
      .executeTakeFirst()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User account already exists for this employee' },
        { status: 409 }
      )
    }

    // Generate password
    const password = generatePassword(10)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and link to employee in a transaction
    const result = await db.transaction().execute(async (trx) => {
      // Create user
      const userInsertResult = await trx
        .insertInto('users')
        .values({
          email: employee.email,
          name: employee.name,
          password: hashedPassword,
          role: role,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .executeTakeFirstOrThrow()

      const userId = Number(userInsertResult.insertId)

      // Link employee to user
      await trx
        .insertInto('employee_user')
        .values({
          employee_id: employeeId,
          user_id: userId,
          created_at: new Date(),
        })
        .execute()

      // Query the created user
      const user = await trx
        .selectFrom('users')
        .select(['uid as id', 'email', 'role'])
        .where('uid', '=', userId)
        .executeTakeFirstOrThrow()

      return user
    })

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: employee.email,
        name: employee.name,
        password: password,
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'User account created successfully',
      password: password, // Return password for UI display (shown once)
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
