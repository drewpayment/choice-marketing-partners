/**
 * Compiled-Postgres-SQL assertions for the payroll money-writing core.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every other suite in this group (PayrollRepository.deletion/scope,
 * AdvanceRepository.rbac/resync, ScheduledExpenseRepository,
 * InvoiceRepository.simple.pg-writes) drives a hand-rolled chainable jest mock of
 * `@/lib/database/client`. That mock accepts *any* SQL — `fn.sum` returns an inert
 * stub — which is exactly how "162 tests passing" coexisted with two hard
 * `function sum(character varying) does not exist` outages in the same files.
 *
 * Here the repositories run against a REAL Kysely instance wired to
 * `PostgresQueryCompiler` and a probe driver, so the emitted Postgres SQL and the
 * bound parameter values are asserted verbatim. The probe driver also lets each
 * test feed rows back, so code paths that a `DummyDriver` would short-circuit
 * (transaction bodies that bail when a lookup returns nothing) are reachable.
 *
 * Note this proves the SQL SHAPE, not that Postgres accepts it. The companion
 * `pg-live.integration.test.ts` (opt-in, needs a real container) is what proves
 * acceptance.
 */

/* eslint-disable no-var */
var capturedQueries: Array<{ sql: string; parameters: readonly unknown[] }>
var respondWith: (sql: string) => Record<string, unknown>[]
/* eslint-enable no-var */

jest.mock('@/lib/database/client', () => {
  const {
    Kysely,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
  } = jest.requireActual('kysely')

  capturedQueries = []
  respondWith = () => []

  const driver = {
    init: async () => {},
    acquireConnection: async () => ({
      executeQuery: async (compiled: { sql: string; parameters: readonly unknown[] }) => {
        capturedQueries.push({ sql: compiled.sql, parameters: compiled.parameters })
        return { rows: respondWith(compiled.sql) }
      },
      streamQuery: async function* () {
        throw new Error('streaming not used')
      },
    }),
    beginTransaction: async () => {},
    commitTransaction: async () => {},
    rollbackTransaction: async () => {},
    releaseConnection: async () => {},
    destroy: async () => {},
  }

  return {
    db: new Kysely({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => driver,
        createIntrospector: (kysely: never) => new PostgresIntrospector(kysely),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      },
    }),
  }
})

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
}))

