/**
 * Bound-parameter assertions for the repository's email-equality lookups.
 *
 * `EmployeeRepository.email-sql.test.ts` pins the *shape* of these queries;
 * this file pins the *values* — every address compared against an email column
 * must arrive trimmed and lowercased, via the shared `normalizeEmail` helper,
 * and (for the soft-delete parking path) the value that is probed must be the
 * same string that is written.
 */
/* eslint-disable no-var */
var capturedQueries: { sql: string; parameters: readonly unknown[] }[]
// Rows the `users` reads replay. `linkedUserRows` answers `getLinkedUsers`;
// `guardRows` answers the `emailTakenByOtherUser` collision probe (the query
// carrying the `uid != ?` exclusion).
var linkedUserRows: Record<string, unknown>[]
var guardRows: Record<string, unknown>[]
/* eslint-enable no-var */

jest.mock('@/lib/database/client', () => {
  const {
    Kysely,
    MysqlAdapter,
    MysqlIntrospector,
    MysqlQueryCompiler,
  } = jest.requireActual('kysely')

  capturedQueries = []
  linkedUserRows = []
  guardRows = []

  const connection = {
    async executeQuery(compiled: { sql: string; parameters: readonly unknown[] }) {
      capturedQueries.push({ sql: compiled.sql, parameters: compiled.parameters })

      if (compiled.sql.includes('from `users`')) {
        return { rows: compiled.sql.includes('`uid` != ?') ? guardRows : linkedUserRows }
      }
      return { rows: [], numAffectedRows: BigInt(1) }
    },
    async *streamQuery() {},
  }

  return {
    db: new Kysely({
      dialect: {
        createAdapter: () => new MysqlAdapter(),
        createDriver: () => ({
          async init() {},
          async acquireConnection() {
            return connection
          },
          async beginTransaction() {},
          async commitTransaction() {},
          async rollbackTransaction() {},
          async releaseConnection() {},
          async destroy() {},
        }),
        createIntrospector: (kysely: never) => new MysqlIntrospector(kysely),
        createQueryCompiler: () => new MysqlQueryCompiler(),
      },
    }),
  }
})

import { EmployeeRepository } from '../EmployeeRepository'
import type { UserContext } from '@/lib/auth/types'

type EmailTakenByOtherUser = (
  executor: unknown,
  email: string,
  excludeUid: number
) => Promise<boolean>

const ADMIN = { isAdmin: true, isManager: false } as unknown as UserContext

describe('EmployeeRepository — email lookups are normalised', () => {
  let repo: EmployeeRepository

  beforeEach(() => {
    capturedQueries.length = 0
    linkedUserRows = []
    guardRows = []
    repo = new EmployeeRepository()
  })

  describe('emailTakenByOtherUser', () => {
    function call(email: string, excludeUid = 7) {
      const { db } = jest.requireMock('@/lib/database/client')
      const fn = (repo as unknown as { emailTakenByOtherUser: EmailTakenByOtherUser })
        .emailTakenByOtherUser.bind(repo)
      return fn(db, email, excludeUid)
    }

    it('lowercases the probed address', async () => {
      await call('deleted-42.Mixed.Case@Example.COM')

      const probe = capturedQueries[0]
      expect(probe.sql).toContain('from `users`')
      expect(probe.sql).toContain('`email` = ?')
      expect(probe.parameters[0]).toBe('deleted-42.mixed.case@example.com')
    })

    it('still excludes the account being parked', async () => {
      await call('deleted-42.Employee@Test.com', 1250)

      // Normalising the address must not disturb the uid exclusion — without it
      // an account would collide with its own parked value.
      expect(capturedQueries[0].sql).toContain('`uid` != ?')
      expect(capturedQueries[0].parameters[1]).toBe(1250)
    })
  })

  describe('softDeleteEmployee — the probed value is the written value', () => {
    /** The collision guard: the only `users` read carrying `uid != ?`. */
    function guardQuery() {
      const guard = capturedQueries.find((q) => q.sql.includes('`uid` != ?'))
      if (!guard) throw new Error('the collision guard never ran')
      return guard
    }

    /** The UPDATE that parks the login email. */
    function userUpdate() {
      const update = capturedQueries.find(
        (q) => q.sql.includes('update `users`') && q.sql.includes('`email` = ?')
      )
      if (!update) throw new Error('the users email update never ran')
      return update
    }

    it('parks the canonical address it just probed for', async () => {
      // Stored login carries mixed case (10 such rows exist in the prod
      // snapshot). Guard finds nothing, so the plain prefix is used.
      linkedUserRows = [
        { uid: 7, id: 42, email: 'Mixed.Case@Example.COM', role: 'subscriber', created_at: null },
      ]

      await repo.softDeleteEmployee(42, ADMIN)

      const probed = guardQuery().parameters[0]
      expect(probed).toBe('deleted-42.mixed.case@example.com')

      // The load-bearing assertion: under a case-sensitive engine, asking about
      // one string and writing another lets the UPDATE trip
      // `users_email_unique` inside the transaction, which rolls the whole
      // soft-delete back.
      expect(userUpdate().parameters).toContain(probed)
    })

    it('uses the same canonical base for the uid-qualified fallback', async () => {
      linkedUserRows = [
        { uid: 7, id: 42, email: 'Mixed.Case@Example.COM', role: 'subscriber', created_at: null },
      ]
      // Guard reports the plain parked form as taken → fallback prefix.
      guardRows = [{ uid: 99 }]

      await repo.softDeleteEmployee(42, ADMIN)

      expect(userUpdate().parameters).toContain('deleted-42-7.mixed.case@example.com')
    })

    it('leaves an already-parked address alone (parking stays idempotent)', async () => {
      linkedUserRows = [
        {
          uid: 7,
          id: 42,
          email: 'deleted-42.mixed.case@example.com',
          role: 'subscriber',
          created_at: null,
        },
      ]

      await repo.softDeleteEmployee(42, ADMIN)

      expect(capturedQueries.some((q) => q.sql.includes('`uid` != ?'))).toBe(false)
      const update = capturedQueries.find((q) => q.sql.includes('update `users`'))
      expect(update?.sql).not.toContain('`email` = ?')
    })
  })

  describe('findEmailOwner (already normalised — regression guard)', () => {
    it('normalises the address for both the employees and users lookups', async () => {
      await repo.findEmailOwner('  Mixed.Case@Example.COM ')

      const [employeeQuery, userQuery] = capturedQueries
      expect(employeeQuery.sql).toContain('from `employees`')
      expect(employeeQuery.parameters[0]).toBe('mixed.case@example.com')
      expect(userQuery.sql).toContain('from `users`')
      expect(userQuery.parameters[0]).toBe('mixed.case@example.com')
    })
  })
})
