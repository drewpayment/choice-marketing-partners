import { db } from '@/lib/database/client'
import type { NotNull } from 'kysely'
import type { UserContext } from '@/lib/auth/types'

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
  /**
   * `stripe_subscription_id`/`stripe_invoice_id` are nullable in the *imported*
   * schema, but `createSubscription`/`createPaymentRecord` (the only insert
   * paths) always require a value, and post-import-fixups.sql §6c makes both
   * columns `NOT NULL` so the invariant is enforced by the database rather than
   * asserted by the compiler alone. Narrowed to `NotNull` below rather than
   * widening the public return type and rippling `| null` into every Stripe SDK
   * call site that consumes it. (Once kysely-codegen is re-run against a
   * fixed-up database these narrowings become redundant and can be deleted.)
   */
  async getSubscriptionsBySubscriber(
    subscriberId: number,
    userContext: UserContext
  ): Promise<SubscriptionDetail[]> {
    if (!userContext.isAdmin && userContext.subscriberId !== subscriberId) {
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
      .$narrowType<{ stripe_subscription_id: NotNull }>()
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
      .$narrowType<{ stripe_subscription_id: NotNull }>()
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
      .returning('id')
      .executeTakeFirstOrThrow()

    return Number(result.id)
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
    userContext: UserContext
  ): Promise<PaymentHistoryItem[]> {
    if (!userContext.isAdmin && userContext.subscriberId !== subscriberId) {
      throw new Error('Unauthorized: Cannot access payment history')
    }

    return db
      .selectFrom('payment_history')
      .where('subscriber_id', '=', subscriberId)
      .selectAll()
      .$narrowType<{ stripe_invoice_id: NotNull }>()
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
      .returning('id')
      .executeTakeFirstOrThrow()

    return Number(result.id)
  }

  async getPaymentByInvoiceId(invoiceId: string): Promise<PaymentHistoryItem | null> {
    const result = await db
      .selectFrom('payment_history')
      .where('stripe_invoice_id', '=', invoiceId)
      .selectAll()
      .$narrowType<{ stripe_invoice_id: NotNull }>()
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
