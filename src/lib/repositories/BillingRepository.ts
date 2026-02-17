import { db } from '@/lib/database/client'

export interface SubscriptionDetail {
  id: number
  subscriber_id: number
  stripe_subscription_id: string
  product_id: number
  price_id: number
  status: string
  current_period_start: Date | null
  current_period_end: Date | null
  cancel_at_period_end: number
  created_at: Date | null
  updated_at: Date | null
  product_name: string
  price_amount_cents: number
  price_interval: string
}

export interface PaymentHistoryItem {
  id: number
  subscriber_id: number
  stripe_invoice_id: string
  stripe_payment_intent_id: string | null
  amount_cents: number
  currency: string
  status: string
  description: string | null
  invoice_pdf_url: string | null
  paid_at: Date | null
  created_at: Date | null
}

export interface CreateSubscriptionData {
  subscriber_id: number
  stripe_subscription_id: string
  product_id: number
  price_id: number
  status: string
  current_period_start?: Date
  current_period_end?: Date
}

export interface UpdateSubscriptionData {
  status?: string
  current_period_start?: Date
  current_period_end?: Date
  cancel_at_period_end?: boolean
}

export interface CreatePaymentData {
  subscriber_id: number
  stripe_invoice_id: string
  stripe_payment_intent_id?: string
  amount_cents: number
  currency?: string
  status: string
  description?: string
  invoice_pdf_url?: string
  paid_at?: Date
}

export class BillingRepository {
  async getSubscriptionsBySubscriber(
    subscriberId: number,
    currentUser: { isAdmin: boolean; subscriberId?: number | null }
  ): Promise<SubscriptionDetail[]> {
    if (!currentUser.isAdmin && currentUser.subscriberId !== subscriberId) {
      throw new Error('Unauthorized: Cannot access these subscriptions')
    }

    return db
      .selectFrom('subscriber_subscriptions')
      .innerJoin('products', 'subscriber_subscriptions.product_id', 'products.id')
      .innerJoin('prices', 'subscriber_subscriptions.price_id', 'prices.id')
      .where('subscriber_subscriptions.subscriber_id', '=', subscriberId)
      .select([
        'subscriber_subscriptions.id',
        'subscriber_subscriptions.subscriber_id',
        'subscriber_subscriptions.stripe_subscription_id',
        'subscriber_subscriptions.product_id',
        'subscriber_subscriptions.price_id',
        'subscriber_subscriptions.status',
        'subscriber_subscriptions.current_period_start',
        'subscriber_subscriptions.current_period_end',
        'subscriber_subscriptions.cancel_at_period_end',
        'subscriber_subscriptions.created_at',
        'subscriber_subscriptions.updated_at',
        'products.name as product_name',
        'prices.amount_cents as price_amount_cents',
        'prices.interval as price_interval',
      ])
      .orderBy('subscriber_subscriptions.created_at', 'desc')
      .execute()
  }

  async getSubscriptionByStripeId(
    stripeSubscriptionId: string
  ): Promise<SubscriptionDetail | null> {
    const result = await db
      .selectFrom('subscriber_subscriptions')
      .innerJoin('products', 'subscriber_subscriptions.product_id', 'products.id')
      .innerJoin('prices', 'subscriber_subscriptions.price_id', 'prices.id')
      .where('subscriber_subscriptions.stripe_subscription_id', '=', stripeSubscriptionId)
      .select([
        'subscriber_subscriptions.id',
        'subscriber_subscriptions.subscriber_id',
        'subscriber_subscriptions.stripe_subscription_id',
        'subscriber_subscriptions.product_id',
        'subscriber_subscriptions.price_id',
        'subscriber_subscriptions.status',
        'subscriber_subscriptions.current_period_start',
        'subscriber_subscriptions.current_period_end',
        'subscriber_subscriptions.cancel_at_period_end',
        'subscriber_subscriptions.created_at',
        'subscriber_subscriptions.updated_at',
        'products.name as product_name',
        'prices.amount_cents as price_amount_cents',
        'prices.interval as price_interval',
      ])
      .executeTakeFirst()

    return result ?? null
  }

  async createSubscription(data: CreateSubscriptionData): Promise<number> {
    const result = await db
      .insertInto('subscriber_subscriptions')
      .values({
        subscriber_id: data.subscriber_id,
        stripe_subscription_id: data.stripe_subscription_id,
        product_id: data.product_id,
        price_id: data.price_id,
        status: data.status,
        current_period_start: data.current_period_start ?? null,
        current_period_end: data.current_period_end ?? null,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }

  async updateSubscription(
    stripeSubscriptionId: string,
    data: UpdateSubscriptionData
  ): Promise<void> {
    const updateData: Record<string, unknown> = {}

    if (data.status !== undefined) updateData.status = data.status
    if (data.current_period_start !== undefined)
      updateData.current_period_start = data.current_period_start
    if (data.current_period_end !== undefined)
      updateData.current_period_end = data.current_period_end
    if (data.cancel_at_period_end !== undefined)
      updateData.cancel_at_period_end = data.cancel_at_period_end ? 1 : 0

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date()

      await db
        .updateTable('subscriber_subscriptions')
        .set(updateData)
        .where('stripe_subscription_id', '=', stripeSubscriptionId)
        .execute()
    }
  }

  async getPaymentHistory(
    subscriberId: number,
    currentUser: { isAdmin: boolean; subscriberId?: number | null }
  ): Promise<PaymentHistoryItem[]> {
    if (!currentUser.isAdmin && currentUser.subscriberId !== subscriberId) {
      throw new Error('Unauthorized: Cannot access payment history')
    }

    return db
      .selectFrom('payment_history')
      .where('subscriber_id', '=', subscriberId)
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute()
  }

  async createPaymentRecord(data: CreatePaymentData): Promise<number> {
    const result = await db
      .insertInto('payment_history')
      .values({
        subscriber_id: data.subscriber_id,
        stripe_invoice_id: data.stripe_invoice_id,
        stripe_payment_intent_id: data.stripe_payment_intent_id ?? null,
        amount_cents: data.amount_cents,
        currency: data.currency ?? 'usd',
        status: data.status,
        description: data.description ?? null,
        invoice_pdf_url: data.invoice_pdf_url ?? null,
        paid_at: data.paid_at ?? null,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }

  async getPaymentByInvoiceId(invoiceId: string): Promise<PaymentHistoryItem | null> {
    const result = await db
      .selectFrom('payment_history')
      .where('stripe_invoice_id', '=', invoiceId)
      .selectAll()
      .executeTakeFirst()

    return result ?? null
  }

  async updatePaymentStatus(
    invoiceId: string,
    status: string,
    paidAt?: Date
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status }

    if (paidAt !== undefined) {
      updateData.paid_at = paidAt
    }

    await db
      .updateTable('payment_history')
      .set(updateData)
      .where('stripe_invoice_id', '=', invoiceId)
      .execute()
  }
}
