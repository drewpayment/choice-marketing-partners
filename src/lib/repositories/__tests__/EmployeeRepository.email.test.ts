/* eslint-disable @typescript-eslint/no-explicit-any -- chainable db test mock is intentionally untyped */
import type { UserContext } from '@/lib/auth/types'

type Row = Record<string, unknown>

interface SelectCall {
  table: string
  joins: string[]
  wheres: unknown[][]
}

interface UpdateCall {
  table: string
  values: Row
  wheres: unknown[][]
}

/**
 * Table-aware chainable db mock.
 *
 * `queueSelect(table, rows)` feeds the *next* `selectFrom(table)` (the last
 * queued entry sticks, so a table queried once can be primed once). Update
 * statements are recorded per table and can be made to throw, which is how the
 * `users_email_unique` race is simulated.
 *
 * Must use `var` so jest.mock hoisting doesn't hit the temporal dead zone.
 */
/* eslint-disable no-var */
var selectCalls: SelectCall[]
var updateCalls: UpdateCall[]
var selectQueues: Map<string, Row[][]>
var updateErrors: Map<string, unknown>
var transactionSpy: jest.Mock
/* eslint-enable no-var */

jest.mock('@/lib/database/client', () => {
  selectCalls = []
  updateCalls = []
  selectQueues = new Map()
  updateErrors = new Map()

  function nextRows(table: string): Row[] {
    const queue = selectQueues.get(table)
    if (!queue || queue.length === 0) return []
    return queue.length === 1 ? queue[0] : (queue.shift() as Row[])
  }

  function makeSelectChain(table: string) {
    const record: SelectCall = { table, joins: [], wheres: [] }
    selectCalls.push(record)

    const chain: any = {
      select: jest.fn(() => chain),
      selectAll: jest.fn(() => chain),
      innerJoin: jest.fn((joined: string) => {
        record.joins.push(joined)
        return chain
      }),
      leftJoin: jest.fn((joined: string) => {
        record.joins.push(joined)
        return chain
      }),
      where: jest.fn((...args: unknown[]) => {
        record.wheres.push(args)
        return chain
      }),
      whereRef: jest.fn(() => chain),
      orderBy: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      offset: jest.fn(() => chain),
      execute: jest.fn(async () => nextRows(table)),
      executeTakeFirst: jest.fn(async () => nextRows(table)[0]),
      executeTakeFirstOrThrow: jest.fn(async () => {
        const row = nextRows(table)[0]
        if (!row) throw new Error(`no row for ${table}`)
        return row
      }),
    }
    return chain
  }

  function makeUpdateChain(table: string) {
    const record: UpdateCall = { table, values: {}, wheres: [] }

    const chain: any = {
      set: jest.fn((values: Row) => {
        record.values = values
        return chain
      }),
      where: jest.fn((...args: unknown[]) => {
        record.wheres.push(args)
        return chain
      }),
      execute: jest.fn(async () => {
        updateCalls.push(record)
        const error = updateErrors.get(table)
        if (error) throw error
        return [{ numUpdatedRows: BigInt(1) }]
      }),
    }
    return chain
  }

  const dbMock: any = {
    selectFrom: jest.fn((table: string) => makeSelectChain(table)),
    updateTable: jest.fn((table: string) => makeUpdateChain(table)),
    insertInto: jest.fn(() => ({
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
      executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ insertId: BigInt(1) }),
    })),
    fn: { count: jest.fn().mockReturnValue({ as: jest.fn() }) },
    case: jest.fn(),
  }

  transactionSpy = jest.fn().mockReturnValue({
    execute: jest.fn((fn: any) => fn(dbMock)),
  })
  dbMock.transaction = transactionSpy

  return { db: dbMock }
})

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed_password') }))

import { EmployeeRepository, isDuplicateEmailError } from '../EmployeeRepository'
import { emailConflictMessage, isParkTooLongError } from '@/lib/utils/email'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

function queueSelect(table: string, rows: Row[]) {
  const queue = selectQueues.get(table) ?? []
  queue.push(rows)
  selectQueues.set(table, queue)
}

/**
 * Queue the result of the linked-login lookup. `getLinkedUsers` selects from
 * `users` (union of the employee_user junction AND the legacy
 * users.id = employees.id convention), never from the junction table alone.
 */
