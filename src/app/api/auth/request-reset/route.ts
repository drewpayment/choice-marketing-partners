import { NextResponse } from 'next/server'
import { db } from '@/lib/database/client'
import { generatePasswordResetToken, hashToken } from '@/lib/auth/password-reset'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import PasswordResetEmail from '@/components/emails/PasswordResetEmail'
import React from 'react'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db
      .selectFrom('users')
      .select(['id', 'email'])
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst()

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, you will receive a password reset link.',
      })
    }

    // Check if user has active employee account
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'is_active'])
      .where('id', '=', user.id)
      .executeTakeFirst()

    // Only send reset email if account is active
    if (!employee || employee.is_active !== 1) {
      return NextResponse.json({
        message: 'If an account exists with that email, you will receive a password reset link.',
      })
    }

    // Generate reset token
    const token = generatePasswordResetToken(user.email, user.id.toString())
    const hashedToken = hashToken(token)

    // Log to password_resets table (audit trail)
    await db
      .insertInto('password_resets')
      .values({
        email: user.email,
        token: hashedToken,
      })
      .execute()

    // Generate reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    // Send email via Resend
    const emailHtml = render(
      React.createElement(PasswordResetEmail, { resetUrl, email: user.email })
    )

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Choice Marketing Partners <noreply@choicemarketingpartners.com>',
      to: user.email,
      subject: 'Reset Your Password',
      html: emailHtml,
    })

    return NextResponse.json({
      message: 'If an account exists with that email, you will receive a password reset link.',
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}
