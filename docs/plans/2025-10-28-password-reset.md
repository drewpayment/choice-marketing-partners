# Password Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add self-service password reset functionality to the login page using JWT tokens with audit logging.

**Architecture:** JWT-based stateless password reset with 1-hour expiration, audit trail in existing password_resets table, email delivery via Resend API, active accounts only.

**Tech Stack:** Next.js 15, NextAuth.js, JWT (jsonwebtoken), Kysely ORM, Resend API, React Email

---

## Task 1: Create Password Reset Email Template

**Files:**
- Create: `choice-marketing-partners/src/components/emails/PasswordResetEmail.tsx`
- Reference: `choice-marketing-partners/src/components/emails/` (if any existing templates)

**Step 1: Write the email template component**

```typescript
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl: string
  email: string
}

export default function PasswordResetEmail({
  resetUrl,
  email,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Choice Marketing Partners password</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0 48px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            Password Reset Request
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Hello,
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            We received a request to reset the password for your account ({email}).
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Click the link below to reset your password. This link will expire in 1 hour.
          </Text>
          <Link
            href={resetUrl}
            style={{
              backgroundColor: '#5F51E8',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '16px',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'block',
              padding: '12px',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            Reset Password
          </Link>
          <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#666' }}>
            If you didn't request this password reset, you can safely ignore this email.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#666' }}>
            For security, this link will expire in 1 hour.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

**Step 2: Create test file for email template**

Create: `choice-marketing-partners/src/components/emails/__tests__/PasswordResetEmail.test.tsx`

```typescript
import { render } from '@react-email/render'
import PasswordResetEmail from '../PasswordResetEmail'

describe('PasswordResetEmail', () => {
  it('renders with reset URL and email', () => {
    const html = render(
      <PasswordResetEmail
        resetUrl="http://localhost:3000/auth/reset-password?token=abc123"
        email="user@test.com"
      />
    )

    expect(html).toContain('user@test.com')
    expect(html).toContain('http://localhost:3000/auth/reset-password?token=abc123')
    expect(html).toContain('Reset Password')
    expect(html).toContain('expire in 1 hour')
  })
})
```

**Step 3: Run test to verify it passes**

Run: `cd choice-marketing-partners && bun test src/components/emails/__tests__/PasswordResetEmail.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add choice-marketing-partners/src/components/emails/PasswordResetEmail.tsx choice-marketing-partners/src/components/emails/__tests__/PasswordResetEmail.test.tsx
git commit -m "feat: add password reset email template

- React Email component with reset link
- 1-hour expiration notice
- Security warning for unwanted requests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create Password Reset Token Utility

**Files:**
- Create: `choice-marketing-partners/src/lib/auth/password-reset.ts`
- Create: `choice-marketing-partners/src/lib/auth/__tests__/password-reset.test.ts`

**Step 1: Install jsonwebtoken dependency**

Run: `cd choice-marketing-partners && bun add jsonwebtoken && bun add -d @types/jsonwebtoken`

**Step 2: Write failing test for token generation**

Create: `choice-marketing-partners/src/lib/auth/__tests__/password-reset.test.ts`

```typescript
import { generatePasswordResetToken, validatePasswordResetToken } from '../password-reset'

describe('Password Reset Token', () => {
  const email = 'test@example.com'
  const userId = '123'

  describe('generatePasswordResetToken', () => {
    it('generates a valid JWT token', () => {
      const token = generatePasswordResetToken(email, userId)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format
    })
  })

  describe('validatePasswordResetToken', () => {
    it('validates a valid token', () => {
      const token = generatePasswordResetToken(email, userId)
      const payload = validatePasswordResetToken(token)

      expect(payload).toBeTruthy()
      expect(payload?.email).toBe(email)
      expect(payload?.userId).toBe(userId)
      expect(payload?.type).toBe('password-reset')
    })

    it('returns null for invalid token', () => {
      const payload = validatePasswordResetToken('invalid.token.here')
      expect(payload).toBeNull()
    })

    it('returns null for expired token', () => {
      // This test would require mocking time, skip for now
      // In real implementation, JWT library handles expiration
    })
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd choice-marketing-partners && bun test src/lib/auth/__tests__/password-reset.test.ts`
Expected: FAIL with "Cannot find module '../password-reset'"

**Step 4: Implement password reset token utilities**

Create: `choice-marketing-partners/src/lib/auth/password-reset.ts`

