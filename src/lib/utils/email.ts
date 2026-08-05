/**
 * Email identity helpers shared by the employee repository, the employee API
 * routes and the admin employee form.
 *
 * Kept free of any database/server imports so client components can use the
 * message/normalisation helpers without pulling the Kysely client into the
 * browser bundle.
 */

/** `users.email` / `employees.email` are varchar(255). */
export const EMAIL_COLUMN_MAX_LENGTH = 255

/**
 * Canonical form used for comparisons and for NEW values written to the
 * database. MySQL compares these columns case-insensitively
 * (utf8mb3_unicode_ci) while JavaScript does not, so every comparison the app
 * makes must go through here. Existing stored values are never rewritten.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Who currently owns an email address.
 *
 * - `source: 'employee'` — a live (not soft-deleted) `employees` row.
 * - `source: 'user'` — a `users` row (the login identity, which carries the
 *   UNIQUE index). `employeeId`/`employeeName` are resolved through
 *   `employee_user` when the account is linked to an employee.
 */
export interface EmailOwnerInfo {
  source: 'employee' | 'user'
  employeeId: number | null
  employeeName: string | null
  /** True when the owning employee row is soft-deleted (only possible for `user` matches). */
  employeeDeleted: boolean
}

/**
 * Build the admin-facing conflict message. Never includes the conflicting
 * email address of another account — names and ids only.
 */
export function emailConflictMessage(owner: EmailOwnerInfo | null): string {
  if (!owner) {
    return 'Email address is already in use.'
  }

  const label = owner.employeeName
    ? `${owner.employeeName} (#${owner.employeeId})`
    : `#${owner.employeeId}`

  if (owner.source === 'employee') {
    return `Email address is already in use by employee ${label}.`
  }

  if (owner.employeeId === null) {
    return 'Email address is already in use by a login account not linked to any employee.'
  }

  if (owner.employeeDeleted) {
    // No "restore that employee to release it" advice: restoring only releases
    // addresses parked by this app, never a legacy row parked by nothing.
    return `Email address is already in use by the login account of deleted employee ${label}.`
  }

  return `Email address is already in use by the login account of employee ${label}.`
}

/**
 * Prefix applied to a login email while its employee is soft-deleted, so the
 * address stops reserving the `users_email_unique` index (and stops working as
 * a login). The `userUid` form is the collision fallback.
 */
export function parkedEmailPrefix(employeeId: number, userUid?: number): string {
  return userUid === undefined
    ? `deleted-${employeeId}.`
    : `deleted-${employeeId}-${userUid}.`
}

const PARKED_EMAIL_PATTERN = /^deleted-\d+(?:-\d+)?\./

/** True when the value already carries a parking prefix (parking is idempotent). */
export function isParkedEmail(email: string): boolean {
  return PARKED_EMAIL_PATTERN.test(email)
}

/**
 * Raised when parking an address would overflow the column. Carries a
 * user-facing message so the delete route can return it as a 400 instead of an
 * opaque 500.
 */
export class ParkedEmailTooLongError extends Error {
  readonly name = 'ParkedEmailTooLongError'

  constructor(message: string) {
    super(message)
  }
}

/** True for {@link ParkedEmailTooLongError}, without relying on `instanceof`. */
export function isParkTooLongError(error: unknown): error is ParkedEmailTooLongError {
  return error instanceof Error && error.name === 'ParkedEmailTooLongError'
}

/**
 * Parked value for `email`.
 *
 * Never truncates: a truncated prefix would silently corrupt the address that
 * restore later un-parks. Throws instead, which aborts the delete transaction.
 */
export function buildParkedEmail(employeeId: number, email: string, userUid?: number): string {
  const parked = `${parkedEmailPrefix(employeeId, userUid)}${email}`

  if (parked.length > EMAIL_COLUMN_MAX_LENGTH) {
    throw new ParkedEmailTooLongError(
      `Login email too long to park for employee ${employeeId}: the parked value would be ` +
      `${parked.length} characters (max ${EMAIL_COLUMN_MAX_LENGTH}). ` +
      'Shorten or clear the login email before deleting this employee.'
    )
  }

  return parked
}

/**
 * Strip this employee's parking prefix. Returns `null` when the value is not
 * parked for this employee (leave it alone in that case).
 */
export function unparkEmail(email: string, employeeId: number, userUid: number): string | null {
  for (const prefix of [parkedEmailPrefix(employeeId, userUid), parkedEmailPrefix(employeeId)]) {
    if (email.startsWith(prefix)) {
      return email.slice(prefix.length)
    }
  }
  return null
}
