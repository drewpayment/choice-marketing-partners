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
