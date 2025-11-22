import { NextResponse } from 'next/server'
import { db } from '@/lib/database/client'
import { validatePasswordResetToken } from '@/lib/auth/password-reset'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Validate token
    const payload = validatePasswordResetToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Verify user still exists and is active
    const user = await db
      .selectFrom('users')
      .select(['id', 'email'])
      .where('email', '=', payload.email)
      .where('id', '=', parseInt(payload.userId))
      .executeTakeFirst()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is still active
    const employee = await db
      .selectFrom('employees')
      .select(['is_active'])
      .where('id', '=', user.id)
      .executeTakeFirst()

    if (!employee || employee.is_active !== 1) {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password in database
    await db
      .updateTable('users')
      .set({ password: hashedPassword })
      .where('id', '=', user.id)
      .execute()

    return NextResponse.json({
      message: 'Password reset successful. You can now sign in with your new password.',
    })
  } catch (error) {
    logger.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}
