/**
 * @jest-environment node
 *
 * The "is there already a login for this address?" probe in the create-user
 * route is a raw email-equality lookup that the Phase 1 doc's site list missed.
 * It now normalises the employee's stored address before comparing.
 *
 * The sibling `route.test.ts` drives a chainable mock, which cannot see the
 * values bound into a predicate built from an `eb` callback. Here the route
 * runs against a real Kysely compiler wired to a canned-row driver, so both the
 * emitted SQL and its parameters are observable.
 */
/* eslint-disable no-var */
var capturedQueries: { sql: string; parameters: readonly unknown[] }[]
// Rows the existing-login probe replays. Emptied by the tests that need the
// route to fall through to the INSERT branch.
var probeRows: Record<string, unknown>[]
/* eslint-enable no-var */

// Row fixtures the fake driver replays, keyed by the table the query reads.
// Deliberately mixed-case + padded: the stored value is what the route must
// normalise before probing `users`.
const EMPLOYEE_ROW = { id: '42', name: 'D Spiker', email: '  Mixed.Case@Example.COM ' }
const USER_ROW = { uid: 7, id: 42, email: 'Mixed.Case@Example.COM', role: 'subscriber' }
const CREATED_USER_ROW = { id: 91, email: 'mixed.case@example.com', role: 'subscriber' }

jest.mock('@/lib/database/client', () => {
  const {
    Kysely,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
  } = jest.requireActual('kysely')

  capturedQueries = []
  // The fixtures above are still in their TDZ while this factory runs, so the
  // meaningful default is installed by `beforeEach`.
  probeRows = []

  const connection = {
    async executeQuery(compiled: { sql: string; parameters: readonly unknown[] }) {
      capturedQueries.push({ sql: compiled.sql, parameters: compiled.parameters })

      // `employee_user` must come back empty or the route 409s before the
      // users probe we are here to observe.
      if (compiled.sql.includes('from "employee_user"')) return { rows: [] }
      if (compiled.sql.includes('from "employees"')) return { rows: [EMPLOYEE_ROW] }
      if (compiled.sql.includes('from "users"')) {
        // The read-back of the row the INSERT branch just created is keyed by
        // `uid`; the existing-login probe is the `id = $1 or email = $2` one.
        if (compiled.sql.includes('"uid" = $')) return { rows: [CREATED_USER_ROW] }
        return { rows: probeRows }
      }
      if (compiled.sql.includes('insert into "users"')) {
        // Postgres never populates InsertResult.insertId — the route reads
        // the PK back via `.returning('uid')`, so the row here is what
        // satisfies that `returning` clause.
        return { rows: [{ uid: 91 }], numAffectedRows: BigInt(1) }
      }
      return { rows: [] }
    },
    async *streamQuery() {},
  }

  const driver = {
    async init() {},
    async acquireConnection() {
      return connection
    },
    async beginTransaction() {},
    async commitTransaction() {},
    async rollbackTransaction() {},
    async releaseConnection() {},
    async destroy() {},
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

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('$2a$12$hashed') }))
jest.mock('@/lib/services/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

import { POST } from '../route'
import { getServerSession } from 'next-auth'
import { sendWelcomeEmail } from '@/lib/services/email'

function makeRequest(employeeId: string) {
  return new Request(`http://localhost:3000/api/employees/${employeeId}/create-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'subscriber' }),
  })
}

/** The probe that ORs the legacy id convention with the email match. */
function usersProbe() {
  const probe = capturedQueries.find((q) => q.sql.includes('from "users"'))
  if (!probe) throw new Error('the users probe never ran')
  return probe
}

/** The INSERT that creates the login when the probe finds nothing. */
function usersInsert() {
  const insert = capturedQueries.find((q) => q.sql.includes('insert into "users"'))
  if (!insert) throw new Error('the users insert never ran')
  return insert
}

describe('POST /api/employees/[id]/create-user — email normalisation', () => {
  beforeEach(() => {
    capturedQueries.length = 0
    probeRows = [USER_ROW]
    ;(sendWelcomeEmail as jest.Mock).mockClear()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: true } })
  })

  it('normalises the stored employee address before probing users', async () => {
    const res = await POST(makeRequest('42'), { params: Promise.resolve({ id: '42' }) })
    expect(res.status).toBe(200)

    const probe = usersProbe()
    expect(probe.sql).toContain('"email" = $')
    expect(probe.parameters).toContain('mixed.case@example.com')
    // The un-normalised stored value must not be what was bound.
    expect(probe.parameters).not.toContain(EMPLOYEE_ROW.email)
  })

  it('leaves the legacy users.id arm of the OR intact', async () => {
    await POST(makeRequest('42'), { params: Promise.resolve({ id: '42' }) })

    const probe = usersProbe()
    // ~93% of production logins are linked by `users`.id = `employees`.id, so
    // dropping this arm would create duplicate login rows.
    expect(probe.sql).toMatch(/"id" = \$\d+ or "email" = \$\d+/)
    expect(probe.parameters).toContain('42')
  })

  it('writes the same canonical address it probed for', async () => {
    // No existing login: the route falls through to the INSERT. Read and write
    // must bind the identical string — otherwise, under a case-sensitive
    // engine, the probe misses a stored mixed-case login and this INSERT then
    // trips `users_email_unique` (errno 1062 is not caught in this route, so
    // it surfaces as a 500 instead of the "already existed and has been
    // linked" 200).
    probeRows = []

    const res = await POST(makeRequest('42'), { params: Promise.resolve({ id: '42' }) })
    expect(res.status).toBe(200)

    const probe = usersProbe()
    const insert = usersInsert()

    expect(insert.parameters).toContain('mixed.case@example.com')
    expect(insert.parameters).not.toContain(EMPLOYEE_ROW.email)

    // The load-bearing assertion: same value on both sides of the round trip.
    const probedEmail = probe.parameters[1]
    expect(insert.parameters).toContain(probedEmail)
  })

  it('sends the welcome email to the canonical address', async () => {
    probeRows = []

    await POST(makeRequest('42'), { params: Promise.resolve({ id: '42' }) })

    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'mixed.case@example.com' })
    )
  })

  it('does not run the probe at all for a non-admin caller', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: false } })

    const res = await POST(makeRequest('42'), { params: Promise.resolve({ id: '42' }) })

    expect(res.status).toBe(401)
    expect(capturedQueries).toHaveLength(0)
  })
})
