import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const repo = new SubscriberRepository()

  try {
    const subscriber = await repo.getSubscriberById(
      session.user.subscriberId,
      {
        isAdmin: session.user.isAdmin,
        subscriberId: session.user.subscriberId,
      }
    )

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    return NextResponse.json(subscriber)
  } catch (error) {
    console.error('Error fetching subscriber profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
