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
