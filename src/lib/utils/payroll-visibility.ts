/**
 * Paystub release / visibility rules for non-admin users.
 *
 * Business rule (ported from the legacy Laravel PaystubService):
 * A paystub dated `issue_date` (payday, e.g. a Wednesday) is released to
 * employees and managers at the configured restriction time on the day BEFORE
 * the issue date (e.g. 8:00pm the preceding Tuesday). Before that moment the
 * paystub must stay hidden from non-admins even though it has already been
 * generated. Admins are never restricted.
 *
 * Expressed against "now", this reduces to a simple inclusive date cutoff:
 *   - if the current local time is at/after the release time, paystubs dated up
 *     to and including tomorrow are visible;
 *   - otherwise only paystubs dated up to and including today are visible.
 * Past-dated paystubs are therefore always visible, and future-dated ones stay
 * hidden until their release moment arrives.
 *
 * Times are evaluated in the business timezone so behaviour is consistent
 * regardless of where the server runs.
 */

/** Timezone the business operates in (matches the legacy app). */
export const PAYROLL_TIMEZONE = 'America/Detroit'

/** Defaults used when no payroll_restriction row is configured (8:00pm). */
export const DEFAULT_RELEASE_HOUR = 20
export const DEFAULT_RELEASE_MINUTE = 0

export interface PayrollReleaseTime {
  hour: number
  minute: number
}

interface LocalDateParts {
  /** Local calendar date in YYYY-MM-DD form. */
  dateString: string
  hour: number
  minute: number
}

/**
 * Extract the calendar date and time-of-day for an instant, evaluated in the
 * given IANA timezone. Uses the built-in Intl API so no extra dependency or
 * dayjs plugin is required.
 */
function getLocalDateParts(now: Date, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00'

  return {
    dateString: `${get('year')}-${get('month')}-${get('day')}`,
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
  }
}

/**
 * Add (or subtract) whole days to a YYYY-MM-DD date string without introducing
 * timezone drift.
 */
function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** Normalize an issue_date (string or Date) to a YYYY-MM-DD string. */
export function toIssueDateString(issueDate: string | Date): string {
  if (typeof issueDate === 'string') {
    return issueDate.slice(0, 10)
  }
  // Mirror the rest of the codebase, which derives the date portion via ISO.
  return issueDate.toISOString().slice(0, 10)
}

/**
 * The latest paystub issue_date (inclusive, YYYY-MM-DD) that a non-admin user
 * may currently see. Apply as `DATE(issue_date) <= cutoff` in queries, or
 * compare directly against a single paystub's issue date.
 */
export function getEmployeeVisibilityCutoff(
  release: PayrollReleaseTime = {
    hour: DEFAULT_RELEASE_HOUR,
    minute: DEFAULT_RELEASE_MINUTE,
  },
  now: Date = new Date()
): string {
  const { dateString, hour, minute } = getLocalDateParts(now, PAYROLL_TIMEZONE)
  const released = hour * 60 + minute >= release.hour * 60 + release.minute
  return released ? addDays(dateString, 1) : dateString
}

/**
 * Whether a non-admin user may view a paystub with the given issue_date right
 * now, based on the configured release time.
 */
export function isPaystubReleasedForEmployee(
  issueDate: string | Date,
  release?: PayrollReleaseTime,
  now: Date = new Date()
): boolean {
  const cutoff = getEmployeeVisibilityCutoff(release, now)
  return toIssueDateString(issueDate) <= cutoff
}
