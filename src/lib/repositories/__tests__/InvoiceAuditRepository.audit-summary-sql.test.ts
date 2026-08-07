/**
 * Compile-only SQL assertions for InvoiceAuditRepository.getAuditSummary's
 * date-range filter.
 *
 * getAuditSummary used to build its date filter as
 * `.where(({ eb }) => eb.fn('DATE', [...]), '>=', fromDate)` — a factory
 * function passed as the `lhs` of the 3-arg `where(lhs, op, rhs)` overload,
 * instead of the 1-arg `where(callback)` form Kysely's `where` API is meant
 * to be used with for building boolean expressions. The fix replaces the
 * DATE()-wrapped column with a half-open range on the raw column
 * (col >= from AND col < to+1day): sargable and Postgres-portable.
 *
 * Following the pattern in EmployeeRepository.email-sql.test.ts: drive a real
 * Kysely instance wired to a compile-only (Dummy) driver so the emitted MySQL
 * — and the exact bound parameters — are asserted verbatim. A hand-rolled
 * chainable `where` mock (as used in InvoiceAuditRepository.rbac.test.ts)
 * can't see *inside* the predicate being built, so it can't catch this class
 * of bug.
 */
/* eslint-disable no-var */
var capturedQueries: { sql: string; parameters: readonly unknown[] }[]
/* eslint-enable no-var */

jest.mock('@/lib/database/client', () => {
  const {
    Kysely,
    MysqlAdapter,
    MysqlIntrospector,
    MysqlQueryCompiler,
    DummyDriver,
  } = jest.requireActual('kysely')

  capturedQueries = []

  return {
    db: new Kysely({
      dialect: {
        createAdapter: () => new MysqlAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (kysely: never) => new MysqlIntrospector(kysely),
        createQueryCompiler: () => new MysqlQueryCompiler(),
      },
      log: (event: { level: string; query: { sql: string; parameters: readonly unknown[] } }) => {
        if (event.level === 'query') {
          capturedQueries.push({ sql: event.query.sql, parameters: event.query.parameters })
        }
      },
    }),
  }
})

import dayjs from 'dayjs'
import { InvoiceAuditRepository } from '../InvoiceAuditRepository'
import type { UserContext } from '@/lib/auth/types'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

describe('InvoiceAuditRepository.getAuditSummary — date filter SQL', () => {
  let repo: InvoiceAuditRepository

  beforeEach(() => {
    repo = new InvoiceAuditRepository()
    capturedQueries.length = 0
  })

  it('constrains the totals query to a half-open range on the raw changed_at column', async () => {
    await repo.getAuditSummary(undefined, '01-01-2026', '01-31-2026', adminCtx)

    // Call order inside getAuditSummary: totalChanges is the first query run.
    const totalsQuery = capturedQueries[0]
    expect(totalsQuery.sql).toContain('where `ia`.`changed_at` >= ? and `ia`.`changed_at` < ?')

    // Must not regress to the index-hostile DATE() wrapping.
    expect(totalsQuery.sql).not.toContain('DATE(')

    const [fromParam, toParam] = totalsQuery.parameters
    expect(fromParam).toBeInstanceOf(Date)
    expect(toParam).toBeInstanceOf(Date)
    // Bounds are asserted in LOCAL time, matching how the repository builds
    // them (`dayjs(...).startOf('day')` is local midnight) and how mysql2's
    // sqlstring serialises a Date (local getters). Formatting via
    // `toISOString()` here would be a UTC round-trip and would report the
    // previous calendar day under any UTC+ runner timezone — making the
    // assertion depend on where the suite runs.
    // Lower bound: start of dateFrom's day.
    expect(dayjs(fromParam as Date).format('YYYY-MM-DD HH:mm:ss')).toBe('2026-01-01 00:00:00')
    // Upper bound is EXCLUSIVE: the day *after* dateTo (half-open range), not
    // dateTo itself — a same-day value here is exactly what the old
    // DATE(col) <= dateTo comparison produced, and would silently reintroduce
    // the DATE()-wrapping this fix removes.
    expect(dayjs(toParam as Date).format('YYYY-MM-DD HH:mm:ss')).toBe('2026-02-01 00:00:00')
  })

  it('applies the same range to every derived query sharing the base filter (status/amount/recent/top-N)', async () => {
    await repo.getAuditSummary(undefined, '01-01-2026', '01-31-2026', adminCtx)

    expect(capturedQueries.length).toBeGreaterThanOrEqual(6)
    for (const q of capturedQueries) {
      expect(q.sql).toContain('`ia`.`changed_at` >= ?')
      expect(q.sql).not.toContain('DATE(')
    }
  })

  it('constrains the recent-changes (30-day) query to a raw-column lower bound, not DATE()', async () => {
    await repo.getAuditSummary(undefined, undefined, undefined, adminCtx)

    // Call order: totalChanges(0), statusChanges(1), amountChanges(2),
    // recentChanges(3), topChangedStatuses(4), topChangingUsers(5).
    const recentChangesQuery = capturedQueries[3]
    expect(recentChangesQuery.sql).toContain('`ia`.`changed_at` >= ?')
    expect(recentChangesQuery.sql).not.toContain('DATE(')
    expect(recentChangesQuery.parameters[0]).toBeInstanceOf(Date)
  })

  it('omits the date filter entirely when no bounds are given (no unconstrained DATE() noise)', async () => {
    await repo.getAuditSummary(undefined, undefined, undefined, adminCtx)

    const totalsQuery = capturedQueries[0]
    expect(totalsQuery.sql).not.toContain('changed_at')
  })

  // `dateFrom`/`dateTo` arrive unvalidated off the query string
  // (src/app/api/invoices/search/route.ts). An unparseable value must not be
  // bound as a JS `Invalid Date`: the driver serialises that to the SQL literal
  // `NULL`, so `changed_at >= NULL` is NULL and the dashboard would render
  // zeroes across the board — a silent wrong answer on a financial audit
  // surface. Fail loudly instead (the route's catch turns this into the same
  // HTTP 500 the engine's own type error produced before this change).
  it.each([
    ['dateFrom', 'not-a-date', undefined],
    ['dateTo', undefined, 'not-a-date'],
  ])('rejects an unparseable %s instead of binding an Invalid Date', async (field, from, to) => {
    await expect(repo.getAuditSummary(undefined, from, to, adminCtx)).rejects.toThrow(
      `Invalid ${field} filter: not-a-date`
    )

    // Nothing may reach the database on the rejected path.
    expect(capturedQueries).toHaveLength(0)
  })
})
