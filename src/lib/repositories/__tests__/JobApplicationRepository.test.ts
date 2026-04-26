import { JobApplicationRepository } from '../JobApplicationRepository'
import type { UserContext } from '@/lib/auth/types'

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
