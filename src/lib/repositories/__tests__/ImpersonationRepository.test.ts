import { ImpersonationRepository } from '../ImpersonationRepository'

const mockExecuteTakeFirst = jest.fn()
const mockExecute = jest.fn()

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      executeTakeFirst: mockExecuteTakeFirst,
    })),
    insertInto: jest.fn(() => ({
      values: jest.fn().mockReturnThis(),
      executeTakeFirst: mockExecuteTakeFirst,
      execute: mockExecute,
    })),
    updateTable: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: mockExecuteTakeFirst,
    })),
  },
}))

describe('ImpersonationRepository', () => {
  let repo: ImpersonationRepository

  beforeEach(() => {
    repo = new ImpersonationRepository()
    jest.clearAllMocks()
  })

  it('startImpersonation returns the inserted id', async () => {
    mockExecuteTakeFirst.mockResolvedValueOnce({ insertId: 42 })

    const id = await repo.startImpersonation({
      actorUserId: 'a-1',
      targetUserId: 't-1',
      expiresAt: new Date(Date.now() + 60_000),
    })

    expect(id).toBe(42)
  })

  it('getActiveImpersonation returns null when no open row exists', async () => {
    mockExecuteTakeFirst.mockResolvedValueOnce(undefined)

    const active = await repo.getActiveImpersonation('a-1')
    expect(active).toBeNull()
  })

  it('stopImpersonation returns the number of updated rows', async () => {
    mockExecuteTakeFirst.mockResolvedValueOnce({ numUpdatedRows: BigInt(1) })

    const count = await repo.stopImpersonation('a-1', 'manual')
    expect(count).toBe(1)
  })

  it('logBlockedMutation runs an insert', async () => {
    mockExecute.mockResolvedValueOnce(undefined)

    await repo.logBlockedMutation({
      actorUserId: 'a-1',
      targetUserId: 't-1',
      method: 'POST',
      path: '/api/employees/1',
    })

    expect(mockExecute).toHaveBeenCalledTimes(1)
  })
})
