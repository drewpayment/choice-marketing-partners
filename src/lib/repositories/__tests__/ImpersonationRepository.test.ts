import { ImpersonationRepository } from '../ImpersonationRepository'

const mockExecuteTakeFirst = jest.fn()
const mockExecuteTakeFirstOrThrow = jest.fn()
const mockExecute = jest.fn()
// Hoisted so the insert tests can assert *which* column was requested from
// RETURNING and *what* was bound — the resolved `{ id: 42 }` is the same
// whatever the repository asked for.
const mockInsertInto = jest.fn()
const mockValues = jest.fn()
const mockReturning = jest.fn()

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      executeTakeFirst: mockExecuteTakeFirst,
    })),
    insertInto: (...args: unknown[]) => {
      mockInsertInto(...args)
      return {
        values: mockValues,
        returning: mockReturning,
        executeTakeFirst: mockExecuteTakeFirst,
        executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
        execute: mockExecute,
      }
    },
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
    mockValues.mockReturnThis()
    mockReturning.mockReturnThis()
  })

  it('startImpersonation returns the inserted id', async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValueOnce({ id: 42 })
    const expiresAt = new Date(Date.now() + 60_000)

    const id = await repo.startImpersonation({
      actorUserId: 'a-1',
      targetUserId: 't-1',
      expiresAt,
    })

    expect(id).toBe(42)
    // `user_impersonation_log`'s PK is `id`, but `users` in this schema has
    // BOTH `id` and `uid` (with `uid` as the PK), so `.returning('uid')` is a
    // realistic slip here. The mock resolves `{ id: 42 }` no matter what was
    // requested, so the column name has to be asserted directly.
    expect(mockInsertInto).toHaveBeenCalledWith('user_impersonation_log')
    expect(mockReturning).toHaveBeenCalledWith('id')
    expect(mockValues).toHaveBeenCalledWith({
      actor_user_id: 'a-1',
      target_user_id: 't-1',
      actor_employee_id: null,
      target_employee_id: null,
      expires_at: expiresAt,
      ip_address: null,
      user_agent: null,
    })
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

  it("stopImpersonation accepts 'superseded' (orphan cleanup on re-start)", async () => {
    mockExecuteTakeFirst.mockResolvedValueOnce({ numUpdatedRows: BigInt(1) })

    const count = await repo.stopImpersonation('a-1', 'superseded')
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
