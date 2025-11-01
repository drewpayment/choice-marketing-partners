/**
 * Validation Utility Functions Unit Tests
 * Tests for validation helpers used throughout the application
 */

// Mock validation utility functions
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidSalesId = (salesId: string): boolean => {
  // Sales IDs should be 6-8 alphanumeric characters
  const salesIdRegex = /^[A-Z0-9]{6,8}$/
  return salesIdRegex.test(salesId)
}

export const isValidAmount = (amount: string | number): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return !isNaN(num) && isFinite(num) && num >= 0
}

export const isValidPhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')
  // Should be 10 digits (US format)
  return cleanPhone.length === 10
}

export const isValidSSN = (ssn: string): boolean => {
  // SSN format: XXX-XX-XXXX or XXXXXXXXX
  const cleanSSN = ssn.replace(/\D/g, '')
  return cleanSSN.length === 9
}

export const isValidZipCode = (zip: string): boolean => {
  // US zip code: 5 digits or 5+4 format
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(zip)
}

export const validateRequired = (value: unknown, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`
  }
  return null
}

export const validateMinLength = (value: string, minLength: number, fieldName: string): string | null => {
  if (typeof value !== 'string' || value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }
  return null
}

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): string | null => {
  if (typeof value !== 'string' || value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`
  }
  return null
}

export const validateMinAmount = (amount: number, minAmount: number, fieldName: string): string | null => {
  if (amount < minAmount) {
    return `${fieldName} must be at least $${minAmount}`
  }
  return null
}

export const validateMaxAmount = (amount: number, maxAmount: number, fieldName: string): string | null => {
  if (amount > maxAmount) {
    return `${fieldName} must be no more than $${maxAmount}`
  }
  return null
}

export const validateDateRange = (startDate: string, endDate: string): string | null => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date format'
  }
  
  if (start > end) {
    return 'Start date must be before end date'
  }
  
  return null
}

export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .trim()
}

