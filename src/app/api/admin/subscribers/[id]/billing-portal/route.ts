import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
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

  const { id } = await params
  const subscriberId = parseInt(id)

  if (isNaN(subscriberId)) {
    return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 })
  }

  try {
    const repo = new SubscriberRepository()
    const subscriber = await repo.getSubscriberById(subscriberId, { isAdmin: true })

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/admin/billing/subscribers/${subscriberId}`

    const stripeService = new StripeService()
    const portalUrl = await stripeService.createBillingPortalSession(
      subscriber.stripe_customer_id,
      returnUrl
    )

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating billing portal session:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
