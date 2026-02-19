import { FeatureFlagRepository, FlagContext } from '../FeatureFlagRepository'
import { db } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    deleteFrom: jest.fn(),
  },
}))

const mockSelect = (rows: unknown[]) => ({
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue(rows),
  executeTakeFirst: jest.fn().mockResolvedValue(rows[0] ?? undefined),
})

describe('FeatureFlagRepository', () => {
  let repo: FeatureFlagRepository

  beforeEach(() => {
    repo = new FeatureFlagRepository()
    jest.clearAllMocks()
  })

  const baseContext: FlagContext = {
    userId: '42',
    isAdmin: false,
    isManager: false,
    isSubscriber: false,
    subscriberId: null,
  }

  describe('evaluateFlag', () => {
    it('returns false when flag does not exist', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(mockSelect([]))
      const result = await repo.evaluateFlag('nonexistent', baseContext)
      expect(result).toBe(false)
    })

    it('returns false when is_enabled = 0 (kill switch)', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(
        mockSelect([{ id: 1, name: 'test', is_enabled: 0, rollout_percentage: 100, environment: 'production' }])
      )
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(false)
    })

    it('returns false when environment does not match', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(
        mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 100, environment: 'staging' }])
      )
      // NODE_ENV is 'test' in jest, not 'staging'
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(false)
    })

    it('returns true when environment is "all" and flag is enabled', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 100, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([]))
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(true)
    })

    it('respects user override over rollout percentage', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 0, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([
          { context_type: 'user', context_value: '42', is_enabled: 1 },
        ]))
      const result = await repo.evaluateFlag('test', { ...baseContext, userId: '42' })
      expect(result).toBe(true)
    })

    it('respects role override for admin', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 0, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([
          { context_type: 'role', context_value: 'admin', is_enabled: 1 },
        ]))
      const result = await repo.evaluateFlag('test', { ...baseContext, isAdmin: true })
      expect(result).toBe(true)
    })

    it('returns false when rollout_percentage is 0 and no overrides match', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 0, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([]))
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(false)
    })
  })

  describe('listFlags', () => {
    it('returns all flags with their overrides', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(
          mockSelect([{ id: 1, name: 'enable-subscriptions', is_enabled: 1, rollout_percentage: 100, environment: 'production', description: null }])
        )
        .mockReturnValueOnce(mockSelect([]))
      const result = await repo.listFlags()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('enable-subscriptions')
      expect(result[0].overrides).toEqual([])
    })
  })
})
