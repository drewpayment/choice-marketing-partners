/**
 * Unit tests for the shared payroll date year-range guardrail.
 *
 * These guard against the 2926-style production incident where an out-of-range
 * year was accepted and corrupted hundreds of records. The allowed range is
 * 2000 <= year <= currentYear + 1. Bounds are derived from `new Date()` in the
 * tests too (and a fixed clock is injected where boundaries matter) so the suite
 * does not become brittle as calendar years roll over.
 */

import {
  MIN_PAYROLL_YEAR,
  maxPayrollYear,
  isYearInRange,
  extractYear,
  isEmptyDateInput,
  assertPayrollDateInRange,
  PayrollDateRangeError,
  allowedRange,
  allowedRangeLabel,
} from '../dateValidation'

// Deterministic clock: pretend "now" is 2026-06-24 → max year = 2027.
const FIXED_NOW = new Date('2026-06-24T12:00:00Z')
const FIXED_MAX = 2027

describe('range bounds', () => {
  it('MIN_PAYROLL_YEAR is 2000', () => {
    expect(MIN_PAYROLL_YEAR).toBe(2000)
  })

  it('maxPayrollYear is currentYear + 1', () => {
    expect(maxPayrollYear(FIXED_NOW)).toBe(FIXED_MAX)
    // Derive from a live clock too, so the contract holds regardless of year.
    expect(maxPayrollYear()).toBe(new Date().getFullYear() + 1)
  })

  it('allowedRange / allowedRangeLabel expose the bounds', () => {
    expect(allowedRange(FIXED_NOW)).toEqual({ min: 2000, max: FIXED_MAX })
    expect(allowedRangeLabel(FIXED_NOW)).toBe('2000–2027')
  })
})

describe('isYearInRange', () => {
  it.each([
    [2000, true], // A7 lower boundary
    [1999, false], // A7 just below
    [2026, true],
    [FIXED_MAX, true], // A5 upper boundary Y+1
    [FIXED_MAX + 1, false], // A6 Y+2 rejected
    [2926, false], // the incident
    [1899, false],
    [9999, false],
    [1000, false],
    [226, false], // "0226"
    [0, false],
  ])('year %i → %s', (year, expected) => {
    expect(isYearInRange(year, FIXED_NOW)).toBe(expected)
  })

  it('rejects non-integers and NaN without throwing', () => {
    expect(isYearInRange(NaN, FIXED_NOW)).toBe(false)
    expect(isYearInRange(2026.5, FIXED_NOW)).toBe(false)
  })
})

describe('extractYear', () => {
  it('parses ISO YYYY-MM-DD', () => {
    expect(extractYear('2026-06-24')).toBe(2026)
    expect(extractYear('2926-06-24')).toBe(2926)
  })

  it('parses ISO with a time component', () => {
    expect(extractYear('2026-06-24T00:00:00Z')).toBe(2026)
  })

  it('parses US MM/DD/YYYY and MM-DD-YYYY', () => {
    expect(extractYear('06/24/2026')).toBe(2026)
    expect(extractYear('06-24-2026')).toBe(2026) // dropdown format
  })

  it('reads year from a Date object', () => {
    expect(extractYear(new Date('2026-06-24T12:00:00Z'))).toBe(2026)
  })

  it('returns null for empty / nullish', () => {
    expect(extractYear('')).toBeNull()
    expect(extractYear('   ')).toBeNull()
    expect(extractYear(null)).toBeNull()
    expect(extractYear(undefined)).toBeNull()
  })

  it('returns null for invalid Date objects', () => {
    expect(extractYear(new Date('not a date'))).toBeNull()
  })

  it('rejects malformed / two-digit years rather than coercing them (E3)', () => {
    expect(extractYear('26-06-24')).toBeNull()
    expect(extractYear('0226-06-24')).toBe(226) // 4-digit but out of range → caught by isYearInRange
    expect(extractYear('garbage')).toBeNull()
    expect(extractYear('24/06')).toBeNull()
  })

  it('preserves leap day without mangling (E1)', () => {
    expect(extractYear('2024-02-29')).toBe(2024)
  })
})

describe('isEmptyDateInput', () => {
  it('treats null/undefined/blank as empty, real values as non-empty', () => {
    expect(isEmptyDateInput(null)).toBe(true)
    expect(isEmptyDateInput(undefined)).toBe(true)
    expect(isEmptyDateInput('')).toBe(true)
    expect(isEmptyDateInput('  ')).toBe(true)
    expect(isEmptyDateInput('2026-06-24')).toBe(false)
    expect(isEmptyDateInput(new Date())).toBe(false)
  })
})

describe('assertPayrollDateInRange', () => {
  it('is a no-op for in-range dates', () => {
    expect(() => assertPayrollDateInRange('2026-06-24', 'issueDate', FIXED_NOW)).not.toThrow()
    expect(() => assertPayrollDateInRange('2000-01-01', 'issueDate', FIXED_NOW)).not.toThrow()
    expect(() => assertPayrollDateInRange(`${FIXED_MAX}-12-31`, 'issueDate', FIXED_NOW)).not.toThrow()
  })

  it('is a no-op for empty input — required-field logic owns that (E2/B6)', () => {
    expect(() => assertPayrollDateInRange('', 'issueDate', FIXED_NOW)).not.toThrow()
    expect(() => assertPayrollDateInRange(null, 'issueDate', FIXED_NOW)).not.toThrow()
    expect(() => assertPayrollDateInRange(undefined, 'issueDate', FIXED_NOW)).not.toThrow()
  })

  it('throws PayrollDateRangeError for out-of-range years', () => {
    expect(() => assertPayrollDateInRange('2926-06-24', 'issueDate', FIXED_NOW)).toThrow(
      PayrollDateRangeError
    )
    expect(() => assertPayrollDateInRange('1899-06-24', 'weekending', FIXED_NOW)).toThrow(
      PayrollDateRangeError
    )
    expect(() => assertPayrollDateInRange(`${FIXED_MAX + 1}-01-01`, 'issueDate', FIXED_NOW)).toThrow(
      PayrollDateRangeError
    )
    expect(() => assertPayrollDateInRange('1999-12-31', 'issueDate', FIXED_NOW)).toThrow(
      PayrollDateRangeError
    )
  })

  it('throws for malformed non-empty input (E3)', () => {
    expect(() => assertPayrollDateInRange('26-06-24', 'issueDate', FIXED_NOW)).toThrow(
      PayrollDateRangeError
    )
  })

  it('error carries actionable field + range metadata (A9)', () => {
    try {
      assertPayrollDateInRange('2926-06-24', 'sales[3].sale_date', FIXED_NOW)
      throw new Error('expected to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(PayrollDateRangeError)
      const e = err as PayrollDateRangeError
      expect(e.field).toBe('sales[3].sale_date')
      expect(e.year).toBe(2926)
      expect(e.range).toEqual({ min: 2000, max: FIXED_MAX })
      expect(e.message).toContain('2000–2027')
    }
  })
})