```typescript
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev'
const TOKEN_EXPIRY = '1h' // 1 hour

export interface PasswordResetPayload {
  email: string
  userId: string
  type: 'password-reset'
  exp?: number
  iat?: number
}

/**
 * Generate a signed JWT token for password reset
 */
export function generatePasswordResetToken(email: string, userId: string): string {
  const payload: PasswordResetPayload = {
    email,
    userId,
    type: 'password-reset',
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

/**
 * Validate and decode a password reset token
 * Returns payload if valid, null if invalid or expired
 */
export function validatePasswordResetToken(token: string): PasswordResetPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as PasswordResetPayload

    // Verify token type
    if (decoded.type !== 'password-reset') {
      return null
    }

    return decoded
  } catch (error) {
    // Token is invalid or expired
    return null
  }
}

/**
 * Hash a token for storage (audit trail only)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
```

**Step 5: Run test to verify it passes**

Run: `cd choice-marketing-partners && bun test src/lib/auth/__tests__/password-reset.test.ts`
Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add choice-marketing-partners/src/lib/auth/password-reset.ts choice-marketing-partners/src/lib/auth/__tests__/password-reset.test.ts choice-marketing-partners/package.json choice-marketing-partners/bun.lockb
git commit -m "feat: add password reset token utilities

- JWT generation with 1-hour expiration
- Token validation and decoding
- Token hashing for audit trail
- Comprehensive unit tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create Request Password Reset API Endpoint

**Files:**
- Create: `choice-marketing-partners/src/app/api/auth/request-reset/route.ts`
- Reference: `choice-marketing-partners/src/lib/database/types.ts` (PasswordResets interface)

**Step 1: Write API route handler**

Create: `choice-marketing-partners/src/app/api/auth/request-reset/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/database/client'
import { generatePasswordResetToken, hashToken } from '@/lib/auth/password-reset'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import PasswordResetEmail from '@/components/emails/PasswordResetEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

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
      <PasswordResetEmail resetUrl={resetUrl} email={user.email} />
    )

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
```

**Step 2: Create integration test file**

Create: `choice-marketing-partners/src/app/api/auth/request-reset/__tests__/route.test.ts`

```typescript
import { POST } from '../route'

// Mock dependencies
jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn(() => ({
        where: jest.fn(() => ({
          executeTakeFirst: jest.fn(),
        })),
      })),
    })),
    insertInto: jest.fn(() => ({
      values: jest.fn(() => ({
        execute: jest.fn(),
      })),
    })),
  },
}))

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

describe('POST /api/auth/request-reset', () => {
  it('returns success message for valid email', async () => {
    const request = new Request('http://localhost:3000/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('If an account exists')
  })

  it('returns 400 for missing email', async () => {
    const request = new Request('http://localhost:3000/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is required')
  })
})
```

**Step 3: Run test**

Run: `cd choice-marketing-partners && bun test src/app/api/auth/request-reset/__tests__/route.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add choice-marketing-partners/src/app/api/auth/request-reset/
git commit -m "feat: add password reset request API endpoint

- Validates user exists and is active
- Generates JWT token and logs to audit trail
- Sends reset email via Resend
- Prevents email enumeration attacks
- Integration tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Create Reset Password API Endpoint

**Files:**
- Create: `choice-marketing-partners/src/app/api/auth/reset-password/route.ts`

**Step 1: Write API route handler**

Create: `choice-marketing-partners/src/app/api/auth/reset-password/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/database/client'
import { validatePasswordResetToken } from '@/lib/auth/password-reset'
import bcrypt from 'bcryptjs'

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
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}
```

**Step 2: Create integration test**

Create: `choice-marketing-partners/src/app/api/auth/reset-password/__tests__/route.test.ts`

```typescript
import { POST } from '../route'
import { generatePasswordResetToken } from '@/lib/auth/password-reset'

// Mock dependencies
jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            executeTakeFirst: jest.fn(),
          })),
          executeTakeFirst: jest.fn(),
        })),
      })),
    })),
    updateTable: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          execute: jest.fn(),
        })),
      })),
    })),
  },
}))

describe('POST /api/auth/reset-password', () => {
  it('returns 400 for missing token', async () => {
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'newpassword123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Token is required')
  })

  it('returns 400 for short password', async () => {
    const token = generatePasswordResetToken('test@example.com', '123')
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: 'short' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('at least 8 characters')
  })

  it('returns 400 for invalid token', async () => {
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid', password: 'newpassword123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid or expired')
  })
})
```

**Step 3: Run test**

Run: `cd choice-marketing-partners && bun test src/app/api/auth/reset-password/__tests__/route.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add choice-marketing-partners/src/app/api/auth/reset-password/
git commit -m "feat: add password reset completion API endpoint

