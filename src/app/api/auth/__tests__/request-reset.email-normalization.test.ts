/**
 * @jest-environment node
 *
 * `POST /api/auth/request-reset` already lowercased its input; it now goes
 * through the shared `normalizeEmail` helper, which additionally trims. These
 * tests pin both halves so the site cannot regress to a raw lookup or drift
 * away from the helper.
 *
 * The compile-only driver returns no rows, so every request here takes the
 * anti-enumeration success path — the bound parameter is the behaviour.
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

const mockSend = jest.fn().mockResolvedValue({ id: 'email_1' })
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}))

jest.mock('@react-email/render', () => ({
  render: jest.fn().mockReturnValue('<html></html>'),
}))

import { POST } from '../request-reset/route'

function post(email: unknown) {
  return POST(
    new Request('http://localhost:3000/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  )
}

describe('POST /api/auth/request-reset — email normalisation', () => {
  beforeEach(() => {
    capturedQueries.length = 0
    mockSend.mockClear()
  })

  it('lowercases the submitted address before the users lookup', async () => {
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

  it('keeps the anti-enumeration response for an unknown address', async () => {
    const res = await post('Nobody@Example.com')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('If an account exists')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('rejects a missing address before any query runs', async () => {
    const res = await post(undefined)

    expect(res.status).toBe(400)
    expect(capturedQueries).toHaveLength(0)
  })
})
