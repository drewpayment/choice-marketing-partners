import jwt from 'jsonwebtoken'

/**
 * Signed JWT tokens for the employee email-verification flow. Mirrors
 * password-reset.ts but with its own token `type` and a longer expiry
 * window appropriate for onboarding.
 */

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev'
const TOKEN_EXPIRY = '7d' // onboarding window

export interface EmailVerificationPayload {
  email: string
  userId: string
  type: 'email-verification'
  exp?: number
  iat?: number
}

/** Generate a signed verification token for a newly created user account. */
export function generateEmailVerificationToken(email: string, userId: string): string {
  const payload: EmailVerificationPayload = {
    email,
    userId,
    type: 'email-verification',
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

/**
 * Validate and decode a verification token.
 * Returns the payload if valid, or null if invalid, expired, or wrong type.
 */
export function validateEmailVerificationToken(token: string): EmailVerificationPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as EmailVerificationPayload
    if (decoded.type !== 'email-verification') {
      return null
    }
    return decoded
  } catch {
    return null
  }
}
