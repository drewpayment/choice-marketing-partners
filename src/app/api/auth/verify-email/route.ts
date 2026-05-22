import { NextResponse } from 'next/server'
import { db } from '@/lib/database/client'
import { validateEmailVerificationToken } from '@/lib/auth/email-verification'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/auth/verify-email
 * Validates an email-verification token, sets the account password, and
 * marks the email as verified so the user can sign in.
 */
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const payload = validateEmailVerificationToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 400 }
      )
    }

    // The verification token carries the user's uid (auto-increment PK)
    const user = await db
      .selectFrom('users')
      .select(['uid', 'email', 'email_verified_at'])
      .where('uid', '=', parseInt(payload.userId))
      .where('email', '=', payload.email)
      .executeTakeFirst()

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db
      .updateTable('users')
      .set({
        password: hashedPassword,
        email_verified_at: new Date(),
        updated_at: new Date(),
      })
      .where('uid', '=', user.uid)
      .execute()

    return NextResponse.json({
      message: 'Email verified successfully. You can now sign in with your new password.',
    })
  } catch (error) {
    logger.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}
