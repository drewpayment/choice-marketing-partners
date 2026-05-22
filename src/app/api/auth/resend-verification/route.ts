import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/database/client'
import { generateEmailVerificationToken } from '@/lib/auth/email-verification'
import { sendVerificationEmail } from '@/lib/services/email'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/auth/resend-verification
 * Admin-triggered re-send of the email-verification message for an employee
 * whose linked user account has not yet verified its email.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { employeeId } = await request.json()
    const id = Number(employeeId)
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Valid employeeId is required' }, { status: 400 })
    }

    const row = await db
      .selectFrom('employees')
      .innerJoin('employee_user', 'employees.id', 'employee_user.employee_id')
      .innerJoin('users', 'employee_user.user_id', 'users.uid')
      .select(['users.uid as uid', 'users.email as email', 'users.email_verified_at as emailVerifiedAt'])
      .where('employees.id', '=', id)
      .executeTakeFirst()

    if (!row) {
      return NextResponse.json(
        { error: 'This employee does not have a user account' },
        { status: 404 }
      )
    }

    if (row.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'This account has already verified its email' },
        { status: 400 }
      )
    }

    const token = generateEmailVerificationToken(row.email, String(row.uid))
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`

    const result = await sendVerificationEmail(row.email, verifyUrl)
    if (!result.success) {
      logger.error('Failed to resend verification email:', result.error)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 502 }
      )
    }

    return NextResponse.json({ message: `Verification email re-sent to ${row.email}` })
  } catch (error) {
    logger.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}
