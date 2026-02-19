import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function GET(
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

  const repo = new SubscriberRepository()

  try {
    const subscriber = await repo.getSubscriberById(subscriberId, {
      isAdmin: true,
      subscriberId: null,
    })

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    return NextResponse.json(subscriber)
  } catch (error) {
    console.error('Error fetching subscriber:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriber' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const body = await request.json()
    const { email, contact_name, business_name, phone, address, city, state, postal_code, status, notes } = body

    const repo = new SubscriberRepository()

    await repo.updateSubscriber(
      subscriberId,
      { email, contact_name, business_name, phone, address, city, state, postal_code, status, notes },
      { isAdmin: true }
    )

    const updated = await repo.getSubscriberById(subscriberId, {
      isAdmin: true,
      subscriberId: null,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating subscriber:', error)
    return NextResponse.json(
      { error: 'Failed to update subscriber' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

  const repo = new SubscriberRepository()

  try {
    await repo.deleteSubscriber(subscriberId, { isAdmin: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subscriber:', error)
    return NextResponse.json(
      { error: 'Failed to delete subscriber' },
      { status: 500 }
    )
  }
}
