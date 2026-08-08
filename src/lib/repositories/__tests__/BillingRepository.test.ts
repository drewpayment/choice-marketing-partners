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
  const adminUser = { isAdmin: true, isManager: false }
  const subscriberUser = { isAdmin: false, isManager: false, subscriberId: 1 }

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
        $narrowType: jest.fn().mockReturnThis(),
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
    it('creates a subscription, returning the real PK column and the bound values', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ id: 42 }),
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
      // The mock resolves `{ id: 42 }` regardless of the requested column, so
      // pin the column name and the bound payload explicitly.
      expect(db.insertInto).toHaveBeenCalledWith('subscriber_subscriptions')
      expect(mockQuery.returning).toHaveBeenCalledWith('id')
      expect(mockQuery.values).toHaveBeenCalledWith({
        subscriber_id: 1,
        stripe_subscription_id: 'sub_test123',
        product_id: 1,
        price_id: 1,
        status: 'active',
        current_period_start: null,
        current_period_end: null,
      })
    })
  })

  describe('createPaymentRecord', () => {
    it('creates a payment record, returning the real PK column and the bound values', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ id: 9 }),
      }

      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      const id = await repo.createPaymentRecord({
        subscriber_id: 1,
        stripe_invoice_id: 'in_test123',
        amount_cents: 4999,
        status: 'paid',
      })

      expect(id).toBe(9)
      expect(db.insertInto).toHaveBeenCalledWith('payment_history')
      expect(mockQuery.returning).toHaveBeenCalledWith('id')
      expect(mockQuery.values).toHaveBeenCalledWith({
        subscriber_id: 1,
        stripe_invoice_id: 'in_test123',
        stripe_payment_intent_id: null,
        amount_cents: 4999,
        currency: 'usd',
        status: 'paid',
        description: null,
        invoice_pdf_url: null,
        paid_at: null,
      })
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
        $narrowType: jest.fn().mockReturnThis(),
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