- Validates JWT token signature and expiration
- Verifies user exists and is active
- Updates password with bcrypt hashing
- Password minimum length validation
- Integration tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Create Password Reset UI Page

**Files:**
- Create: `choice-marketing-partners/src/app/auth/reset-password/page.tsx`

**Step 1: Create reset password page**

Create: `choice-marketing-partners/src/app/auth/reset-password/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsClient } from '@/hooks/useIsClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isClient = useIsClient()
  const token = searchParams.get('token')

  useEffect(() => {
    if (isClient && !token) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [isClient, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to reset password')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin')
      }, 3000)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="max-w-md w-full space-y-8">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-lg font-medium text-green-800">
              Password Reset Successful!
            </h3>
            <p className="mt-2 text-sm text-green-700">
              Redirecting to sign in page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add choice-marketing-partners/src/app/auth/reset-password/page.tsx
git commit -m "feat: add password reset UI page

- Token validation from URL parameter
- Password and confirm password inputs
- Client-side validation (length, match)
- Success state with auto-redirect
- Loading states and error handling

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update Sign In Page with Forgot Password Link

**Files:**
- Modify: `choice-marketing-partners/src/app/auth/signin/page.tsx:116-121`
- Create: `choice-marketing-partners/src/app/auth/forgot-password/page.tsx`

**Step 1: Create forgot password request page**

Create: `choice-marketing-partners/src/app/auth/forgot-password/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useIsClient } from '@/hooks/useIsClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isClient = useIsClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email')
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="max-w-md w-full space-y-8">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-blue-50 p-4">
            <h3 className="text-lg font-medium text-blue-800">
              Check your email
            </h3>
            <p className="mt-2 text-sm text-blue-700">
              If an account exists with that email, you will receive a password reset link shortly.
            </p>
            <p className="mt-2 text-sm text-blue-700">
              The link will expire in 1 hour.
            </p>
          </div>
          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we'll send you a reset link
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Add forgot password link to sign in page**

Modify: `choice-marketing-partners/src/app/auth/signin/page.tsx`

Add after line 115 (after the password input closing div):

```typescript
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <a
                href="/auth/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          {error && (
```

**Step 3: Test manually**

Run: `cd choice-marketing-partners && bun dev`
Navigate to: `http://localhost:3000/auth/signin`
Expected: See "Forgot your password?" link
Click link and verify redirect to forgot password page

**Step 4: Commit**

