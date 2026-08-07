/**
 * Shared "defensive JSON parse" helper.
 *
 * Several repositories read JSON-ish columns (`custom_fields`, `feature_list`,
 * ...) that are stored as a JSON-encoded string on MySQL today but arrive
 * pre-parsed (object/array) once a column moves to Postgres `jsonb` in a later
 * migration phase. `InvoiceRepository.ts` established the "both ways" guard —
 * `typeof v === 'string' ? JSON.parse(v) : v` — for that transition; this
 * helper generalizes it and additionally never throws: malformed JSON is
 * logged and degrades to a caller-supplied fallback instead of taking down
 * the request.
 *
 * `InvoiceRepository`'s existing inline guard on `custom_fields` predates this
 * helper and still works; unifying it here is deferred (Phase 2 scope).
 */

import { logger } from '@/lib/utils/logger'

/**
 * Parse a value that may already be a string-encoded JSON payload, an
 * already-parsed value (object/array/etc.), or nullish.
 *
 * - `null`/`undefined` → returns `fallback` (no parse attempted, no log).
 * - non-string values → returned as-is (already parsed).
 * - string values → `JSON.parse`d; on failure, logs a warning and returns
 *   `fallback` instead of throwing.
 *
 * @param value - the raw column value.
 * @param fallback - value to return when `value` is nullish or malformed JSON.
 * @param context - short label included in the warning log to identify the
 *   call site (e.g. `'PayrollRepository.custom_fields'`).
 */
export function safeJsonParse<T>(value: unknown, fallback: T, context?: string): T {
  if (value === null || value === undefined) {
    return fallback
  }

  if (typeof value !== 'string') {
    return value as T
  }

  try {
    return JSON.parse(value) as T
  } catch (error) {
    logger.warn(
      `safeJsonParse: failed to parse JSON${context ? ` for ${context}` : ''}`,
      error
    )
    return fallback
  }
}
