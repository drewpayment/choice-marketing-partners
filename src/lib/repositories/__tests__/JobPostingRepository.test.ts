import { JobPostingRepository } from '../JobPostingRepository'
import type { UserContext } from '@/lib/auth/types'

describe('JobPostingRepository', () => {
  const repo = new JobPostingRepository()

  it('exposes the expected method surface', () => {
    expect(repo).toBeDefined()
    expect(typeof repo.listActive).toBe('function')
    expect(typeof repo.getBySlug).toBe('function')
    expect(typeof repo.getActiveBySlug).toBe('function')
    expect(typeof repo.listAll).toBe('function')
    expect(typeof repo.getById).toBe('function')
    expect(typeof repo.create).toBe('function')
    expect(typeof repo.update).toBe('function')
    expect(typeof repo.softDelete).toBe('function')
    expect(typeof repo.slugExists).toBe('function')
  })

  it('rejects admin-only methods for non-admin users without touching the DB', async () => {
    const nonAdmin: UserContext = { isAdmin: false, isManager: false, employeeId: 1 }

    await expect(repo.listAll(nonAdmin)).rejects.toThrow(/admin/i)
    await expect(repo.getById(1, nonAdmin)).rejects.toThrow(/admin/i)
    await expect(
      repo.create(
        {
          slug: 's',
          title: 't',
          department: 'sales',
          employment_type: 'full-time',
          work_setting: 'remote',
          description: '',
          responsibilities: '',
          qualifications: '',
        },
        nonAdmin,
      ),
    ).rejects.toThrow(/admin/i)
    await expect(repo.update(1, {}, nonAdmin)).rejects.toThrow(/admin/i)
    await expect(repo.softDelete(1, nonAdmin)).rejects.toThrow(/admin/i)
  })

  it('throws when creating with an admin context that has no employeeId', async () => {
    const adminNoEmp: UserContext = { isAdmin: true, isManager: false }
    await expect(
      repo.create(
        {
          slug: 's',
          title: 't',
          department: 'sales',
          employment_type: 'full-time',
          work_setting: 'remote',
          description: '',
          responsibilities: '',
          qualifications: '',
        },
        adminNoEmp,
      ),
    ).rejects.toThrow(/employeeId/i)
  })
})
