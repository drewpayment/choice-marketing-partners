/**
 * Compile-only SQL assertions.
 *
 * The behavioural tests in EmployeeRepository.email.test.ts drive a hand-rolled
 * chainable mock, which cannot see *inside* the predicates the repository
 * builds — deleting a correlated filter would still pass them. Here the
 * repository runs against a real Kysely instance wired to a compile-only driver,
 * so the emitted MySQL is asserted verbatim.
 */
/* eslint-disable no-var */
var capturedSql: string[]
/* eslint-enable no-var */

jest.mock('@/lib/database/client', () => {
  const {
    Kysely,
    MysqlAdapter,
    MysqlIntrospector,
    MysqlQueryCompiler,
    DummyDriver,
  } = jest.requireActual('kysely')

  capturedSql = []

  return {
    db: new Kysely({
      dialect: {
        createAdapter: () => new MysqlAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (kysely: never) => new MysqlIntrospector(kysely),
        createQueryCompiler: () => new MysqlQueryCompiler(),
      },
      log: (event: { level: string; query: { sql: string } }) => {
        if (event.level === 'query') capturedSql.push(event.query.sql)
      },
    }),
  }
})

import { EmployeeRepository } from '../EmployeeRepository'

describe('EmployeeRepository — emitted SQL', () => {
  let repo: EmployeeRepository

  beforeEach(() => {
    capturedSql.length = 0
    repo = new EmployeeRepository()
  })

  describe('findEmailOwner', () => {
    it('scopes the employees lookup to live rows and excludes the edited employee', async () => {
      await repo.findEmailOwner('test@gmail.com', 1252)

      const employeeSql = capturedSql[0]
      expect(employeeSql).toContain('from `employees`')
      expect(employeeSql).toContain('`email` = ?')
      expect(employeeSql).toContain('`deleted_at` is null')
      expect(employeeSql).toContain('`id` != ?')
    })

    it("excludes the edited employee's own login accounts under BOTH linkage conventions", async () => {
      await repo.findEmailOwner('test@gmail.com', 1252)

      const usersSql = capturedSql[1]
      expect(usersSql).toContain('from `users`')
      expect(usersSql).toContain('not (')
      expect(usersSql).toContain('from `employee_user` as `own_link`')
      // The junction half: correlation to the outer users row...
      expect(usersSql).toContain('`own_link`.`user_id` = `users`.`uid`')
      // ...and the restriction to the employee being edited. Dropping this one
      // would exclude EVERY linked account and let real conflicts through.
      expect(usersSql).toContain('`own_link`.`employee_id` = ?')
      // The legacy half: users.id = employees.id is how NextAuth resolves the
      // employee, and how ~93% of production logins are linked. Without it the
      // employee's own login looks like a stranger holding its address.
      expect(usersSql).toContain('`users`.`id` = ?')
      expect(usersSql).toContain('`users`.`id` > ?')
      // The legacy arm yields to the junction table when they disagree: a row
      // bound to another employee by employee_user is not this employee's login.
      expect(usersSql).toContain('from `employee_user` as `other_link`')
      expect(usersSql).toContain('`other_link`.`employee_id` != ?')
      // The two halves are alternatives, not both-required.
      expect(usersSql).toMatch(/not \(exists \(.*\) or \(.*`users`\.`id` = \?.*\)\)/)
    })

    it('applies no exclusion when there is no employee to exclude', async () => {
      await repo.findEmailOwner('test@gmail.com')

      const usersSql = capturedSql[1]
      expect(usersSql).toContain('from `users`')
      expect(usersSql).not.toContain('not (')
      expect(usersSql).not.toContain('own_link')
    })

    it('attributes ownership through employee_user first, then users.id', async () => {
      // The dummy driver returns no rows, so drive attribution directly.
      const resolve = (repo as unknown as {
        resolveEmployeeForUser: (executor: unknown, uid: number, usersId: number) => Promise<unknown>
      }).resolveEmployeeForUser.bind(repo)

      const { db } = jest.requireMock('@/lib/database/client')
      capturedSql.length = 0
      await resolve(db, 1250, 1256)

      // Junction lookup first...
      expect(capturedSql[0]).toContain('from `employee_user`')
      expect(capturedSql[0]).toContain('inner join `employees` on `employees`.`id` = `employee_user`.`employee_id`')
      expect(capturedSql[0]).toContain('`employee_user`.`user_id` = ?')
      // ...then the legacy users.id = employees.id fallback.
      expect(capturedSql[1]).toContain('from `employees`')
      expect(capturedSql[1]).toContain('`id` = ?')
    })

    it('never resolves a legacy owner for a zero/unset users.id', async () => {
      const resolve = (repo as unknown as {
        resolveEmployeeForUser: (executor: unknown, uid: number, usersId: number) => Promise<unknown>
      }).resolveEmployeeForUser.bind(repo)

      const { db } = jest.requireMock('@/lib/database/client')
      capturedSql.length = 0
      await resolve(db, 1250, 0)

      // Junction lookup only — employees.id 0 cannot exist, so no second query.
      expect(capturedSql).toHaveLength(1)
      expect(capturedSql[0]).toContain('from `employee_user`')
    })
  })

  describe('linked-login relation reuse', () => {
    it('uses uncorrelated semi-joins for the hasUser flag and filter', async () => {
      // `users.id` has no index, so the correlated EXISTS form measured ~400x
      // slower across the whole table (stats 0.98ms -> 391ms, filter ~1ms ->
      // 548ms). These IN-subqueries are materialised once.
      capturedSql.length = 0
      await repo.getEmployees({ hasUser: true }, { employeeId: 1, isAdmin: true, isManager: false })

      const semiJoin =
        '(`employees`.`id` in (select `users`.`id` from `users` where `users`.`id` > ?) ' +
        'or `employees`.`id` in (select `employee_user`.`employee_id` from `employee_user`))'

      // The count query runs first, then the page query; both carry the filter.
      const countSql = capturedSql[0]
      const pageSql = capturedSql[capturedSql.length - 1]
      expect(countSql).toContain(semiJoin)
      expect(pageSql).toContain(semiJoin)
      // ...and the flag in the select list uses the same shape.
      expect(pageSql).toContain(`${semiJoin} as \`hasUser\``)
      // No correlated EXISTS over users for the set-oriented parts.
      expect(pageSql).not.toContain('exists (select `users`')
    })

    it('keeps the correlated form for the per-row emulation id', async () => {
      capturedSql.length = 0
      await repo.getEmployees({}, { employeeId: 1, isAdmin: true, isManager: false })

      // This subquery runs once per returned row (page size), so correlating is
      // the right trade — and it must resolve the exact account, guard included.
      const pageSql = capturedSql[capturedSql.length - 1]
      expect(pageSql).toContain('`own_link`.`employee_id` = `employees`.`id`')
      expect(pageSql).toContain('`users`.`id` = `employees`.`id`')
      expect(pageSql).toContain('`other_link`.`employee_id` != `employees`.`id`')
      expect(pageSql).toContain('order by `users`.`uid` asc limit ?) as `user_id`')
    })

    it('uses the same semi-join for the withUserAccounts stat', async () => {
      capturedSql.length = 0
      await repo.getEmployeeStats({ employeeId: 1, isAdmin: true, isManager: false })

      const statsSql = capturedSql[0]
      expect(statsSql).toContain('`employees`.`id` in (select `users`.`id` from `users` where `users`.`id` > ?)')
      expect(statsSql).toContain('`employees`.`id` in (select `employee_user`.`employee_id` from `employee_user`)')
      expect(statsSql).not.toContain('exists (select `users`')
    })

    it('looks the detail-page employees row up without any user join', async () => {
      capturedSql.length = 0
      await repo.getEmployeeById(1252)

      // The dummy driver returns no rows, so the lookup stops here — the point
      // is that the employees row no longer depends on an employee_user join.
      expect(capturedSql[0]).toContain('from `employees`')
      expect(capturedSql[0]).not.toContain('join')
    })

    it('resolves the detail-page login account through both conventions', async () => {
      const findPrimary = (repo as unknown as {
        findPrimaryLoginAccount: (executor: unknown, employeeId: number, email: string) => Promise<unknown>
      }).findPrimaryLoginAccount.bind(repo)

      const { db } = jest.requireMock('@/lib/database/client')
      capturedSql.length = 0
      await findPrimary(db, 1252, 'chaise@example.com')

      const userSql = capturedSql[0]
      expect(userSql).toContain('from `users`')
      expect(userSql).toContain('`own_link`.`employee_id` = ?')
      expect(userSql).toContain('`users`.`id` = ?')
      expect(userSql).toContain('`users`.`id` > ?')
      expect(userSql).toContain('order by `users`.`uid` asc')
    })

    it('returns every linked account, by either convention, deduped and ordered', async () => {
      const getLinked = (repo as unknown as {
        getLinkedUsers: (executor: unknown, employeeId: number) => Promise<unknown>
      }).getLinkedUsers.bind(repo)

      const { db } = jest.requireMock('@/lib/database/client')
      capturedSql.length = 0
      await getLinked(db, 79)

      const sql = capturedSql[0]
      // Selecting from `users` alone: no join fan-out, so uids are unique by
      // construction — no DISTINCT needed even though users.id is non-unique.
      expect(sql).toContain(
        'select `users`.`uid`, `users`.`id`, `users`.`email`, `users`.`role`, `users`.`created_at` from `users`'
      )
      expect(sql).not.toContain('join')
      expect(sql).toContain('exists')
      expect(sql).toContain('`own_link`.`employee_id` = ?')
      expect(sql).toContain('`users`.`id` = ?')
      // Junction-wins guard travels with the relation.
      expect(sql).toContain('`other_link`.`employee_id` != ?')
      expect(sql).toContain('order by `users`.`uid` asc')
    })
  })
})
