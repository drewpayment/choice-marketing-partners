/**
 * Shared payroll date year-range guardrails.
 *
 * Single source of truth (acceptance criterion E4) consumed by:
 *  - the invoice client form (InvoiceEditor)
 *  - the authoritative server route (POST /api/invoices)
 *  - the invoice repository (defense-in-depth backstop)
 *  - the Excel/CSV importer (validateAndFormatDate)
 *
 * Background: a production incident occurred when an issue date year was
 * mistyped as 2926 instead of 2026. It was accepted with zero validation,
 * re-selected from a dropdown across an entire pay run, and corrupted ~333
 * invoices plus related paystubs/overrides/expenses/payroll rows.
 *
 * Allowed range: 2000 <= year <= currentYear + 1 (inclusive).
 *  - Lower bound 2000: no legitimate payroll predates it; rejects 2-digit fat-fingers.
 *  - Upper bound currentYear+1: covers entering an upcoming pay period that crosses
 *    a year boundary in late December; +2 and beyond is the typo class (2926).
 */

/** Inclusive lower bound for any payroll-related date year. */
export const MIN_PAYROLL_YEAR = 2000

/**
 * Inclusive upper bound for any payroll-related date year.
 * Derived from the system clock so it never needs a code change as years roll over.
 */
export function maxPayrollYear(now: Date = new Date()): number {
  return now.getFullYear() + 1
}

/** True when `year` is a finite integer within [MIN_PAYROLL_YEAR, maxPayrollYear()]. */
export function isYearInRange(year: number, now: Date = new Date()): boolean {
  if (!Number.isInteger(year)) {
    return false
  }
  return year >= MIN_PAYROLL_YEAR && year <= maxPayrollYear(now)
}

/**
 * Human-readable description of the allowed range, e.g. "2000–2027".
 * Used in error messages so the user knows exactly what is acceptable.
 */
export function allowedRangeLabel(now: Date = new Date()): string {
  return `${MIN_PAYROLL_YEAR}–${maxPayrollYear(now)}`
}

/**
 * Machine-readable allowed-range descriptor for API error bodies (criterion A9).
 */
export function allowedRange(now: Date = new Date()): { min: number; max: number } {
  return { min: MIN_PAYROLL_YEAR, max: maxPayrollYear(now) }
}

/**
 * Error thrown by {@link assertPayrollDateInRange} when a date's year is out of range.
 * Typed so callers (e.g. the API route) can distinguish a guardrail rejection from
 * an unexpected failure and translate it into a 400 response.
 */
export class PayrollDateRangeError extends Error {
  readonly field: string
  readonly year: number | null
  readonly range: { min: number; max: number }

  constructor(field: string, year: number | null, now: Date = new Date()) {
    const range = allowedRange(now)
    const yearText = year === null ? 'an unparseable value' : `year ${year}`
    super(
      `Invalid ${field}: ${yearText} is outside the allowed payroll range ${range.min}–${range.max}.`
    )
    this.name = 'PayrollDateRangeError'
    this.field = field
    this.year = year
    this.range = range
  }
}

/**
 * Extract a 4-digit year from a Date or a date string without relying on
 * locale-dependent native Date parsing (which silently coerces malformed input).
 *
 * Accepts:
 *  - `Date` objects (uses local getFullYear)
 *  - ISO-ish `YYYY-MM-DD` (optionally with a time component) strings
 *  - `MM/DD/YYYY` and `MM-DD-YYYY` strings (the formats used across this app)
 *
 * Returns `null` when no unambiguous 4-digit year can be extracted. Callers that
 * need to reject malformed input should treat `null` as out-of-range; callers
 * that allow empty/undefined values (required-field logic owns that) should
 * skip the check when the input is empty (see {@link assertPayrollDateInRange}).
 */
export function extractYear(dateInput: Date | string | null | undefined): number | null {
  if (dateInput == null) {
    return null
  }

  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? null : dateInput.getFullYear()
  }

  const trimmed = String(dateInput).trim()
  if (trimmed === '') {
    return null
  }

  // ISO form: YYYY-MM-DD or YYYY-MM-DDThh:mm... — year must be exactly 4 digits.
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/)
  if (isoMatch) {
    return parseInt(isoMatch[1], 10)
  }

  // US form: MM/DD/YYYY or MM-DD-YYYY — year must be exactly 4 digits.
  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (usMatch) {
    return parseInt(usMatch[3], 10)
  }

  // Anything else (2-digit years, "26-06-24", "0226-06-24" with non-4-digit year,
  // free text) is intentionally rejected rather than coerced (criterion E3).
  return null
}

/**
 * Returns true when the input is empty (null/undefined/blank string) and therefore
 * should be deferred to required-field validation rather than the range check
 * (criteria B6 / E2 — the range check must not throw on undefined/NaN/empty).
 */
export function isEmptyDateInput(dateInput: Date | string | null | undefined): boolean {
  if (dateInput == null) {
    return true
  }
  if (dateInput instanceof Date) {
    return false
  }
  return String(dateInput).trim() === ''
}

/**
 * Assert that a payroll date's year is within the allowed range.
 *
 * - Empty input (null/undefined/blank) is a no-op: required-field validation owns
 *   that case (criteria E2 / B6). This function never throws on empty input.
 * - Non-empty but unparseable input (e.g. "26-06-24") throws (criterion E3).
 * - In-range parsed year is a no-op.
 * - Out-of-range parsed year throws {@link PayrollDateRangeError}.
 *
 * @param dateInput a Date or date string (YYYY-MM-DD / MM-DD-YYYY / MM/DD/YYYY)
 * @param fieldName the field being validated, surfaced in the error message/body
 * @param now optional clock injection for deterministic tests
 */
export function assertPayrollDateInRange(
  dateInput: Date | string | null | undefined,
  fieldName: string,
  now: Date = new Date()
): void {
  if (isEmptyDateInput(dateInput)) {
    return
  }

  const year = extractYear(dateInput)
  if (year === null || !isYearInRange(year, now)) {
    throw new PayrollDateRangeError(fieldName, year, now)
  }
}
