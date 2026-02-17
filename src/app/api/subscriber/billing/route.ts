import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { BillingRepository } from '@/lib/repositories/BillingRepository'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
