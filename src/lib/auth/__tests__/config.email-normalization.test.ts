/**
 * @jest-environment node
 *
 * NextAuth `authorize` must normalise the submitted address before it reaches
 * the `users` lookup.
 *
 * On MySQL (utf8mb3_unicode_ci) case is already ignored, so the case half of
 * this is a no-op today and the trim half is a strict improvement. On a
 * case-sensitive engine it is the difference between a working and a broken
 * login, which is why the assertion is on the *bound parameter* rather than on
 * the returned user: the repository mock returns no rows either way.
 */
/* eslint-disable no-var */
var capturedQueries: { sql: string; parameters: readonly unknown[] }[]
// Rows the fake driver replays per table. Default empty (no user matches), so
// the normalisation cases below assert on the bound parameter; the success-path
// case fills them in to drive `authorize` all the way to its return value.
var userRows: Record<string, unknown>[]
var employeeRows: Record<string, unknown>[]
var subscriberRows: Record<string, unknown>[]
/* eslint-enable no-var */

jest.mock('@/lib/database/client', () => {
  const {
    Kysely,
    MysqlAdapter,
    MysqlIntrospector,
    MysqlQueryCompiler,
  } = jest.requireActual('kysely')

  capturedQueries = []
  userRows = []
  employeeRows = []
  subscriberRows = []

  const connection = {
    async executeQuery(compiled: { sql: string; parameters: readonly unknown[] }) {
      capturedQueries.push({ sql: compiled.sql, parameters: compiled.parameters })

      if (compiled.sql.includes('from `subscriber_user`')) return { rows: subscriberRows }
      if (compiled.sql.includes('from `employees`')) return { rows: employeeRows }
      if (compiled.sql.includes('from `users`')) return { rows: userRows }
      return { rows: [] }
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

jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

import bcrypt from 'bcryptjs'
import { authOptions } from '../config'

// Real hash, low cost factor: the credential comparison is the one thing in
// this file that must not be mocked away.
const PASSWORD_HASH = bcrypt.hashSync('password123', 4)

type Authorize = (
  credentials: Record<string, string> | undefined
) => Promise<unknown>

/**
 * `CredentialsProvider(...)` stores the caller's config under `.options` and
 * ships an `authorize: () => null` placeholder on the object itself (NextAuth
 * merges the two at runtime). Reading `.authorize` directly would silently test
 * that placeholder, so resolve `.options.authorize` and refuse the stub.
 */
function getAuthorize(): Authorize {
  const provider = authOptions.providers[0] as unknown as {
    authorize?: Authorize
    options?: { authorize?: Authorize }
  }
  const authorize = provider?.options?.authorize
  if (typeof authorize !== 'function') {
    throw new Error('credentials provider is not the first configured provider')
  }
  return authorize
}

describe('NextAuth authorize — email normalisation', () => {
  beforeEach(() => {
    capturedQueries.length = 0
    userRows = []
    employeeRows = []
    subscriberRows = []
  })

  it('resolves the real authorize implementation, not the provider stub', async () => {
    const authorize = getAuthorize()
    expect(typeof authorize).toBe('function')

    // The NextAuth stub returns null without querying; the real implementation
    // hits `users`. Without this guard every assertion below could pass
    // vacuously against the stub.
    await authorize({ email: 'employee@test.com', password: 'password123' })
    expect(capturedQueries).toHaveLength(1)
    expect(capturedQueries[0].sql).toContain('from `users`')
  })

  it('lowercases the submitted address before the users lookup', async () => {
    await getAuthorize()({ email: 'Mixed.Case@Example.COM', password: 'password123' })

    const lookup = capturedQueries[0]
    expect(lookup.sql).toContain('from `users`')
    expect(lookup.sql).toContain('`email` = ?')
    expect(lookup.parameters[0]).toBe('mixed.case@example.com')
  })

  it('trims surrounding whitespace before the users lookup', async () => {
    await getAuthorize()({ email: '  employee@test.com\t\n', password: 'password123' })

    expect(capturedQueries[0].parameters[0]).toBe('employee@test.com')
  })

  it('handles mixed case and padding together', async () => {
    await getAuthorize()({ email: '\t  ADMIN@Test.Com  ', password: 'password123' })

    expect(capturedQueries[0].parameters[0]).toBe('admin@test.com')
  })

  it('passes an already-canonical address through untouched', async () => {
    await getAuthorize()({ email: 'manager@test.com', password: 'password123' })

    expect(capturedQueries[0].parameters[0]).toBe('manager@test.com')
  })

  it('never normalises the password or issues a query without credentials', async () => {
    // Behaviour guard: missing credentials must still short-circuit to null
    // before touching the database.
    await expect(getAuthorize()(undefined)).resolves.toBeNull()
    await expect(getAuthorize()({ email: '', password: 'password123' })).resolves.toBeNull()
    await expect(getAuthorize()({ email: 'employee@test.com', password: '' })).resolves.toBeNull()

    expect(capturedQueries).toHaveLength(0)
  })

  describe('success path (the lookup value changed — authentication must not)', () => {
    beforeEach(() => {
      userRows = [
        { id: 1250, email: 'Manager@Test.com', password: PASSWORD_HASH, name: 'Test Manager' },
      ]
      employeeRows = [
        {
          employee_id: 1250,
          employee_name: 'Test Manager',
          employee_email: 'Manager@Test.com',
          is_admin: 0,
          is_mgr: 1,
          is_super_admin: 0,
          is_active: 1,
          sales_id1: 'MGR1',
          sales_id2: '',
          sales_id3: null,
        },
      ]
    })

    it('still authenticates a valid credential and returns the same claims', async () => {
      const user = (await getAuthorize()({
        email: '  Manager@Test.com ',
        password: 'password123',
      })) as Record<string, unknown>

      expect(user).not.toBeNull()
      expect(user).toMatchObject({
        id: '1250',
        // The stored value is returned into the session, not the normalised
        // lookup key — normalisation is a comparison concern only.
        email: 'Manager@Test.com',
        name: 'Test Manager',
        isAdmin: false,
        isManager: true,
        isSuperAdmin: false,
        isActive: true,
        isSubscriber: false,
        employeeId: 1250,
        salesIds: ['MGR1'],
      })

      // …and it got there through a normalised lookup.
      expect(capturedQueries[0].parameters[0]).toBe('manager@test.com')
    })

    it('still rejects a wrong password for a matching address', async () => {
      await expect(
        getAuthorize()({ email: 'manager@test.com', password: 'not-the-password' })
      ).resolves.toBeNull()
    })

    it('flags an admin and a subscriber from the same lookup', async () => {
      employeeRows[0].is_admin = 1
      employeeRows[0].is_super_admin = 1
      subscriberRows = [{ subscriber_id: 9 }]

      const user = (await getAuthorize()({
        email: 'MANAGER@TEST.COM',
        password: 'password123',
      })) as Record<string, unknown>

      expect(user).toMatchObject({
        isAdmin: true,
        isSuperAdmin: true,
        isSubscriber: true,
        subscriberId: 9,
      })
    })
  })

  it('returns null when no user matches (driver returns no rows)', async () => {
    await expect(
      getAuthorize()({ email: 'Nobody@Example.com', password: 'password123' })
    ).resolves.toBeNull()

    // The lookup still ran — and still ran normalised.
    expect(capturedQueries).toHaveLength(1)
    expect(capturedQueries[0].parameters[0]).toBe('nobody@example.com')
  })
})
