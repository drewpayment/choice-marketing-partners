import { sql, type RawBuilder } from 'kysely'

/**
 * MySQL-compatible numeric coercion for text-typed money columns.
 *
 * ## Why this exists
 *
 * `invoices.amount` is `character varying(255)` — a Laravel-era schema wart that
 * survived the pgloader import (verify with `\d invoices`; every *other* money
 * column — `overrides.total`, `expenses.amount`, `advances.amount`,
 * `paystubs.amount`, `payroll.amount` — is a real `numeric`).
 *
 * MySQL silently coerces that varchar to DOUBLE inside `SUM()`, so
 * `SUM(invoices.amount)` has always "just worked". Postgres has no
 * `sum(character varying)` overload at all, so the *same* query fails at parse
 * time regardless of the rows involved:
 *
 * ```
 * ERROR: function sum(character varying) does not exist
 * ```
 *
 * A naive `amount::numeric` cast is NOT a valid fix. The production snapshot
 * stores rejection reasons in this column instead of numbers — 26 empty strings
 * plus 21 distinct free-text values ('Canceled After Enrollment', 'NA', 'N/A',
 * 'NaN', 'Account Blocked', …) across ~670 rows. `sum(amount::numeric)` throws
 * `invalid input syntax for type numeric: "NA"`, which would turn a wrong-total
 * bug into a hard outage and would also blow up the §4 reconciliation gate.
 *
 * ## What this reproduces
 *
 * MySQL's string→number conversion takes the **leading numeric prefix** of the
 * string and yields 0 when there is none (`'NA'` → 0, `''` → 0, `'12abc'` → 12,
 * `' 3.5'` → 3.5). `substring(… from '^[+-]?[0-9]*\.?[0-9]+')` extracts exactly
 * that prefix; `coalesce(…, 0)` supplies MySQL's zero for a non-match.
 *
 * Verified against both live containers on the same snapshot:
 * `SELECT SUM(amount) FROM invoices` on `choice-mysql-dev` → `4835317.880000002`
 * (DOUBLE, hence the float noise); `sumNumericText('amount')` on
 * `choice-postgres-dev` → `4835317.880` (exact `numeric`). Identical to the cent,
 * per (agentid, vendor, issue_date) group as well as in aggregate.
 *
 * ## Use the same expression everywhere
 *
 * Per plan §4, the cutover proof gate diffs `SUM(amount)` per
 * agent/vendor/issue-date across both engines. Any site that sums this column —
 * app code *and* the reconciliation query — must use this one coercion, or the
 * gate reports a false diff. That is why this is a shared helper rather than an
 * inline cast at each call site.
 *
 * **Follow-up (not done here):** the real fix is to scrub the free-text values
 * into a status column and migrate `invoices.amount` to `numeric(19,4)` to match
 * its siblings, then regenerate `types.ts`. That is a data migration with its own
 * blast radius and does not belong in the driver port.
 */

/** POSIX pattern matching MySQL's leading-numeric-prefix conversion. */
const LEADING_NUMERIC = String.raw`^[+-]?[0-9]*\.?[0-9]+`

/**
 * A single text column coerced to `numeric` the way MySQL would coerce it.
 * Never throws on non-numeric text — it yields 0, exactly like MySQL.
 */
export function numericFromText(column: string): RawBuilder<string> {
  return sql<string>`coalesce(substring(btrim(${sql.ref(column)}) from ${sql.lit(
    LEADING_NUMERIC
  )})::numeric, 0)`
}

/**
 * `SUM()` over a text-typed money column, with MySQL's coercion semantics.
 *
 * Drop-in replacement for `db.fn.sum('amount')` on `invoices`. Returns the
 * Postgres `numeric` as a string (same as `db.fn.sum` does at runtime), so the
 * existing `parseFloat(row.total?.toString() || '0')` convention is unchanged —
 * including the `SUM()`-over-zero-rows → `NULL` → `'0'` path.
 */
export function sumNumericText(column: string): RawBuilder<string> {
  return sql<string>`sum(${numericFromText(column)})`
}
