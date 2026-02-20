import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/StripeService'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { BillingRepository } from '@/lib/repositories/BillingRepository'
import { ProductRepository } from '@/lib/repositories/ProductRepository'
import { logger } from '@/lib/utils/logger'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const stripeService = new StripeService()
  const subscriberRepo = new SubscriberRepository()
  const billingRepo = new BillingRepository()
  const productRepo = new ProductRepository()

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      logger.error('Webhook: Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripeService.verifyWebhookSignature(body, signature)
    } catch (err) {
      logger.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    logger.info(`Webhook received: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        const subscriber = await subscriberRepo.getSubscriberByStripeCustomerId(
          subscription.customer as string
        )

        if (!subscriber) {
          logger.error(`Subscriber not found for customer: ${subscription.customer}`)
          return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
        }

        const stripePriceId = subscription.items.data[0]?.price.id
        if (!stripePriceId) {
          logger.error('No price found in subscription')
          return NextResponse.json({ error: 'No price found' }, { status: 400 })
        }

        const price = await productRepo.getPriceByStripeId(stripePriceId)
        if (!price) {
          logger.error(`Price not found: ${stripePriceId}`)
          return NextResponse.json({ error: 'Price not found' }, { status: 404 })
        }

        const existing = await billingRepo.getSubscriptionByStripeId(subscription.id)

        if (existing) {
          await billingRepo.updateSubscription(subscription.id, {
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
        } else {
          await billingRepo.createSubscription({
            subscriber_id: subscriber.id,
            stripe_subscription_id: subscription.id,
            product_id: price.product_id,
            price_id: price.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          })
        }

        await subscriberRepo.updateSubscriber(
          subscriber.id,
          { status: subscription.status === 'active' ? 'active' : 'past_due' },
          { isAdmin: true }
        )

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const subscriber = await subscriberRepo.getSubscriberByStripeCustomerId(
          subscription.customer as string
        )

        if (subscriber) {
          await subscriberRepo.updateSubscriber(
            subscriber.id,
            { status: 'canceled' },
            { isAdmin: true }
          )
        }

        await billingRepo.updateSubscription(subscription.id, {
          status: 'canceled',
        })

        break
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        const subscriber = await subscriberRepo.getSubscriberByStripeCustomerId(
          invoice.customer as string
        )

        if (!subscriber) {
          logger.error(`Subscriber not found for customer: ${invoice.customer}`)
          return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
        }

        const existing = await billingRepo.getPaymentByInvoiceId(invoice.id)

        if (existing) {
          await billingRepo.updatePaymentStatus(
            invoice.id,
            'paid',
            invoice.status_transitions.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000)
              : undefined
          )
        } else {
          await billingRepo.createPaymentRecord({
            subscriber_id: subscriber.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent as string | undefined,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            description: invoice.description ?? undefined,
            invoice_pdf_url: invoice.invoice_pdf ?? undefined,
            paid_at: invoice.status_transitions.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000)
              : undefined,
          })
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        const subscriber = await subscriberRepo.getSubscriberByStripeCustomerId(
          invoice.customer as string
        )

        if (!subscriber) {
          logger.error(`Subscriber not found for customer: ${invoice.customer}`)
          return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
        }

        const existing = await billingRepo.getPaymentByInvoiceId(invoice.id)

        if (existing) {
          await billingRepo.updatePaymentStatus(invoice.id, 'failed')
        } else {
          await billingRepo.createPaymentRecord({
            subscriber_id: subscriber.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent as string | undefined,
            amount_cents: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            description: invoice.description ?? undefined,
            invoice_pdf_url: invoice.invoice_pdf ?? undefined,
          })
        }

        await subscriberRepo.updateSubscriber(
          subscriber.id,
          { status: 'past_due' },
          { isAdmin: true }
        )

        break
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
