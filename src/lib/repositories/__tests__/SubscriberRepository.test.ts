import { SubscriberRepository } from '../SubscriberRepository'
import { db } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    deleteFrom: jest.fn(),
  },
}))

describe('SubscriberRepository', () => {
  let repo: SubscriberRepository
  const adminUser = { isAdmin: true, subscriberId: null }
  const subscriberUser = { isAdmin: false, subscriberId: 1 }

  beforeEach(() => {
    repo = new SubscriberRepository()
    jest.clearAllMocks()
  })

  describe('getAllSubscribers', () => {
    it('throws for non-admin users', async () => {
      await expect(
        repo.getAllSubscribers({}, subscriberUser)
      ).rejects.toThrow('Unauthorized')
    })

    it('returns paginated subscribers for admin', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([
          { id: 1, business_name: 'Test Co', status: 'active' },
        ]),
        executeTakeFirst: jest.fn().mockResolvedValue({ count: 1 }),
      }

      ;(db.selectFrom as jest.Mock).mockReturnValue(mockQuery)

      const result = await repo.getAllSubscribers({}, adminUser)

      expect(result.total).toBe(1)
      expect(result.subscribers).toHaveLength(1)
    })
  })

  describe('getSubscriberById', () => {
    it('allows admin to view any subscriber', async () => {
      const mockSubscriberQuery = {
        where: jest.fn().mockReturnThis(),
        selectAll: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({
          id: 1,
          business_name: 'Test Co',
        }),
      }

      const mockUsersQuery = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([]),
      }

      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSubscriberQuery)
        .mockReturnValueOnce(mockUsersQuery)

      const result = await repo.getSubscriberById(1, adminUser)

      expect(result).toBeDefined()
      expect(result?.business_name).toBe('Test Co')
    })

    it('throws when subscriber user accesses different subscriber', async () => {
      await expect(
        repo.getSubscriberById(2, subscriberUser)
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('createSubscriber', () => {
    it('creates a subscriber', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ insertId: 42n }),
      }

      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      const id = await repo.createSubscriber({
        stripe_customer_id: 'cus_test123',
        business_name: 'Test Co',
      })

      expect(id).toBe(42)
    })
  })

  describe('updateSubscriber', () => {
    it('throws for non-admin users', async () => {
      await expect(
        repo.updateSubscriber(1, { business_name: 'New Name' }, subscriberUser)
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('deleteSubscriber', () => {
    it('throws for non-admin users', async () => {
      await expect(
        repo.deleteSubscriber(1, subscriberUser)
      ).rejects.toThrow('Unauthorized')
    })
  })
})