function queueLinkedUsers(rows: Row[]) {
  queueSelect('users', rows)
}

function selectsFor(table: string) {
  return selectCalls.filter((call) => call.table === table)
}

function updatesFor(table: string) {
  return updateCalls.filter((call) => call.table === table)
}

/** Flatten the simple `where(col, op, value)` triples recorded for a call. */
function whereTriples(call: SelectCall | UpdateCall) {
  return call.wheres.filter((args) => typeof args[0] === 'string')
}

/** Run the function-valued where() predicates through a recording expression builder. */
function ebRecordsFor(call: SelectCall) {
  const records: string[] = []
  const sub: any = {}
  sub.select = jest.fn(() => sub)
  // Subquery predicates are recorded too, so the correlation and the
  // junction-wins guard inside the EXISTS arms are assertable.
  sub.where = jest.fn((...args: unknown[]) => {
    records.push(`cmp:${String(args[0])} ${String(args[1])}`)
    return sub
  })
  sub.whereRef = jest.fn((...args: unknown[]) => {
    records.push(`ref:${String(args[0])} ${String(args[1])} ${String(args[2])}`)
    return sub
  })

  const eb: any = (...args: unknown[]) => {
    records.push(`cmp:${String(args[0])} ${String(args[1])}`)
    return { __cmp: args }
  }
  eb.not = (x: unknown) => {
    records.push('not')
    return { __not: x }
  }
  eb.or = (parts: unknown[]) => {
    records.push('or')
    return { __or: parts }
  }
  eb.and = (parts: unknown[]) => {
    records.push('and')
    return { __and: parts }
  }
  eb.exists = (x: unknown) => {
    records.push('exists')
    return { __exists: x }
  }
  eb.selectFrom = (table: string) => {
    records.push(`selectFrom:${table}`)
    return sub
  }

  for (const args of call.wheres) {
    if (typeof args[0] === 'function') (args[0] as any)(eb)
  }
  return records
}

const detailRow = {
  id: 1252, name: 'Chaise Scott', email: 'test@gmail.com', phone_no: null,
  address: '123 St', address_2: null, city: null, state: null,
  postal_code: null, country: 'US', is_active: 1, is_admin: 0, is_mgr: 0,
  sales_id1: '', sales_id2: '', sales_id3: '', hidden_payroll: 0,
  created_at: new Date(), deleted_at: null,
  user_uid: 1250, user_email: 'test@gmail.com', user_role: 'subscriber',
  user_created_at: null,
}

