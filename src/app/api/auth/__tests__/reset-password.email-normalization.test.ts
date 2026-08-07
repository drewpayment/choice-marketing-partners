/**
 * @jest-environment node
 *
 * `POST /api/auth/reset-password` re-verifies the account named in the reset
 * JWT. The address inside that token is whatever was stored on the `users` row
 * when the token was minted, so the lookup must normalise it rather than trust
 * its casing/padding.
 *
 * Asserted on the bound parameter: the compile-only driver returns no rows, so
 * the response is a 404 in every case here — the parameter is the behaviour.
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

jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}))

import { POST } from '../reset-password/route'
import { generatePasswordResetToken } from '@/lib/auth/password-reset'

function makeRequest(body: object) {
  return new Request('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function post(tokenEmail: string, userId = '42') {
  const token = generatePasswordResetToken(tokenEmail, userId)
  return POST(makeRequest({ token, password: 'newpassword123' }))
}

describe('POST /api/auth/reset-password — email normalisation', () => {
  beforeEach(() => {
    capturedQueries.length = 0
  })

  it('lowercases the token address before the users lookup', async () => {
    await post('Mixed.Case@Example.COM')

    const lookup = capturedQueries[0]
    expect(lookup.sql).toContain('from `users`')
    expect(lookup.sql).toContain('`email` = ?')
    expect(lookup.parameters[0]).toBe('mixed.case@example.com')
  })

  it('trims surrounding whitespace before the users lookup', async () => {
    await post('  employee@test.com \n')

    expect(capturedQueries[0].parameters[0]).toBe('employee@test.com')
  })

  it('handles mixed case and padding together', async () => {
    await post('\t ADMIN@Test.Com  ')

    expect(capturedQueries[0].parameters[0]).toBe('admin@test.com')
  })

  it('still scopes the lookup to the token user id', async () => {
    await post('Mixed.Case@Example.COM', '1252')

    // Normalising the address must not have disturbed the second predicate —
    // the id is what stops one account's token resetting another's password.
    expect(capturedQueries[0].sql).toContain('`id` = ?')
    expect(capturedQueries[0].parameters[1]).toBe(1252)
  })

  it('rejects an invalid token before any query runs', async () => {
    const res = await POST(makeRequest({ token: 'not-a-jwt', password: 'newpassword123' }))

    expect(res.status).toBe(400)
    expect(capturedQueries).toHaveLength(0)
  })

  it('rejects a short password before any query runs', async () => {
    const token = generatePasswordResetToken('employee@test.com', '42')
    const res = await POST(makeRequest({ token, password: 'short' }))

    expect(res.status).toBe(400)
    expect(capturedQueries).toHaveLength(0)
  })

  it('404s when the normalised address matches no user', async () => {
    const res = await post('Nobody@Example.com')

    expect(res.status).toBe(404)
  })
})
