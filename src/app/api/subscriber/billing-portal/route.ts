import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await isFeatureEnabled('enable-subscriptions', {
    userId: session.user.id,
    isAdmin: session.user.isAdmin,
    isManager: session.user.isManager ?? false,
    isSubscriber: !!(session.user.subscriberId),
    subscriberId: session.user.subscriberId ?? null,
  })) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 })
  }

  try {
    const repo = new SubscriberRepository()
    const subscriber = await repo.getSubscriberById(session.user.subscriberId, {
      isAdmin: false,
      subscriberId: session.user.subscriberId,
    })

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/subscriber`

    const stripeService = new StripeService()
    const portalUrl = await stripeService.createBillingPortalSession(
      subscriber.stripe_customer_id,
      returnUrl
    )

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
