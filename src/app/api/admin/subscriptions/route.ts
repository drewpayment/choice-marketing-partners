import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { BillingRepository } from '@/lib/repositories/BillingRepository'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { subscriber_id, price_id } = body

    if (!subscriber_id || !price_id) {
      return NextResponse.json(
        { error: 'Subscriber ID and Price ID are required' },
        { status: 400 }
      )
    }

    const subscriberRepo = new SubscriberRepository()
    const billingRepo = new BillingRepository()
    const stripeService = new StripeService()

    const subscriber = await subscriberRepo.getSubscriberById(subscriber_id, {
      isAdmin: true,
      subscriberId: null,
    })

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      )
    }

    // Get price from database
    const productRepo = await import('@/lib/repositories/ProductRepository')
    const repo = new productRepo.ProductRepository()
    const prices = await repo.getAllProducts({ isAdmin: true })
    const price = prices
      .flatMap((p) => p.prices)
      .find((p) => p.id === price_id)

    if (!price) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    // Create subscription in Stripe
    const stripeSubscription = await stripeService.createSubscription(
      subscriber.stripe_customer_id,
      price.stripe_price_id
    )

    // Webhook will handle database creation, but we'll create it here too
    await billingRepo.createSubscription({
      subscriber_id,
      stripe_subscription_id: stripeSubscription.id,
      product_id: price.id,
      price_id: price.id,
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
    })

    const subscriptions = await billingRepo.getSubscriptionsBySubscriber(
      subscriber_id,
      { isAdmin: true, subscriberId: null }
    )

    return NextResponse.json(subscriptions, { status: 201 })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
