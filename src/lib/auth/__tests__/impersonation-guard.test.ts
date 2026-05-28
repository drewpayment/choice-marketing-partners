/**
 * @jest-environment node
 */
import type { Session } from 'next-auth'
import {
  isImpersonationAllowedWrite,
  rejectIfImpersonating,
} from '../impersonation-guard'

jest.mock('@/lib/repositories/ImpersonationRepository', () => ({
  ImpersonationRepository: jest.fn().mockImplementation(() => ({
    logBlockedMutation: jest.fn().mockResolvedValue(undefined),
  })),
}))

function makeSession(impersonating: boolean): Session {
  return {
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: 'target-1',
      isAdmin: false,
      isManager: false,
      isSuperAdmin: false,
      isActive: true,
      isSubscriber: false,
      salesIds: [],
    },
    ...(impersonating && {
      impersonation: {
        actorUserId: 'actor-1',
        actorName: 'Admin',
        targetUserId: 'target-1',
        targetName: 'Target',
        expiresAt: Date.now() + 60_000,
      },
    }),
  } as Session
}

function makeRequest(method: string, path = '/api/employees/1'): Request {
  return new Request(`http://localhost${path}`, { method })
}

describe('isImpersonationAllowedWrite', () => {
  it('allows the stop endpoint', () => {
    expect(isImpersonationAllowedWrite('/api/admin/impersonate/stop')).toBe(true)
  })

  it('rejects other admin endpoints', () => {
    expect(isImpersonationAllowedWrite('/api/admin/feature-flags')).toBe(false)
    expect(isImpersonationAllowedWrite('/api/admin/impersonate/start')).toBe(false)
  })
})

describe('rejectIfImpersonating', () => {
  it('returns null when not impersonating', async () => {
    const res = await rejectIfImpersonating(
      makeRequest('POST'),
      makeSession(false)
    )
    expect(res).toBeNull()
  })

  it('returns null for GET requests during impersonation', async () => {
    const res = await rejectIfImpersonating(
      makeRequest('GET'),
      makeSession(true)
    )
    expect(res).toBeNull()
  })

  it('returns null when path is on the allowlist', async () => {
    const res = await rejectIfImpersonating(
      makeRequest('POST', '/api/admin/impersonate/stop'),
      makeSession(true)
    )
    expect(res).toBeNull()
  })

  it('returns 403 when impersonating and method is mutating', async () => {
    const res = await rejectIfImpersonating(
      makeRequest('POST', '/api/employees/1'),
      makeSession(true)
    )
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
  })

  it('returns 403 for PUT, PATCH, DELETE', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const res = await rejectIfImpersonating(
        makeRequest(method, '/api/employees/1'),
        makeSession(true)
      )
      expect(res?.status).toBe(403)
    }
  })

  it('returns null for null session', async () => {
    const res = await rejectIfImpersonating(makeRequest('POST'), null)
    expect(res).toBeNull()
  })
})
