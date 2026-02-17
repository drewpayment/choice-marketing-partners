import { BillingRepository } from '../BillingRepository'
import { db } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
  },
}))

describe('BillingRepository', () => {
  let repo: BillingRepository
  const adminUser = { isAdmin: true, subscriberId: null }
  const subscriberUser = { isAdmin: false, subscriberId: 1 }

  beforeEach(() => {
    repo = new BillingRepository()
    jest.clearAllMocks()
  })

  describe('getSubscriptionsBySubscriber', () => {
    it('throws for unauthorized users', async () => {
      await expect(
        repo.getSubscriptionsBySubscriber(2, subscriberUser)
      ).rejects.toThrow('Unauthorized')
    })

    it('allows subscriber to view own subscriptions', async () => {
      const mockQuery = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([
          { id: 1, status: 'active', product_name: 'Test Product' },
        ]),
      }

      ;(db.selectFrom as jest.Mock).mockReturnValue(mockQuery)

      const result = await repo.getSubscriptionsBySubscriber(1, subscriberUser)

      expect(result).toHaveLength(1)
    })
  })

  describe('createSubscription', () => {
    it('creates a subscription', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ insertId: 42n }),
      }

      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      const id = await repo.createSubscription({
        subscriber_id: 1,
        stripe_subscription_id: 'sub_test123',
        product_id: 1,
        price_id: 1,
        status: 'active',
      })

      expect(id).toBe(42)
    })
  })

  describe('getPaymentHistory', () => {
    it('throws for unauthorized users', async () => {
      await expect(
        repo.getPaymentHistory(2, subscriberUser)
      ).rejects.toThrow('Unauthorized')
    })

    it('allows admin to view any payment history', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        selectAll: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([
          { id: 1, amount_cents: 4999, status: 'paid' },
        ]),
      }

      ;(db.selectFrom as jest.Mock).mockReturnValue(mockQuery)

      const result = await repo.getPaymentHistory(1, adminUser)

      expect(result).toHaveLength(1)
    })
  })
})
