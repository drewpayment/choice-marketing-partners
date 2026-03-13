/**
 * @jest-environment node
 */

// ── Mocks (hoisted by jest) ─────────────────────────────────────────────────────

// Build a chainable query-builder mock so we can control what each query returns.
function chainable(resolvedValue?: any) {
  const chain: any = {}
  const methods = [
    'select', 'selectFrom', 'insertInto', 'updateTable',
    'where', 'values', 'set', 'or',
  ]
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain)
  })
  chain.executeTakeFirst = jest.fn().mockResolvedValue(resolvedValue)
  chain.executeTakeFirstOrThrow = jest.fn().mockResolvedValue(resolvedValue)
  chain.execute = jest.fn().mockResolvedValue(resolvedValue)
  return chain
}

// Track per-table query chains — set in beforeEach
let queryChains: Record<string, any> = {}

const mockSelectFrom = jest.fn((table: string) => queryChains[`select:${table}`] ?? chainable())
const mockInsertInto = jest.fn((table: string) => queryChains[`insert:${table}`] ?? chainable())
const mockUpdateTable = jest.fn((table: string) => queryChains[`update:${table}`] ?? chainable())
const mockTransaction = jest.fn()

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: (...args: any[]) => mockSelectFrom(...args),
    insertInto: (...args: any[]) => mockInsertInto(...args),
    updateTable: (...args: any[]) => mockUpdateTable(...args),
    transaction: (...args: any[]) => mockTransaction(...args),
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
}))