describe('EmployeeRepository email identity', () => {
  let repo: EmployeeRepository

  beforeEach(() => {
    jest.clearAllMocks()
    selectCalls.length = 0
    updateCalls.length = 0
    selectQueues.clear()
    updateErrors.clear()
    repo = new EmployeeRepository()
  })

  describe('isEmailAvailable / findEmailOwner scoping', () => {
    it('a soft-deleted employee no longer blocks the address', async () => {
      // The employees lookup filters `deleted_at IS NULL`, so the deleted row is
      // never returned; nothing else holds the address.
      queueSelect('employees', [])
      queueSelect('users', [])

      await expect(repo.isEmailAvailable('test@gmail.com')).resolves.toBe(true)

      const employeeSelect = selectsFor('employees')[0]
      expect(whereTriples(employeeSelect)).toContainEqual(['deleted_at', 'is', null])
    })

    it('an inactive-but-not-deleted employee still blocks the address', async () => {
      queueSelect('employees', [{ id: 900, name: 'Inactive Ida' }])

      await expect(repo.isEmailAvailable('ida@example.com')).resolves.toBe(false)

      // No `is_active` filter — inactive records are still real, visible records.
      const filtered = whereTriples(selectsFor('employees')[0]).map((args) => args[0])
      expect(filtered).not.toContain('is_active')
    })

    it("excludes the edited employee's own linked login account", async () => {
      queueSelect('employees', [])
      queueSelect('users', [])

      await expect(repo.isEmailAvailable('test@gmail.com', 1252)).resolves.toBe(true)

      expect(whereTriples(selectsFor('employees')[0])).toContainEqual(['id', '!=', 1252])

      // The users lookup excludes accounts linked to 1252 under BOTH conventions.
      const records = ebRecordsFor(selectsFor('users')[0])
      expect(records).toContain('not')
      expect(records).toContain('or')
      // ...the employee_user junction half...
      expect(records).toContain('exists')
      expect(records).toContain('selectFrom:employee_user as own_link')
      // ...and the legacy users.id = employees.id half.
      expect(records).toContain('cmp:users.id =')
      expect(records).toContain('cmp:users.id >')
      expect(records).toContain('ref:own_link.user_id = users.uid')
    })

    it('yields to the junction table when the two conventions disagree', async () => {
      // A row junction-linked to employee A whose users.id points at employee B
      // belongs to A only — otherwise B's edit could clobber A's credentials.
      queueSelect('employees', [])
      queueSelect('users', [])

      await repo.isEmailAvailable('shared@example.com', 500)

      const records = ebRecordsFor(selectsFor('users')[0])
      expect(records).toContain('selectFrom:employee_user as other_link')
      expect(records).toContain('cmp:other_link.employee_id !=')
    })

    it('a login account not linked to any employee still blocks', async () => {
      queueSelect('employees', [])
      queueSelect('users', [
        { uid: 77, employee_id: null, employee_name: null, employee_deleted_at: null },
      ])

      await expect(repo.isEmailAvailable('orphan@example.com', 1252)).resolves.toBe(false)
    })

    it("another employee's linked login account still blocks", async () => {
      queueSelect('employees', [])
      queueSelect('users', [
        { uid: 1250, employee_id: 1256, employee_name: 'Chaise Scott', employee_deleted_at: null },
      ])

      await expect(repo.isEmailAvailable('chaises34@gmail.com', 1252)).resolves.toBe(false)
    })

    it('normalizes the address before comparing (MySQL is case-insensitive)', async () => {
      queueSelect('employees', [])
      queueSelect('users', [])

      await repo.isEmailAvailable('  Test@GMAIL.com ')

      expect(whereTriples(selectsFor('employees')[0])).toContainEqual(['email', '=', 'test@gmail.com'])
      expect(whereTriples(selectsFor('users')[0])).toContainEqual(['users.email', '=', 'test@gmail.com'])
    })
  })

  describe('getEmployeeById — which login account is shown', () => {
    const employeeRow = {
      id: 79, name: 'Sabian Ayers', email: 'sabianelayers@yahoo.com', phone_no: null,
      address: '1 St', address_2: null, city: null, state: null, postal_code: null,
      country: 'US', is_active: 0, is_admin: 0, is_mgr: 0, sales_id1: '', sales_id2: '',
      sales_id3: '', hidden_payroll: 0, created_at: new Date(), deleted_at: null,
    }

    it('prefers the account whose address matches the employee, not the lowest uid', async () => {
      // Employee 79 in production: uid 74 (retired in 2017) sorts first, but uid
      // 91 is the account that actually carries the employee's address.
      queueSelect('employees', [employeeRow])
      queueLinkedUsers([
        { uid: 74, id: 79, email: 'sabianelayers@gmail.com', role: 'subscriber', created_at: null },
        { uid: 91, id: 79, email: 'sabianelayers@yahoo.com', role: 'subscriber', created_at: null },
      ])

      const detail = await repo.getEmployeeById(79)

      expect(detail?.hasUser).toBe(true)
      expect(detail?.user?.uid).toBe(91)
      expect(detail?.user?.email).toBe('sabianelayers@yahoo.com')
    })

    it('falls back to the lowest uid when no account matches the address', async () => {
      queueSelect('employees', [employeeRow])
      queueLinkedUsers([
        { uid: 74, id: 79, email: 'old@gmail.com', role: 'subscriber', created_at: null },
        { uid: 91, id: 79, email: 'other@gmail.com', role: 'author', created_at: null },
      ])

      const detail = await repo.getEmployeeById(79)

      expect(detail?.user?.uid).toBe(74)
    })

    it('reports no account when nothing is linked by either convention', async () => {
      queueSelect('employees', [employeeRow])
      queueLinkedUsers([])

      const detail = await repo.getEmployeeById(79)

      expect(detail?.hasUser).toBe(false)
      expect(detail?.user).toBeUndefined()
    })
  })

  describe('findEmailOwner message variants', () => {
    it('live employee row', async () => {
      queueSelect('employees', [{ id: 123, name: 'Jane Doe' }])

      const owner = await repo.findEmailOwner('jane@example.com')

      expect(owner).toEqual({
        source: 'employee', employeeId: 123, employeeName: 'Jane Doe', employeeDeleted: false,
      })
      expect(emailConflictMessage(owner)).toBe(
        'Email address is already in use by employee Jane Doe (#123).'
      )
    })

    it('login account of a soft-deleted employee (junction-linked)', async () => {
      queueSelect('employees', [])
      queueSelect('users', [{ uid: 1250, id: 0 }])
      // Attribution step 1: employee_user join resolves the owner.
      queueSelect('employee_user', [
        { id: 1256, name: 'Chaise Scott', deleted_at: new Date('2026-01-01') },
      ])

      const owner = await repo.findEmailOwner('chaises34@gmail.com')

      expect(owner).toEqual({
        source: 'user', employeeId: 1256, employeeName: 'Chaise Scott', employeeDeleted: true,
      })
      // No "restore to release it" advice: restore only releases addresses this
      // app parked, never a legacy row that was never parked.
      expect(emailConflictMessage(owner)).toBe(
        'Email address is already in use by the login account of deleted employee Chaise Scott (#1256).'
      )
    })

    it('login account of a live employee', async () => {
      queueSelect('employees', [])
      queueSelect('users', [{ uid: 42, id: 0 }])
      queueSelect('employee_user', [{ id: 123, name: 'Jane Doe', deleted_at: null }])

      const owner = await repo.findEmailOwner('jane@example.com')

      expect(emailConflictMessage(owner)).toBe(
        'Email address is already in use by the login account of employee Jane Doe (#123).'
      )
    })

    it('login account linked only by the legacy users.id convention', async () => {
      // The junction table has nothing for this account (the norm in production
      // data), so attribution must fall through to users.id = employees.id.
      // Before this fix the message read "not linked to any employee" — a
      // dead-end for the admin.
      queueSelect('employees', [])                 // nobody holds it in employees
      queueSelect('users', [{ uid: 122, id: 124 }])
      queueSelect('employee_user', [])             // no junction row
      queueSelect('employees', [{ id: 124, name: 'Nancy Alvarez', deleted_at: null }])

      const owner = await repo.findEmailOwner('alvareznancy26@gmail.com')

      expect(owner).toEqual({
        source: 'user', employeeId: 124, employeeName: 'Nancy Alvarez', employeeDeleted: false,
      })
      expect(emailConflictMessage(owner)).toBe(
        'Email address is already in use by the login account of employee Nancy Alvarez (#124).'
      )
    })

    it('login account with no employee link at all', async () => {
      queueSelect('employees', [])
      queueSelect('users', [{ uid: 77, id: 0 }])
      queueSelect('employee_user', [])

      const owner = await repo.findEmailOwner('orphan@example.com')

      expect(owner).toEqual({
        source: 'user', employeeId: null, employeeName: null, employeeDeleted: false,
      })
      expect(emailConflictMessage(owner)).toBe(
        'Email address is already in use by a login account not linked to any employee.'
      )
    })

    it('returns null when the address is free', async () => {
      queueSelect('employees', [])
      queueSelect('users', [])

      await expect(repo.findEmailOwner('free@example.com')).resolves.toBeNull()
      expect(emailConflictMessage(null)).toBe('Email address is already in use.')
    })
  })

  describe('updateEmployee — user email sync', () => {
    it('writes the new address to exactly ONE linked login account', async () => {
      // Employee 79 in production has two linked users (uids 74 and 91). Writing
      // the same address to both would trip users_email_unique.
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'old@gmail.com', deleted_at: null },
      ])
      queueLinkedUsers([
        { uid: 91, email: 'old@gmail.com' },
        { uid: 74, email: 'retired@gmail.com' },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { email: 'New@Gmail.com' }, adminCtx)

      expect(transactionSpy).toHaveBeenCalled()
      expect(updatesFor('employees')[0].values.email).toBe('new@gmail.com')

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      expect(userUpdates[0].values.email).toBe('new@gmail.com')
      // The account already carrying the employee's address wins, not the lowest uid.
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', '=', 91])
    })

    it('syncs a login linked only by users.id, with no junction row', async () => {
      // The common production shape: employee 124 ↔ user uid 122 via
      // users.id = employees.id. The old junction-only lookup returned [] here,
      // so the sync silently no-opped for ~93% of employees.
      queueSelect('employees', [
        { name: 'Nancy Alvarez', email: 'alvareznancy26@gmail.com', deleted_at: null },
      ])
      queueLinkedUsers([{ uid: 122, id: 124, email: 'alvareznancy26@gmail.com' }])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(124, { email: 'nancy.new@gmail.com' }, adminCtx)

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      expect(userUpdates[0].values.email).toBe('nancy.new@gmail.com')
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', '=', 122])
      // The junction table is never consulted — the relation lives on `users`.
      expect(selectsFor('employee_user')).toHaveLength(0)
    })

    it('prefers an account that already holds the NEW address (idempotent rewrite)', async () => {
      // uid 74 already has the target address; writing it to uid 91 instead would
      // dead-end on users_email_unique against its own sibling account.
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'old@gmail.com', deleted_at: null },
      ])
      queueLinkedUsers([
        { uid: 91, email: 'old@gmail.com' },
        { uid: 74, email: 'new@gmail.com' },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { email: 'New@Gmail.com' }, adminCtx)

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', '=', 74])
    })

    it('prefers an account parked by this employee over an unrelated one', async () => {
      // After a restore that could not un-park, the address is still ours to
      // reclaim — clobbering an unrelated sibling account would be wrong.
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'old@gmail.com', deleted_at: null },
      ])
      queueLinkedUsers([
        { uid: 74, email: 'unrelated@gmail.com' },
        { uid: 91, email: 'deleted-1252.something@gmail.com' },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { email: 'new@gmail.com' }, adminCtx)

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      // Parked-by-us (91) wins over the lower uid (74).
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', '=', 91])
    })

    it('falls back to the lowest uid when no linked account holds the old address', async () => {
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'old@gmail.com', deleted_at: null },
      ])
      queueLinkedUsers([
        { uid: 91, email: 'someone@gmail.com' },
        { uid: 74, email: 'other@gmail.com' },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { email: 'new@gmail.com' }, adminCtx)

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', '=', 74])
    })

    it('syncs users.name to EVERY linked account (no unique index on name)', async () => {
      queueSelect('employees', [{ name: 'Old Name', email: 'old@gmail.com', deleted_at: null }])
      queueLinkedUsers([
        { uid: 91, email: 'old@gmail.com' },
        { uid: 74, email: 'retired@gmail.com' },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { name: 'New Name' }, adminCtx)

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      expect(userUpdates[0].values.name).toBe('New Name')
      expect(userUpdates[0].values.email).toBeUndefined()
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', 'in', [91, 74]])
    })

    it('writes nothing to users when the email (and name) are unchanged', async () => {
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'test@gmail.com', deleted_at: null },
      ])
      queueSelect('employees', [detailRow])

      // Same address, different case — MySQL would treat these as equal too.
      await repo.updateEmployee(1252, { email: 'TEST@gmail.com' }, adminCtx)

      expect(updatesFor('users')).toHaveLength(0)
      // Only getEmployeeById's login-account lookup — no linked-user sync lookup.
      expect(selectsFor('users')).toHaveLength(1)
    })

    it('leaves a legacy mixed-case employees.email untouched when it did not change', async () => {
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'Chaise.Scott@Gmail.com', deleted_at: null },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { email: 'chaise.scott@gmail.com', city: 'Toledo' }, adminCtx)

      const employeeUpdate = updatesFor('employees')[0]
      expect(employeeUpdate.values.email).toBeUndefined()
      expect(employeeUpdate.values.city).toBe('Toledo')
    })

    it('writes no email at all for a soft-deleted employee (no new drift)', async () => {
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'old@gmail.com', deleted_at: new Date('2026-01-01') },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { email: 'new@gmail.com', city: 'Toledo' }, adminCtx)

      // The parked login email must not be rewritten (that re-enables login), and
      // employees.email must not move either — that is exactly the drift this fix
      // removes. Other fields still save.
      expect(updatesFor('employees')[0].values.email).toBeUndefined()
      expect(updatesFor('employees')[0].values.city).toBe('Toledo')
      expect(updatesFor('users')).toHaveLength(0)
      // Only getEmployeeById's login-account lookup — no linked-user sync lookup.
      expect(selectsFor('users')).toHaveLength(1)
    })

    it('skips the users sync wholesale for a soft-deleted employee, name included', async () => {
      queueSelect('employees', [
        { name: 'Old Name', email: 'old@gmail.com', deleted_at: new Date('2026-01-01') },
      ])
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { name: 'New Name' }, adminCtx)

      expect(updatesFor('users')).toHaveLength(0)
      // The employees row itself still saves normally.
      expect(updatesFor('employees')[0].values.name).toBe('New Name')
    })

    it('does not touch users when only non-identity fields change', async () => {
      queueSelect('employees', [detailRow])

      await repo.updateEmployee(1252, { city: 'Toledo' }, adminCtx)

      expect(updatesFor('users')).toHaveLength(0)
    })

    it('lets a users unique-index violation escape the transaction after the employees write', async () => {
      queueSelect('employees', [
        { name: 'Chaise Scott', email: 'old@gmail.com', deleted_at: null },
      ])
      queueLinkedUsers([{ uid: 1250, email: 'old@gmail.com' }])
      const dupError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY', errno: 1062,
      })
      updateErrors.set('users', dupError)

      await expect(
        repo.updateEmployee(1252, { email: 'taken@gmail.com' }, adminCtx)
      ).rejects.toBe(dupError)

      // The employees write was attempted inside the same transaction callback and
      // the error escapes it, so the real driver rolls that write back. (A mocked
      // transaction cannot observe the rollback itself.)
      expect(transactionSpy).toHaveBeenCalled()
      expect(updatesFor('employees')).toHaveLength(1)
      // ...and the route recognises the conflict.
      expect(isDuplicateEmailError(dupError)).toBe(true)
    })
  })

  describe('softDeleteEmployee — email parking', () => {
    it('parks each linked login email and marks users.deleted_at', async () => {
      queueLinkedUsers([{ uid: 1250, email: 'chaises34@gmail.com' }])
      queueSelect('users', []) // parked value is free

      await expect(repo.softDeleteEmployee(1256, adminCtx)).resolves.toBe(true)

      const userUpdate = updatesFor('users')[0]
      expect(userUpdate.values.email).toBe('deleted-1256.chaises34@gmail.com')
      expect(userUpdate.values.deleted_at).toBeInstanceOf(Date)
      expect(whereTriples(userUpdate)).toContainEqual(['uid', '=', 1250])

      expect(updatesFor('employees')[0].values.deleted_at).toBeInstanceOf(Date)
      expect(updatesFor('employees')[0].values.is_active).toBe(0)
    })

    it('parks a login linked only by users.id, with no junction row', async () => {
      queueLinkedUsers([{ uid: 122, id: 124, email: 'alvareznancy26@gmail.com' }])
      queueSelect('users', [])

      await expect(repo.softDeleteEmployee(124, adminCtx)).resolves.toBe(true)

      const userUpdate = updatesFor('users')[0]
      expect(userUpdate.values.email).toBe('deleted-124.alvareznancy26@gmail.com')
      expect(whereTriples(userUpdate)).toContainEqual(['uid', '=', 122])
      expect(selectsFor('employee_user')).toHaveLength(0)
    })

    it('is idempotent — an already parked email is not double-prefixed', async () => {
      queueLinkedUsers([{ uid: 1250, email: 'deleted-1256.chaises34@gmail.com' }])

      await repo.softDeleteEmployee(1256, adminCtx)

      const userUpdate = updatesFor('users')[0]
      expect(userUpdate.values.email).toBeUndefined()
      expect(userUpdate.values.deleted_at).toBeInstanceOf(Date)
    })

    it('falls back to the uid-qualified prefix when the parked value collides', async () => {
      queueLinkedUsers([{ uid: 1250, email: 'chaises34@gmail.com' }])
      queueSelect('users', [{ uid: 999 }]) // parked value already taken

      await repo.softDeleteEmployee(1256, adminCtx)

      expect(updatesFor('users')[0].values.email).toBe('deleted-1256-1250.chaises34@gmail.com')
    })

    it('aborts the delete rather than truncating an email too long to park', async () => {
      // Truncation would silently corrupt the address restore later un-parks.
      const longEmail = `${'a'.repeat(240)}@example.com`
      queueLinkedUsers([{ uid: 1250, email: longEmail }])

      const error = await repo.softDeleteEmployee(1256, adminCtx).catch((e) => e)

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toMatch(/too long to park/i)
      // Typed so the DELETE route can answer 400 instead of an opaque 500.
      expect(isParkTooLongError(error)).toBe(true)
      expect(isParkTooLongError(new Error('something else'))).toBe(false)
      expect(updatesFor('users')).toHaveLength(0)
    })

    it('parks every linked account when more than one exists', async () => {
      queueLinkedUsers([
        { uid: 1250, email: 'a@example.com' },
        { uid: 1251, email: 'b@example.com' },
      ])
      queueSelect('users', [])

      await repo.softDeleteEmployee(1256, adminCtx)

      expect(updatesFor('users').map((u) => u.values.email)).toEqual([
        'deleted-1256.a@example.com',
        'deleted-1256.b@example.com',
      ])
    })
  })

  describe('restoreEmployee — un-parking', () => {
    it('un-parks the login email when the original address is free', async () => {
      queueLinkedUsers([{ uid: 1250, email: 'deleted-1256.chaises34@gmail.com' }])
      queueSelect('employees', []) // availability check: no employee holds it
      queueSelect('users', [])     // availability check: no user holds it

      const result = await repo.restoreEmployee(1256, adminCtx)

      expect(result).toEqual({ restored: true, emailsStillParked: 0 })
      const userUpdate = updatesFor('users')[0]
      expect(userUpdate.values.email).toBe('chaises34@gmail.com')
      expect(userUpdate.values.deleted_at).toBeNull()
      expect(updatesFor('employees')[0].values.deleted_at).toBeNull()
    })

    it('leaves the email parked when the original address is taken', async () => {
      queueLinkedUsers([{ uid: 1250, email: 'deleted-1256.chaises34@gmail.com' }])
      queueSelect('employees', [{ id: 1252, name: 'Someone Else' }]) // address reused

      const result = await repo.restoreEmployee(1256, adminCtx)

      // Restore still succeeds; the admin fixes the address by hand.
      expect(result).toEqual({ restored: true, emailsStillParked: 1 })
      expect(updatesFor('users')).toHaveLength(0)
    })

    it('leaves a linked account we never parked completely untouched', async () => {
      // uid 74 was retired in 2017, long before the employee was deleted in 2020 —
      // restoring the employee must not resurrect that account.
      queueLinkedUsers([{ uid: 74, email: 'retired@gmail.com' }])

      const result = await repo.restoreEmployee(1256, adminCtx)

      expect(result).toEqual({ restored: true, emailsStillParked: 0 })
      expect(updatesFor('users')).toHaveLength(0)
      // No availability lookup needed for an address that was never parked.
      expect(selectsFor('employees')).toHaveLength(0)
    })

    it('clears deleted_at only on the rows it un-parks', async () => {
      queueLinkedUsers([
        { uid: 74, email: 'retired@gmail.com' },
        { uid: 91, email: 'deleted-1256.chaises34@gmail.com' },
      ])
      queueSelect('employees', [])
      queueSelect('users', [])

      await repo.restoreEmployee(1256, adminCtx)

      const userUpdates = updatesFor('users')
      expect(userUpdates).toHaveLength(1)
      expect(whereTriples(userUpdates[0])).toContainEqual(['uid', '=', 91])
      expect(userUpdates[0].values.deleted_at).toBeNull()
    })

    it('un-parks a login linked only by users.id', async () => {
      queueLinkedUsers([{ uid: 122, id: 124, email: 'deleted-124.alvareznancy26@gmail.com' }])
      queueSelect('employees', [])
      queueSelect('users', [])

      const result = await repo.restoreEmployee(124, adminCtx)

      expect(result).toEqual({ restored: true, emailsStillParked: 0 })
      expect(updatesFor('users')[0].values.email).toBe('alvareznancy26@gmail.com')
      expect(selectsFor('employee_user')).toHaveLength(0)
    })

    it('un-parks the uid-qualified fallback prefix too', async () => {
      queueLinkedUsers([{ uid: 1250, email: 'deleted-1256-1250.chaises34@gmail.com' }])
      queueSelect('employees', [])
      queueSelect('users', [])

      await repo.restoreEmployee(1256, adminCtx)

      expect(updatesFor('users')[0].values.email).toBe('chaises34@gmail.com')
    })

    it('still requires admin access', async () => {
      await expect(
        repo.restoreEmployee(1256, { employeeId: 2, isAdmin: false, isManager: true })
      ).rejects.toThrow('Admin access required')
    })
  })
})
