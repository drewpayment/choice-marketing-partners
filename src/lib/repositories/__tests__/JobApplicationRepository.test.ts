import { JobApplicationRepository } from '../JobApplicationRepository'
import type { UserContext } from '@/lib/auth/types'

// These tests never reach the DB (every case throws on the admin guard before
// any query runs). The real `db` client is imported for real on purpose: the
// `TextEncoder` polyfill `pg` needs at import time lives in jest.setup.js, and
// stubbing the module here would make a future test that *does* reach the DB
// silently pass against `undefined` instead of failing loudly.

describe('JobApplicationRepository', () => {
  const repo = new JobApplicationRepository()

  it('exposes the expected method surface', () => {
    expect(repo).toBeDefined()
    expect(typeof repo.submit).toBe('function')
    expect(typeof repo.listAll).toBe('function')
    expect(typeof repo.getById).toBe('function')
    expect(typeof repo.updateStatus).toBe('function')
  })

  it('rejects admin-only methods for non-admin users without touching the DB', async () => {
    const nonAdmin: UserContext = { isAdmin: false, isManager: false, employeeId: 1 }

    await expect(repo.listAll(nonAdmin)).rejects.toThrow(/admin/i)
    await expect(repo.getById(1, nonAdmin)).rejects.toThrow(/admin/i)
    await expect(repo.updateStatus(1, 'reviewing', null, nonAdmin)).rejects.toThrow(/admin/i)
  })
})