export const normalizePhone = (phone: string): string => {
  // Normalize phone number to (XXX) XXX-XXXX format
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export const normalizeSSN = (ssn: string): string => {
  // Normalize SSN to XXX-XX-XXXX format
  const cleaned = ssn.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`
  }
  return ssn
}

describe('Validation Utility Functions', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true)
      expect(isValidEmail('user123@test-domain.org')).toBe(true)
    })

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@.com')).toBe(false)
      expect(isValidEmail('user space@domain.com')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('a@b.c')).toBe(true) // Minimum valid email
    })
  })

  describe('isValidSalesId', () => {
    it('should return true for valid sales IDs', () => {
      expect(isValidSalesId('AGENT1')).toBe(true)
      expect(isValidSalesId('AGENT123')).toBe(true)
      expect(isValidSalesId('A1B2C3D4')).toBe(true)
    })

    it('should return false for invalid sales IDs', () => {
      expect(isValidSalesId('SHORT')).toBe(false) // Too short
      expect(isValidSalesId('TOOLONGID')).toBe(false) // Too long
      expect(isValidSalesId('agent123')).toBe(false) // Lowercase
      expect(isValidSalesId('AGENT-1')).toBe(false) // Special characters
      expect(isValidSalesId('')).toBe(false)
    })
  })

  describe('isValidAmount', () => {
    it('should return true for valid amounts', () => {
      expect(isValidAmount(100)).toBe(true)
      expect(isValidAmount(0)).toBe(true)
      expect(isValidAmount(123.45)).toBe(true)
      expect(isValidAmount('100')).toBe(true)
      expect(isValidAmount('123.45')).toBe(true)
    })

    it('should return false for invalid amounts', () => {
      expect(isValidAmount(-100)).toBe(false) // Negative
      expect(isValidAmount(NaN)).toBe(false)
      expect(isValidAmount(Infinity)).toBe(false)
      expect(isValidAmount('invalid')).toBe(false)
      expect(isValidAmount('')).toBe(false)
    })
  })

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(isValidPhoneNumber('1234567890')).toBe(true)
      expect(isValidPhoneNumber('(123) 456-7890')).toBe(true)
      expect(isValidPhoneNumber('123-456-7890')).toBe(true)
      expect(isValidPhoneNumber('123.456.7890')).toBe(true)
    })

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhoneNumber('123456789')).toBe(false) // Too short
      expect(isValidPhoneNumber('12345678901')).toBe(false) // Too long
      expect(isValidPhoneNumber('abcd567890')).toBe(false) // Letters
      expect(isValidPhoneNumber('')).toBe(false)
    })
  })

  describe('isValidSSN', () => {
    it('should return true for valid SSNs', () => {
      expect(isValidSSN('123456789')).toBe(true)
      expect(isValidSSN('123-45-6789')).toBe(true)
    })

    it('should return false for invalid SSNs', () => {
      expect(isValidSSN('12345678')).toBe(false) // Too short
      expect(isValidSSN('1234567890')).toBe(false) // Too long
      expect(isValidSSN('abc-45-6789')).toBe(false) // Letters
      expect(isValidSSN('')).toBe(false)
    })
  })

  describe('isValidZipCode', () => {
    it('should return true for valid zip codes', () => {
      expect(isValidZipCode('12345')).toBe(true)
      expect(isValidZipCode('12345-6789')).toBe(true)
    })

    it('should return false for invalid zip codes', () => {
      expect(isValidZipCode('1234')).toBe(false) // Too short
      expect(isValidZipCode('123456')).toBe(false) // Too long (no dash)
      expect(isValidZipCode('12345-678')).toBe(false) // Wrong extended format
      expect(isValidZipCode('abcde')).toBe(false) // Letters
      expect(isValidZipCode('')).toBe(false)
    })
  })

  describe('validateRequired', () => {
    it('should return null for valid values', () => {
      expect(validateRequired('value', 'Field')).toBe(null)
      expect(validateRequired(123, 'Field')).toBe(null)
      expect(validateRequired(0, 'Field')).toBe(null)
      expect(validateRequired(false, 'Field')).toBe(null)
    })

    it('should return error message for invalid values', () => {
      expect(validateRequired(null, 'Field')).toBe('Field is required')
      expect(validateRequired(undefined, 'Field')).toBe('Field is required')
      expect(validateRequired('', 'Field')).toBe('Field is required')
    })
  })

  describe('validateMinLength', () => {
    it('should return null for valid lengths', () => {
      expect(validateMinLength('hello', 3, 'Field')).toBe(null)
      expect(validateMinLength('hello', 5, 'Field')).toBe(null)
    })

    it('should return error message for invalid lengths', () => {
      expect(validateMinLength('hi', 3, 'Field')).toBe('Field must be at least 3 characters')
      expect(validateMinLength('', 1, 'Field')).toBe('Field must be at least 1 characters')
    })
  })

  describe('validateMaxLength', () => {
    it('should return null for valid lengths', () => {
      expect(validateMaxLength('hello', 10, 'Field')).toBe(null)
      expect(validateMaxLength('hello', 5, 'Field')).toBe(null)
    })

    it('should return error message for invalid lengths', () => {
      expect(validateMaxLength('hello world', 5, 'Field')).toBe('Field must be no more than 5 characters')
    })
  })

  describe('validateMinAmount', () => {
    it('should return null for valid amounts', () => {
      expect(validateMinAmount(100, 50, 'Amount')).toBe(null)
      expect(validateMinAmount(50, 50, 'Amount')).toBe(null)
    })

    it('should return error message for invalid amounts', () => {
      expect(validateMinAmount(25, 50, 'Amount')).toBe('Amount must be at least $50')
    })
  })

  describe('validateMaxAmount', () => {
    it('should return null for valid amounts', () => {
      expect(validateMaxAmount(100, 200, 'Amount')).toBe(null)
      expect(validateMaxAmount(200, 200, 'Amount')).toBe(null)
    })

    it('should return error message for invalid amounts', () => {
      expect(validateMaxAmount(250, 200, 'Amount')).toBe('Amount must be no more than $200')
    })
  })

  describe('validateDateRange', () => {
    it('should return null for valid date ranges', () => {
      expect(validateDateRange('2024-01-01', '2024-01-31')).toBe(null)
      expect(validateDateRange('2024-01-15', '2024-01-15')).toBe(null) // Same date
    })

    it('should return error message for invalid date ranges', () => {
      expect(validateDateRange('2024-01-31', '2024-01-01')).toBe('Start date must be before end date')
      expect(validateDateRange('invalid', '2024-01-01')).toBe('Invalid date format')
      expect(validateDateRange('2024-01-01', 'invalid')).toBe('Invalid date format')
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>Hello')).toBe('Hello')
      expect(sanitizeInput('Hello<script src="evil.js"></script>World')).toBe('HelloWorld')
    })

    it('should remove angle brackets', () => {
      expect(sanitizeInput('Hello <div>World</div>')).toBe('Hello World')
      expect(sanitizeInput('<p>Content</p>')).toBe('Content')
    })

    it('should trim whitespace', () => {
      expect(sanitizeInput('  Hello World  ')).toBe('Hello World')
    })

    it('should handle clean input', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World')
      expect(sanitizeInput('123 Main St')).toBe('123 Main St')
    })
  })

  describe('normalizePhone', () => {
    it('should format valid phone numbers', () => {
      expect(normalizePhone('1234567890')).toBe('(123) 456-7890')
      expect(normalizePhone('123-456-7890')).toBe('(123) 456-7890')
      expect(normalizePhone('(123) 456-7890')).toBe('(123) 456-7890')
    })

    it('should return original for invalid phone numbers', () => {
      expect(normalizePhone('123456789')).toBe('123456789') // Too short
      expect(normalizePhone('12345678901')).toBe('12345678901') // Too long
    })
  })

  describe('normalizeSSN', () => {
    it('should format valid SSNs', () => {
      expect(normalizeSSN('123456789')).toBe('123-45-6789')
      expect(normalizeSSN('123-45-6789')).toBe('123-45-6789')
    })

    it('should return original for invalid SSNs', () => {
      expect(normalizeSSN('12345678')).toBe('12345678') // Too short
      expect(normalizeSSN('1234567890')).toBe('1234567890') // Too long
    })
  })
})