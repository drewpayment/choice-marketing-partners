/**
 * @jest-environment node
 */

import { generatePassword, isValidPassword } from '@/lib/utils/password'

describe('Password Utility', () => {
  describe('generatePassword', () => {
    it('should generate password with default length of 10', () => {
      const password = generatePassword()
      expect(password).toHaveLength(10)
    })

    it('should generate password with custom length', () => {
      const password = generatePassword(16)
      expect(password).toHaveLength(16)
    })

    it('should generate passwords with only alphanumeric characters', () => {
      const password = generatePassword(20)
      expect(password).toMatch(/^[a-zA-Z0-9]+$/)
    })

    it('should generate different passwords on each call', () => {
      const password1 = generatePassword()
      const password2 = generatePassword()
      expect(password1).not.toBe(password2)
    })

    it('should generate passwords with mixed case and numbers', () => {
      // Generate multiple passwords to ensure variety
      const passwords = Array.from({ length: 10 }, () => generatePassword(20))
      
      // At least one should have uppercase
      const hasUppercase = passwords.some(p => /[A-Z]/.test(p))
      expect(hasUppercase).toBe(true)
      
      // At least one should have lowercase
      const hasLowercase = passwords.some(p => /[a-z]/.test(p))
      expect(hasLowercase).toBe(true)
      
      // At least one should have numbers
      const hasNumbers = passwords.some(p => /[0-9]/.test(p))
      expect(hasNumbers).toBe(true)
    })
  })

  describe('isValidPassword', () => {
    it('should return true for passwords with 8+ characters', () => {
      expect(isValidPassword('12345678')).toBe(true)
      expect(isValidPassword('password123')).toBe(true)
      expect(isValidPassword('a'.repeat(20))).toBe(true)
    })

    it('should return false for passwords with less than 8 characters', () => {
      expect(isValidPassword('1234567')).toBe(false)
      expect(isValidPassword('abc')).toBe(false)
      expect(isValidPassword('')).toBe(false)
    })
  })
})
