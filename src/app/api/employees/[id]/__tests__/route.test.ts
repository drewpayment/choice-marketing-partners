/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- route test doubles are intentionally untyped */

// ── Mocks (hoisted by jest) ────────────────────────────────────────────────────
/* eslint-disable no-var */
var repoMock: any
/* eslint-enable no-var */

jest.mock('@/lib/repositories/EmployeeRepository', () => {
  repoMock = {
    getEmployeeById: jest.fn(),
    findEmailOwner: jest.fn().mockResolvedValue(null),
    updateEmployee: jest.fn(),
    softDeleteEmployee: jest.fn().mockResolvedValue(true),
  }

  return {
    EmployeeRepository: jest.fn(() => repoMock),
    isDuplicateEmailError: (error: any) =>
      error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062,
  }
})

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth/config', () => ({ authOptions: {} }))
jest.mock('@/lib/auth/payroll-access', () => ({
  getEmployeeContext: jest.fn().mockResolvedValue({ employeeId: 1, isAdmin: true, isManager: false }),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
}))

// ── Imports (after mocks) ──────────────────────────────────────────────────────
import { PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { ParkedEmailTooLongError } from '@/lib/utils/email'

// ── Helpers ────────────────────────────────────────────────────────────────────
const liveEmployee = {
  id: 1252, name: 'Chaise Scott', email: 'Chaise.Scott@Gmail.com', deleted_at: null,
}
const deletedEmployee = { ...liveEmployee, deleted_at: new Date('2020-03-15') }

function makeRequest(body: object) {
  return new Request('http://localhost:3000/api/employees/1252', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

function makeParams(id = '1252') {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/employees/[id] — email guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: true } })
    repoMock.findEmailOwner.mockResolvedValue(null)
    repoMock.updateEmployee.mockResolvedValue({ ...liveEmployee })
  })

  it('refuses to change the email of a soft-deleted employee', async () => {
    repoMock.getEmployeeById.mockResolvedValue(deletedEmployee)

    const response = await PUT(makeRequest({ email: 'new@gmail.com' }), makeParams())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Restore this employee before changing their email address.',
    })
    expect(repoMock.updateEmployee).not.toHaveBeenCalled()
  })

  it('still allows other field edits on a soft-deleted employee', async () => {
    repoMock.getEmployeeById.mockResolvedValue(deletedEmployee)

    const response = await PUT(makeRequest({ city: 'Toledo' }), makeParams())

    expect(response.status).toBe(200)
    expect(repoMock.updateEmployee).toHaveBeenCalled()
  })

  it('treats a case-only difference as unchanged (MySQL compares case-insensitively)', async () => {
    repoMock.getEmployeeById.mockResolvedValue(deletedEmployee)

    const response = await PUT(makeRequest({ email: 'chaise.scott@gmail.com' }), makeParams())

    // Not a real change, so the deleted-employee guard must not fire.
    expect(response.status).toBe(200)
    expect(repoMock.findEmailOwner).not.toHaveBeenCalled()
  })

  it('returns the owner-aware conflict message for a live employee', async () => {
    repoMock.getEmployeeById.mockResolvedValue(liveEmployee)
    repoMock.findEmailOwner.mockResolvedValue({
      source: 'user', employeeId: 1256, employeeName: 'Someone Else', employeeDeleted: true,
    })

    const response = await PUT(makeRequest({ email: 'taken@gmail.com' }), makeParams())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Email address is already in use by the login account of deleted employee Someone Else (#1256).',
    })
  })

  it('maps a lost unique-index race to the same 400 conflict', async () => {
    repoMock.getEmployeeById.mockResolvedValue(liveEmployee)
    repoMock.updateEmployee.mockRejectedValue(
      Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY', errno: 1062 })
    )

    const response = await PUT(makeRequest({ email: 'racy@gmail.com' }), makeParams())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Email address is already in use.',
    })
  })

  it('trims the submitted address before comparing', async () => {
    repoMock.getEmployeeById.mockResolvedValue(liveEmployee)

    const response = await PUT(makeRequest({ email: '  chaise.scott@gmail.com  ' }), makeParams())

    expect(response.status).toBe(200)
    expect(repoMock.findEmailOwner).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/employees/[id] — unparkable login email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: true } })
    repoMock.getEmployeeById.mockResolvedValue(liveEmployee)
  })

  it('returns 400 with the descriptive message instead of an opaque 500', async () => {
    repoMock.softDeleteEmployee.mockRejectedValue(
      new ParkedEmailTooLongError('Login email too long to park for employee 1252: ...')
    )

    const request = new Request('http://localhost:3000/api/employees/1252', { method: 'DELETE' }) as any
    const response = await DELETE(request, makeParams())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Login email too long to park for employee 1252: ...',
    })
  })

  it('still returns 500 for unrelated failures', async () => {
    repoMock.softDeleteEmployee.mockRejectedValue(new Error('connection lost'))

    const request = new Request('http://localhost:3000/api/employees/1252', { method: 'DELETE' }) as any
    const response = await DELETE(request, makeParams())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to delete employee' })
  })
})