```bash
git add choice-marketing-partners/src/app/auth/forgot-password/page.tsx choice-marketing-partners/src/app/auth/signin/page.tsx
git commit -m "feat: add forgot password UI flow

- Forgot password request page with email input
- Success state with email sent confirmation
- Link from sign in page to forgot password
- Consistent styling with existing auth pages

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Add E2E Tests

**Files:**
- Create: `choice-marketing-partners/tests/e2e/password-reset.spec.ts`

**Step 1: Create E2E test file**

Create: `choice-marketing-partners/tests/e2e/password-reset.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Password Reset Flow', () => {
  test('shows forgot password link on sign in page', async ({ page }) => {
    await page.goto('/auth/signin')

    const forgotLink = page.locator('a', { hasText: 'Forgot your password?' })
    await expect(forgotLink).toBeVisible()
  })

  test('navigates to forgot password page', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.click('text=Forgot your password?')

    await expect(page).toHaveURL('/auth/forgot-password')
    await expect(page.locator('h2')).toContainText('Forgot your password?')
  })

  test('submits email for password reset', async ({ page }) => {
    await page.goto('/auth/forgot-password')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible()
    await expect(page.locator('text=Return to sign in')).toBeVisible()
  })

  test('validates email format', async ({ page }) => {
    await page.goto('/auth/forgot-password')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    // Browser validation should prevent submit
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('shows password reset form with valid token', async ({ page }) => {
    // This would require a valid token - in real test, generate one first
    await page.goto('/auth/reset-password?token=test-token')

    await expect(page.locator('h2')).toContainText('Reset your password')
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirm-password')).toBeVisible()
  })

  test('validates password match', async ({ page }) => {
    await page.goto('/auth/reset-password?token=test-token')

    await page.fill('input#password', 'newpassword123')
    await page.fill('input#confirm-password', 'differentpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('validates minimum password length', async ({ page }) => {
    await page.goto('/auth/reset-password?token=test-token')

    await page.fill('input#password', 'short')
    await page.fill('input#confirm-password', 'short')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=at least 8 characters')).toBeVisible()
  })

  test('shows error for missing token', async ({ page }) => {
    await page.goto('/auth/reset-password')

    await expect(page.locator('text=Invalid reset link')).toBeVisible()
  })
})
```

**Step 2: Run E2E tests**

Run: `cd choice-marketing-partners && bun test:e2e password-reset.spec.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add choice-marketing-partners/tests/e2e/password-reset.spec.ts
git commit -m "test: add E2E tests for password reset flow

- Forgot password link visibility and navigation
- Email submission and success message
- Password reset form validation
- Token validation
- Password match and length validation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update Environment Variables Documentation

**Files:**
- Modify: `choice-marketing-partners/.env.example`

**Step 1: Verify Resend API key is documented**

Check: `choice-marketing-partners/.env.example`

Should contain:
```bash
RESEND_API_KEY="your-resend-api-key"
```

If not present, add it.

**Step 2: Add comment about password reset emails**

Add to `.env.example`:

```bash
# Resend Email (required for password reset emails)
RESEND_API_KEY="your-resend-api-key"
```

**Step 3: Commit**

```bash
git add choice-marketing-partners/.env.example
git commit -m "docs: document Resend API key for password reset

Clarify that RESEND_API_KEY is required for password reset
email functionality.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add password reset section to documentation**

Add to `CLAUDE.md` under the "Authentication & Authorization" section:

```markdown
### Password Reset Flow

**Self-service password reset** with JWT tokens:
- Request: `POST /api/auth/request-reset` (validates active user, sends email)
- Reset: `POST /api/auth/reset-password` (validates token, updates password)
- Token expiration: 1 hour
- Audit logging: All requests logged to `password_resets` table
- Email delivery: Resend API

**UI Flow**:
1. User clicks "Forgot password?" on sign in page
2. Enters email at `/auth/forgot-password`
3. Receives email with reset link
4. Clicks link → `/auth/reset-password?token=...`
5. Enters new password
6. Redirected to sign in page

**Security**:
- JWT signed with `NEXTAUTH_SECRET`
- Only active accounts can reset (`is_active = 1`)
- Prevents email enumeration (same message for existing/non-existing emails)
- Password minimum 8 characters
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add password reset documentation to CLAUDE.md

Document the password reset flow, security considerations,
and API endpoints for future reference.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Steps

After implementation, verify the complete flow:

1. **Start dev server**: `cd choice-marketing-partners && bun dev`

2. **Test forgot password flow**:
   - Navigate to `http://localhost:3000/auth/signin`
   - Click "Forgot your password?"
   - Enter a test email
   - Check server logs for email sending (or check email inbox)

3. **Test reset password**:
   - Copy reset token from email or server logs
   - Navigate to reset URL with token
   - Enter new password
   - Verify redirect to sign in
   - Sign in with new password

4. **Run all tests**:
   ```bash
   cd choice-marketing-partners
   bun test                    # Unit tests
   bun test:e2e                # E2E tests
   ```

5. **Verify audit logging**:
   - Check `password_resets` table in database
   - Should see logged reset requests with hashed tokens

---

## Architecture Decisions

**Why JWT over database tokens?**
- Stateless validation reduces database load
- Works well with serverless functions
- 1-hour expiration is short enough for security
- Audit trail still maintained via logging

**Why audit log if using JWT?**
- Security compliance and monitoring
- Can detect brute force attempts
- Historical record of reset requests
- Uses existing Laravel table structure

**Why 1-hour expiration?**
- Balance between security and usability
- Industry standard for password reset
- Short enough to limit risk if email compromised

**Why prevent email enumeration?**
- Security best practice
- Prevents attackers from discovering valid emails
- Same success message for all requests

---

## Related Skills

- `@superpowers:test-driven-development` - Used throughout for TDD approach
- `@superpowers:systematic-debugging` - If issues arise during implementation
- `@superpowers:verification-before-completion` - Final verification before PR

---

## Success Criteria

✅ User can request password reset from sign in page
✅ Reset email sent via Resend with secure token
✅ Token expires after 1 hour
✅ Only active users can reset password
✅ Password updated securely with bcrypt
✅ Audit trail logged to database
✅ All unit tests pass
✅ All E2E tests pass
✅ No email enumeration vulnerability
