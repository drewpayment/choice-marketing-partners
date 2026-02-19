import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { BillingRepository } from '@/lib/repositories/BillingRepository'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function GET(request: NextRequest) {
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

  const repo = new BillingRepository()

  try {
    const subscriptions = await repo.getSubscriptionsBySubscriber(
      session.user.subscriberId,
      {
        isAdmin: session.user.isAdmin,
        subscriberId: session.user.subscriberId,
      }
    )

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