jest.mock('@/lib/services/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

// ── Imports (after mocks) ───────────────────────────────────────────────────────
import { POST } from '../route'
import { getServerSession } from 'next-auth'
import { sendWelcomeEmail } from '@/lib/services/email'

// ── Helpers ─────────────────────────────────────────────────────────────────────
const mockSession = { user: { isAdmin: true } }

function makeRequest(employeeId: string, body: object = { role: 'subscriber' }) {
  return new Request(
    `http://localhost:3000/api/employees/${employeeId}/create-user`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ── Tests ───────────────────────────────────────────────────────────────────────
describe('POST /api/employees/[id]/create-user', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryChains = {}
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  // ── Auth ────────────────────────────────────────────────────────────────────
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const res = await POST(makeRequest('1'), makeParams('1'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not admin', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: false } })

    const res = await POST(makeRequest('1'), makeParams('1'))
    expect(res.status).toBe(401)
  })

  // ── Validation ──────────────────────────────────────────────────────────────
  it('returns 400 for invalid role', async () => {
    const res = await POST(makeRequest('1', { role: 'superadmin' }), makeParams('1'))
    expect(res.status).toBe(400)
  })

  // ── Employee not found ──────────────────────────────────────────────────────
  it('returns 404 when employee does not exist', async () => {
    queryChains['select:employees'] = chainable(undefined)

    const res = await POST(makeRequest('999'), makeParams('999'))
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('Employee not found')
  })

  // ── Already linked via employee_user ─────────────────────────────────────────
  it('returns 409 when employee_user link already exists', async () => {
    queryChains['select:employees'] = chainable({
      id: 42, name: 'Test User', email: 'test@example.com',
    })
    queryChains['select:employee_user'] = chainable({ user_id: 10 })

    const res = await POST(makeRequest('42'), makeParams('42'))
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain('already exists')
  })

  // ── Existing user row, no link (THE BUG FIX) ────────────────────────────────
  it('links existing user when users row exists but employee_user does not', async () => {
    const existingUser = { uid: 7, id: 42, email: 'dspiker@example.com', role: 'subscriber' }

    queryChains['select:employees'] = chainable({
      id: 42, name: 'D Spiker', email: 'dspiker@example.com',
    })
    queryChains['select:employee_user'] = chainable(undefined) // no link
    queryChains['select:users'] = chainable(existingUser)
    queryChains['insert:employee_user'] = chainable()

    const res = await POST(makeRequest('42', { role: 'subscriber' }), makeParams('42'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('linked')
    // No password should be returned for linked accounts
    expect(data.password).toBeUndefined()
    // Should have inserted into employee_user
    expect(mockInsertInto).toHaveBeenCalledWith('employee_user')
    // Should NOT have sent a welcome email
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it('updates role when linking existing user with different role', async () => {
    const existingUser = { uid: 7, id: 42, email: 'dspiker@example.com', role: 'subscriber' }

    queryChains['select:employees'] = chainable({
      id: 42, name: 'D Spiker', email: 'dspiker@example.com',
    })
    queryChains['select:employee_user'] = chainable(undefined)
    queryChains['select:users'] = chainable(existingUser)
    queryChains['insert:employee_user'] = chainable()
    queryChains['update:users'] = chainable()

    const res = await POST(makeRequest('42', { role: 'admin' }), makeParams('42'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.role).toBe('admin')
    // Should have called updateTable for role change
    expect(mockUpdateTable).toHaveBeenCalledWith('users')
  })

  it('does not update role when linking existing user with same role', async () => {
    const existingUser = { uid: 7, id: 42, email: 'dspiker@example.com', role: 'subscriber' }

    queryChains['select:employees'] = chainable({
      id: 42, name: 'D Spiker', email: 'dspiker@example.com',
    })
    queryChains['select:employee_user'] = chainable(undefined)
    queryChains['select:users'] = chainable(existingUser)
    queryChains['insert:employee_user'] = chainable()

    const res = await POST(makeRequest('42', { role: 'subscriber' }), makeParams('42'))
    await res.json()

    // Should NOT have called updateTable — role is already subscriber
    expect(mockUpdateTable).not.toHaveBeenCalled()
  })

  // ── Brand new user ──────────────────────────────────────────────────────────
  it('creates new user and link when no user exists at all', async () => {
    const createdUser = { id: 99, email: 'new@example.com', role: 'subscriber' }

    queryChains['select:employees'] = chainable({
      id: 50, name: 'New Person', email: 'new@example.com',
    })
    queryChains['select:employee_user'] = chainable(undefined)
    queryChains['select:users'] = chainable(undefined) // no existing user

    // Transaction mock
    const trxInsertUsersChain = chainable()
    trxInsertUsersChain.executeTakeFirstOrThrow.mockResolvedValue({ insertId: BigInt(99) })
    const trxInsertLinkChain = chainable()
    const trxSelectChain = chainable(createdUser)

    const trx = {
      insertInto: jest.fn((table: string) => {
        if (table === 'users') return trxInsertUsersChain
        if (table === 'employee_user') return trxInsertLinkChain
        return chainable()
      }),
      selectFrom: jest.fn(() => trxSelectChain),
    }

    mockTransaction.mockReturnValue({
      execute: jest.fn((cb: any) => cb(trx)),
    })

    const res = await POST(makeRequest('50', { role: 'subscriber' }), makeParams('50'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('created successfully')
    expect(data.password).toBeDefined()
    expect(data.password.length).toBeGreaterThan(0)
    // Should have created user in transaction
    expect(trx.insertInto).toHaveBeenCalledWith('users')
    expect(trx.insertInto).toHaveBeenCalledWith('employee_user')
    // Should have sent welcome email
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@example.com' }),
    )
  })

  it('still succeeds if welcome email fails', async () => {
    const createdUser = { id: 99, email: 'new@example.com', role: 'subscriber' }

    queryChains['select:employees'] = chainable({
      id: 50, name: 'New Person', email: 'new@example.com',
    })
    queryChains['select:employee_user'] = chainable(undefined)
    queryChains['select:users'] = chainable(undefined)

    const trxInsertUsersChain = chainable()
    trxInsertUsersChain.executeTakeFirstOrThrow.mockResolvedValue({ insertId: BigInt(99) })

    const trx = {
      insertInto: jest.fn(() => trxInsertUsersChain),
      selectFrom: jest.fn(() => chainable(createdUser)),
    }
    mockTransaction.mockReturnValue({
      execute: jest.fn((cb: any) => cb(trx)),
    })

    ;(sendWelcomeEmail as jest.Mock).mockRejectedValue(new Error('SMTP down'))

    const res = await POST(makeRequest('50'), makeParams('50'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