jest.mock('../VendorFieldRepository', () => ({
  VendorFieldRepository: jest.fn().mockImplementation(() => ({
    getFieldsByVendor: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import type { UserContext } from '@/lib/auth/types'
import { PayrollRepository } from '../PayrollRepository'
import { AdvanceRepository } from '../AdvanceRepository'
import { db } from '@/lib/database/client'
import { sumNumericText } from '@/lib/database/numeric-text'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

/** The one coercion every `SUM(invoices.amount)` site must emit. */
const COERCED_SUM =
  `sum(coalesce(substring(btrim("amount") from '^[+-]?[0-9]*\\.?[0-9]+')::numeric, 0))`

const findSql = (needle: string) =>
  capturedQueries.filter((q) => q.sql.includes(needle)).map((q) => q.sql)

describe('PayrollRepository — emitted Postgres SQL', () => {
  let repo: PayrollRepository

  beforeEach(() => {
    capturedQueries.length = 0
    respondWith = () => []
    repo = new PayrollRepository()
  })

  describe('SUM over the varchar invoices.amount column', () => {
    // `invoices.amount` is character varying(255). Postgres has NO
    // sum(character varying) overload, so `sum("amount")` fails at PARSE time —
    // no rows required. A bare `::numeric` cast is equally fatal: the snapshot
    // stores rejection reasons ('NA', 'Canceled After Enrollment', …) in this
    // column. Both failure modes are invisible to a mocked `db.fn.sum`.

    it('getBatchSalesTotals coerces instead of calling sum(varchar)', async () => {
      await (repo as unknown as {
        getBatchSalesTotals: (c: unknown[]) => Promise<unknown>
      }).getBatchSalesTotals([
        { agentId: '9', vendorId: 1, issueDate: '2017-03-08', originalAgentId: '9' },
      ])

      const [sql] = findSql('from "invoices"')
      expect(sql).toBeDefined()
      expect(sql).toContain(COERCED_SUM)
      // The exact regression that took /payroll down.
      expect(sql).not.toMatch(/sum\("amount"\)/)
      expect(sql).not.toMatch(/"amount"::numeric/)
    })

    it('getSalesTotal coerces instead of calling sum(varchar)', async () => {
      await (repo as unknown as {
        getSalesTotal: (a: string, v: number, d: string) => Promise<number>
      }).getSalesTotal('9', 1, '2017-03-08')

      const [sql] = findSql('from "invoices"')
      expect(sql).toContain(COERCED_SUM)
      expect(sql).not.toMatch(/sum\("amount"\)/)
    })

    it('leaves the genuinely numeric sibling columns alone', async () => {
      await (repo as unknown as {
        getBatchOverridesTotals: (c: unknown[]) => Promise<unknown>
        getBatchExpensesTotals: (c: unknown[]) => Promise<unknown>
      }).getBatchOverridesTotals([
        { agentId: '9', vendorId: 1, issueDate: '2017-03-08', originalAgentId: '9' },
      ])
      await (repo as unknown as {
        getBatchExpensesTotals: (c: unknown[]) => Promise<unknown>
      }).getBatchExpensesTotals([
        { agentId: '9', vendorId: 1, issueDate: '2017-03-08', originalAgentId: '9' },
      ])

      // overrides.total and expenses.amount are real `numeric` — wrapping them in
      // the text coercion would be wrong (it would silently zero a NULL-free
      // numeric that happens to be out of the regex's shape).
      expect(findSql('from "overrides"')[0]).toContain('sum("total")')
      expect(findSql('from "expenses"')[0]).toContain('sum("amount")')
      expect(findSql('from "overrides"')[0]).not.toContain('btrim')
      expect(findSql('from "expenses"')[0]).not.toContain('btrim')
    })
  })

  describe('getPayrollSummary ordering', () => {
    it('emits a fully deterministic ORDER BY for LIMIT/OFFSET paging', async () => {
      await repo.getPayrollSummary({ page: 2, limit: 20 }, adminCtx)

      const [sql] = findSql('offset')
      expect(sql).toBeDefined()
      // NULLS FIRST preserves MySQL's placement for the LEFT JOINed (nullable)
      // employees.name; the trailing pair breaks ties that (issue_date, name)
      // alone leaves — one agent with several vendors on one issue date.
      expect(sql).toContain(
        'order by "paystubs"."issue_date" desc, "employees"."name" asc nulls first, ' +
          '"paystubs"."vendor_id" asc, "paystubs"."agent_id" asc'
      )
      expect(sql).toContain('limit $')
      expect(sql).toContain('offset $')
    })
  })
})

describe('AdvanceRepository — emitted Postgres SQL', () => {
  let repo: AdvanceRepository

  beforeEach(() => {
    capturedQueries.length = 0
    respondWith = () => []
    repo = new AdvanceRepository()
  })

  it('resyncStatementTotals coerces the varchar invoices.amount', async () => {
    // This runs INSIDE the advance write transaction (createAdvance /
    // updateAdvance / deleteAdvance), so a parse error here rolls the advance
    // back. It is unreachable with an empty-result driver — the paystub probe
    // short-circuits — so feed it a paystub row.
    respondWith = (sql) => (sql.includes('from "paystubs"') ? [{ id: 1 }] : [])

    await (repo as unknown as {
      resyncStatementTotals: (
        trx: typeof db,
        a: number,
        v: number,
        d: string
      ) => Promise<void>
    }).resyncStatementTotals(db, 9, 1, '2017-03-08')

    const [sql] = findSql('from "invoices"')
    expect(sql).toBeDefined()
    expect(sql).toContain(COERCED_SUM)
    expect(sql).not.toMatch(/sum\("amount"\)/)

    // The other three legs of `sales + overrides + expenses - advances` are real
    // numeric columns and must stay bare.
    expect(findSql('from "overrides"')[0]).toContain('sum("total")')
    expect(findSql('from "advances"')[0]).toContain('sum("amount")')
  })
})

describe('sumNumericText', () => {
  it('reproduces MySQL leading-numeric-prefix coercion with a 0 fallback', async () => {
    capturedQueries.length = 0
    respondWith = () => []

    await db
      .selectFrom('invoices')
      .select(sumNumericText('amount').as('total'))
      .execute()

    expect(capturedQueries[0].sql).toBe(
      `select ${COERCED_SUM} as "total" from "invoices"`
    )
    // The pattern is a SQL literal, not a bound parameter — a `text`-typed
    // parameter would make Postgres pick the wrong `substring` overload.
    expect(capturedQueries[0].parameters).toEqual([])
  })
})
