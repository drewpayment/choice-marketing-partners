/**
 * Date Utility Functions Unit Tests
 * Tests for date handling utilities used throughout the application
 */

// Mock utility functions since they don't exist yet
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export const formatDate = (dateString: string, format: 'short' | 'long' = 'short'): string => {
  // Handle ISO date strings first
  if (dateString.includes('T')) {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    
    if (format === 'long') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }
  
  // Handle YYYY-MM-DD format
  const parts = dateString.split('-')
  if (parts.length !== 3) {
    return 'Invalid Date'
  }
  
  const [year, month, day] = parts.map(Number)
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    return 'Invalid Date'
  }
  
  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return 'Invalid Date'
  }
  
  const date = new Date(year, month - 1, day) // month is 0-indexed
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0
  }
  
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString)
  // Check if date is valid and the string representation matches expected format
  return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0]
}

export const getQuarterFromDate = (dateString: string): number => {
  // Handle ISO date strings
  if (dateString.includes('T')) {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 0
    }
    const month = date.getMonth() + 1 // getMonth() returns 0-11
    return Math.ceil(month / 3)
  }
  
  // Handle YYYY-MM-DD format
  const parts = dateString.split('-')
  if (parts.length !== 3) {
    return 0
  }
  
  const [year, month, day] = parts.map(Number)
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    return 0
  }
  
  if (month < 1 || month > 12) {
    return 0
  }
  
  return Math.ceil(month / 3)
}

export const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return dateString
  }
  
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const intMonth = Math.floor(month)
  if (intMonth < 1 || intMonth > 12) {
    return 'Invalid Month'
  }
  
  return months[intMonth - 1]
}

describe('Date Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(0.99)).toBe('$0.99')
    })

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
      expect(formatCurrency(-100)).toBe('-$100.00')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000.50)).toBe('$1,000,000.50')
    })

    it('should handle decimal precision correctly', () => {
      expect(formatCurrency(123.456)).toBe('$123.46') // Rounds to 2 decimal places
      expect(formatCurrency(123.454)).toBe('$123.45')
    })
  })

  describe('formatDate', () => {
    it('should format dates in short format by default', () => {
      expect(formatDate('2024-01-15')).toBe('01/15/2024')
      expect(formatDate('2024-12-31')).toBe('12/31/2024')
    })

    it('should format dates in long format when specified', () => {
      expect(formatDate('2024-01-15', 'long')).toBe('January 15, 2024')
      expect(formatDate('2024-12-31', 'long')).toBe('December 31, 2024')
    })

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date')
      expect(formatDate('')).toBe('Invalid Date')
      expect(formatDate('2024-13-45')).toBe('Invalid Date')
    })

    it('should handle ISO date strings', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('01/15/2024')
    })
  })

  describe('calculateDaysBetween', () => {
    it('should calculate days between dates correctly', () => {
      expect(calculateDaysBetween('2024-01-01', '2024-01-10')).toBe(9)
      expect(calculateDaysBetween('2024-01-15', '2024-01-20')).toBe(5)
    })

    it('should handle dates in reverse order', () => {
      expect(calculateDaysBetween('2024-01-10', '2024-01-01')).toBe(9)
      expect(calculateDaysBetween('2024-01-20', '2024-01-15')).toBe(5)
    })

    it('should handle same dates', () => {
      expect(calculateDaysBetween('2024-01-15', '2024-01-15')).toBe(0)
    })

    it('should handle invalid dates', () => {
      expect(calculateDaysBetween('invalid', '2024-01-15')).toBe(0)
      expect(calculateDaysBetween('2024-01-15', 'invalid')).toBe(0)
      expect(calculateDaysBetween('invalid', 'invalid')).toBe(0)
    })

    it('should handle cross-month calculations', () => {
      expect(calculateDaysBetween('2024-01-30', '2024-02-05')).toBe(6)
    })

    it('should handle cross-year calculations', () => {
      expect(calculateDaysBetween('2023-12-30', '2024-01-02')).toBe(3)
    })
  })

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true)
      expect(isValidDate('2024-12-31')).toBe(true)
    })

    it('should return false for invalid dates', () => {
      expect(isValidDate('invalid-date')).toBe(false)
      expect(isValidDate('')).toBe(false)
      expect(isValidDate('2024-13-45')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidDate('2024-02-29')).toBe(true) // Leap year
      expect(isValidDate('2023-02-29')).toBe(false) // Not a leap year
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(false) // ISO strings don't match YYYY-MM-DD format
    })
  })

  describe('getQuarterFromDate', () => {
    it('should return correct quarter for Q1', () => {
      expect(getQuarterFromDate('2024-01-15')).toBe(1)
      expect(getQuarterFromDate('2024-02-28')).toBe(1)
      expect(getQuarterFromDate('2024-03-31')).toBe(1)
    })

    it('should return correct quarter for Q2', () => {
      expect(getQuarterFromDate('2024-04-01')).toBe(2)
      expect(getQuarterFromDate('2024-05-15')).toBe(2)
      expect(getQuarterFromDate('2024-06-30')).toBe(2)
    })

    it('should return correct quarter for Q3', () => {
      expect(getQuarterFromDate('2024-07-01')).toBe(3)
      expect(getQuarterFromDate('2024-08-15')).toBe(3)
      expect(getQuarterFromDate('2024-09-30')).toBe(3)
    })

    it('should return correct quarter for Q4', () => {
      expect(getQuarterFromDate('2024-10-01')).toBe(4)
      expect(getQuarterFromDate('2024-11-15')).toBe(4)
      expect(getQuarterFromDate('2024-12-31')).toBe(4)
    })

    it('should handle invalid dates', () => {
      expect(getQuarterFromDate('invalid-date')).toBe(0)
      expect(getQuarterFromDate('')).toBe(0)
    })
  })

  describe('addDays', () => {
    it('should add positive days correctly', () => {
      expect(addDays('2024-01-15', 5)).toBe('2024-01-20')
      expect(addDays('2024-01-30', 2)).toBe('2024-02-01') // Cross month
    })

    it('should subtract days when negative number provided', () => {
      expect(addDays('2024-01-15', -5)).toBe('2024-01-10')
      expect(addDays('2024-02-01', -2)).toBe('2024-01-30') // Cross month
    })

    it('should handle zero days', () => {
      expect(addDays('2024-01-15', 0)).toBe('2024-01-15')
    })

    it('should handle invalid dates', () => {
      expect(addDays('invalid-date', 5)).toBe('invalid-date')
      expect(addDays('', 5)).toBe('')
    })

    it('should handle cross-year additions', () => {
      expect(addDays('2023-12-30', 5)).toBe('2024-01-04')
    })

    it('should handle leap year calculations', () => {
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // Leap year
      expect(addDays('2023-02-28', 1)).toBe('2023-03-01') // Not leap year
    })
  })

  describe('getMonthName', () => {
    it('should return correct month names', () => {
      expect(getMonthName(1)).toBe('January')
      expect(getMonthName(6)).toBe('June')
      expect(getMonthName(12)).toBe('December')
    })

    it('should handle invalid month numbers', () => {
      expect(getMonthName(0)).toBe('Invalid Month')
      expect(getMonthName(13)).toBe('Invalid Month')
      expect(getMonthName(-1)).toBe('Invalid Month')
    })

    it('should handle edge cases', () => {
      expect(getMonthName(1.5 as unknown as number)).toBe('January') // Truncated
      expect(getMonthName(12.9 as unknown as number)).toBe('December') // Truncated
    })
  })
})