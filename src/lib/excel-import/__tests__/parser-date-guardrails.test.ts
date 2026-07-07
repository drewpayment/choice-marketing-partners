/**
 * Area D: Excel importer year-range guardrails.
 *
 * Verifies that `validateAndFormatRow` (which delegates date handling to the
 * internal `validateAndFormatDate`) rejects out-of-range years from ISO strings,
 * US strings, and Excel serial numbers, while still importing valid dates to
 * YYYY-MM-DD. The accept/reject decisions must match the shared range used by
 * the server and client (criterion D4) — we assert that by deriving the boundary
 * years from the same `maxPayrollYear()` helper.
 */

import * as XLSX from 'xlsx'
import { validateAndFormatRow, setDateFormat } from '../parser'
import { MIN_PAYROLL_YEAR, maxPayrollYear } from '@/lib/utils/dateValidation'

const MAX_YEAR = maxPayrollYear()

/** Build a minimal valid row, overriding sale_date. Single mode keeps it lean. */
function rowWith(saleDate: unknown): Record<string, unknown> {
  return {
    sale_date: saleDate,
    first_name: 'Jane',
    last_name: 'Doe',
    status: 'sold',
    amount: 100,
  }
}

/** Excel serial number for a given calendar date (1900 date system). */
function excelSerial(year: number, month: number, day: number): number {
  // XLSX exposes the inverse of parse_date_code via datenum on the SSF table.
  // Fall back to a manual computation if not present.
  const ssf = XLSX.SSF as unknown as {
    parse_date_code: (n: number) => { y: number; m: number; d: number } | null
  }
  // Binary-free approach: days since 1899-12-30 (Excel epoch).
  const epoch = Date.UTC(1899, 11, 30)
  const target = Date.UTC(year, month - 1, day)
  const serial = Math.round((target - epoch) / 86400000)
  // Sanity check round-trips through the same lib the parser uses.
  const parsed = ssf.parse_date_code(serial)
  expect(parsed).toMatchObject({ y: year, m: month, d: day })
  return serial
}

beforeEach(() => {
  setDateFormat('auto')
})

describe('validateAndFormatRow — date year range (Area D)', () => {
  it('D3: valid ISO date imports to YYYY-MM-DD', () => {
    const result = validateAndFormatRow(rowWith('2026-06-24'), 1, true)
    expect(result.valid).toBe(true)
    expect(result.formatted.sale_date).toBe('2026-06-24')
  })

  it('D3: valid US date imports to YYYY-MM-DD', () => {
    setDateFormat('US')
    const result = validateAndFormatRow(rowWith('06/24/2026'), 1, true)
    expect(result.valid).toBe(true)
    expect(result.formatted.sale_date).toBe('2026-06-24')
  })

  it('D3: valid Excel serial imports to YYYY-MM-DD', () => {
    const serial = excelSerial(2025, 9, 7)
    const result = validateAndFormatRow(rowWith(serial), 1, true)
    expect(result.valid).toBe(true)
    expect(result.formatted.sale_date).toBe('2025-09-07')
  })

  it('D1: year 2926 (the incident) is rejected with a range-naming error', () => {
    const result = validateAndFormatRow(rowWith('2926-06-24'), 5, true)
    expect(result.valid).toBe(false)
    const err = result.errors.find(e => e.field === 'sale_date')
    expect(err).toBeDefined()
    expect(err!.row).toBe(5)
    expect(err!.message).toContain(`${MIN_PAYROLL_YEAR}`)
    expect(err!.message).toContain(`${MAX_YEAR}`)
    expect(result.formatted.sale_date).toBeUndefined()
  })

  it.each([
    ['1899-12-31', 1899],
    ['9999-01-01', 9999],
    ['1999-12-31', 1999],
  ])('D1: out-of-range %s rejected', (input) => {
    const result = validateAndFormatRow(rowWith(input), 2, true)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'sale_date')).toBe(true)
  })

  it('A7 boundary: 2000 accepted', () => {
    const result = validateAndFormatRow(rowWith('2000-01-01'), 1, true)
    expect(result.valid).toBe(true)
    expect(result.formatted.sale_date).toBe('2000-01-01')
  })

  it('A5 boundary: Y+1 accepted', () => {
    const result = validateAndFormatRow(rowWith(`${MAX_YEAR}-12-31`), 1, true)
    expect(result.valid).toBe(true)
    expect(result.formatted.sale_date).toBe(`${MAX_YEAR}-12-31`)
  })

  it('A6 boundary: Y+2 rejected', () => {
    const result = validateAndFormatRow(rowWith(`${MAX_YEAR + 1}-01-01`), 1, true)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'sale_date')).toBe(true)
  })

  it('D2: mis-mapped numeric column resolving to a far-future year is rejected', () => {
    // A large serial that lands well past Y+1 (e.g. year ~9999).
    const serial = excelSerial(9999, 1, 1)
    const result = validateAndFormatRow(rowWith(serial), 7, true)
    expect(result.valid).toBe(false)
    const err = result.errors.find(e => e.field === 'sale_date')
    expect(err).toBeDefined()
    expect(err!.message).toContain(`${MAX_YEAR}`)
  })

  it('E1: leap day 2024-02-29 accepted and not mangled', () => {
    const result = validateAndFormatRow(rowWith('2024-02-29'), 1, true)
    expect(result.valid).toBe(true)
    expect(result.formatted.sale_date).toBe('2024-02-29')
  })

  it('E2: empty sale_date falls through to required-field error (range check does not throw)', () => {
    const result = validateAndFormatRow(rowWith(''), 1, true)
    expect(result.valid).toBe(false)
    const err = result.errors.find(e => e.field === 'sale_date')
    expect(err!.message).toContain('required')
  })
})
