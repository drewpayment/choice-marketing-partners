import {
  generateEmailVerificationToken,
  validateEmailVerificationToken,
} from '../email-verification'
import { generatePasswordResetToken } from '../password-reset'
import jwt from 'jsonwebtoken'

describe('Email Verification Token', () => {
  const email = 'newhire@example.com'
  const userId = '456'

  describe('generateEmailVerificationToken', () => {
    it('generates a valid JWT token', () => {
      const token = generateEmailVerificationToken(email, userId)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format
    })
  })

  describe('validateEmailVerificationToken', () => {
    it('validates a valid token and returns the payload', () => {
      const token = generateEmailVerificationToken(email, userId)
      const payload = validateEmailVerificationToken(token)

      expect(payload).toBeTruthy()
      expect(payload?.email).toBe(email)
      expect(payload?.userId).toBe(userId)
      expect(payload?.type).toBe('email-verification')
    })

    it('returns null for a malformed token', () => {
      expect(validateEmailVerificationToken('invalid.token.here')).toBeNull()
    })

    it('returns null for an expired token', () => {
      const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev'
      const expired = jwt.sign(
        { email, userId, type: 'email-verification' },
        secret,
        { expiresIn: -10 }
      )
      expect(validateEmailVerificationToken(expired)).toBeNull()
    })

    it('rejects a password-reset token (wrong type)', () => {
      // A token minted for a different purpose must not pass verification.
      const resetToken = generatePasswordResetToken(email, userId)
      expect(validateEmailVerificationToken(resetToken)).toBeNull()
    })

    it('returns null for a token signed with a different secret', () => {
      const foreign = jwt.sign(
        { email, userId, type: 'email-verification' },
        'a-different-secret',
        { expiresIn: '7d' }
      )
      expect(validateEmailVerificationToken(foreign)).toBeNull()
    })
  })
})
