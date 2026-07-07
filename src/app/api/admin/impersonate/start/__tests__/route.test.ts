/**
 * @jest-environment node
 */

// ── Mocks (hoisted by jest) ─────────────────────────────────────────────────────
const mockGetActiveImpersonation = jest.fn()
const mockStartImpersonation = jest.fn()
const mockStopImpersonation = jest.fn()

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/auth/impersonation-snapshot', () => ({
  buildImpersonationSnapshot: jest.fn(),
}))

jest.mock('@/lib/repositories/ImpersonationRepository', () => ({
  ImpersonationRepository: jest.fn().mockImplementation(() => ({
    getActiveImpersonation: mockGetActiveImpersonation,
    startImpersonation: mockStartImpersonation,
    stopImpersonation: mockStopImpersonation,
  })),
}))

// ── Imports (after mocks) ───────────────────────────────────────────────────────
import { POST } from '../route'
import { getServerSession } from 'next-auth'
import { buildImpersonationSnapshot } from '@/lib/auth/impersonation-snapshot'

// ── Helpers ─────────────────────────────────────────────────────────────────────
const actorId = 'admin-1'
const targetId = 'target-1'

const mockSession = {
  user: { id: actorId, isSuperAdmin: true, isAdmin: true, isManager: false, employeeId: 5 },
}

function makeRequest(body: object = { targetUserId: targetId }) {
  return new Request('http://localhost:3000/api/admin/impersonate/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

function buildSnapshot() {
  ;(buildImpersonationSnapshot as jest.Mock).mockResolvedValue({
    targetUserId: targetId,
    targetEmployeeId: 9,
    isSuperAdmin: false,
    snapshot: { actAsUserId: targetId, targetName: 'Target' },
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────────
describe('POST /api/admin/impersonate/start', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    mockStartImpersonation.mockResolvedValue(1)
    mockStopImpersonation.mockResolvedValue(1)
    buildSnapshot()
  })

  it('returns 403 when caller is not a SuperAdmin', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: actorId, isSuperAdmin: false } })

    const res = await POST(makeRequest())
    expect(res.status).toBe(403)
  })

  it('starts a session when no open row exists', async () => {
    mockGetActiveImpersonation.mockResolvedValue(null)

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(mockStartImpersonation).toHaveBeenCalledTimes(1)
    expect(mockStopImpersonation).not.toHaveBeenCalled()
  })

  it('returns 409 when a live (non-expired) session is already open', async () => {
    mockGetActiveImpersonation.mockResolvedValue({
      id: 1,
      actor_user_id: actorId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 min in the future
    })

    const res = await POST(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toBe('An impersonation session is already open')
    expect(mockStartImpersonation).not.toHaveBeenCalled()
    expect(mockStopImpersonation).not.toHaveBeenCalled()
  })

  it('closes an expired orphan row and proceeds instead of blocking (THE BUG FIX)', async () => {
    mockGetActiveImpersonation.mockResolvedValue({
      id: 1,
      actor_user_id: actorId,
      expires_at: new Date(Date.now() - 60 * 1000), // expired 1 min ago
    })

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(mockStopImpersonation).toHaveBeenCalledWith(actorId, 'expired')
    expect(mockStartImpersonation).toHaveBeenCalledTimes(1)
  })

  it('treats a null expires_at row as a closable orphan', async () => {
    mockGetActiveImpersonation.mockResolvedValue({
      id: 1,
      actor_user_id: actorId,
      expires_at: null,
    })

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(mockStopImpersonation).toHaveBeenCalledWith(actorId, 'expired')
    expect(mockStartImpersonation).toHaveBeenCalledTimes(1)
  })
})
