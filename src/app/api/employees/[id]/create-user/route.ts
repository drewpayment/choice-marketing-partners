import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/database/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/services/email'
import { generateEmailVerificationToken } from '@/lib/auth/email-verification'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { logger } from '@/lib/utils/logger'

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

    // Check if user already exists for this employee via employee_user link
    const existingLink = await db
      .selectFrom('employee_user')
      .select('user_id')
      .where('employee_id', '=', employeeId)
      .executeTakeFirst()

    if (existingLink) {
      return NextResponse.json(
        { error: 'User account already exists for this employee' },
        { status: 409 }
      )
    }

    // Check if a user row already exists (by id or email) without an employee_user link
    // This handles the case where users.id = employees.id but employee_user was never created
    const existingUser = await db
      .selectFrom('users')
      .select(['uid', 'id', 'email', 'role'])
      .where((eb) =>
        eb.or([
          eb('id', '=', employeeId),
          eb('email', '=', employee.email),
        ])
      )
      .executeTakeFirst()

    if (existingUser) {
      // User row exists but no employee_user link — just create the link
      await db
        .insertInto('employee_user')
        .values({
          employee_id: employeeId,
          user_id: existingUser.uid,
        })
        .execute()

      // Optionally update the role if the admin selected a different one
      if (existingUser.role !== role) {
        await db
          .updateTable('users')
          .set({ role, updated_at: new Date() })
          .where('uid', '=', existingUser.uid)
          .execute()
      }

      return NextResponse.json({
        success: true,
        message: 'User account already existed and has been linked to this employee',
        user: {
          id: existingUser.uid,
          email: existingUser.email,
          role: role,
        },
      })
    }

    // No existing user — create a new one.
    // When the verification flag is on, the account starts unverified and the
    // generated password is a throwaway (the user sets their own via email).
    const requireVerification = await isFeatureEnabled('require-email-verification', {
      userId: session.user.id,
      isAdmin: session.user.isAdmin,
      isManager: session.user.isManager ?? false,
      isSubscriber: false,
      subscriberId: null,
    })
    const password = generatePassword(10)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and link to employee in a transaction
    const result = await db.transaction().execute(async (trx) => {
      // Create user
      const userInsertResult = await trx
        .insertInto('users')
        .values({
          id: employeeId,
          email: employee.email,
          name: employee.name,
          password: hashedPassword,
          role: role,
          email_verified_at: requireVerification ? null : new Date(),
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

    // Verification flow: send a verification link, never expose a password
    if (requireVerification) {
      try {
        const token = generateEmailVerificationToken(employee.email, String(result.id))
        const baseUrl =
          process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await sendVerificationEmail(
          employee.email,
          `${baseUrl}/auth/verify-email?token=${token}`
        )
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: `User account created. A verification email has been sent to ${employee.email}.`,
        verificationSent: true,
        user: {
          id: result.id,
          email: result.email,
          role: result.role,
        },
      })
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: employee.email,
        name: employee.name,
        password: password,
      })
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError)
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
    logger.error('Error creating user:', error)

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
