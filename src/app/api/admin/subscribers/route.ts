import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || undefined
  const status = (searchParams.get('status') as 'active' | 'past_due' | 'canceled' | 'paused' | 'all') || 'all'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')

  const repo = new SubscriberRepository()

  try {
    const result = await repo.getAllSubscribers(
      { search, status, page, limit },
      { isAdmin: true }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching subscribers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { email, business_name, phone, address, city, state, postal_code } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const stripeService = new StripeService()
    const repo = new SubscriberRepository()

    // Create Stripe customer
    const customer = await stripeService.createCustomer(email, business_name)

    // Create subscriber in database
    const subscriberId = await repo.createSubscriber({
      stripe_customer_id: customer.id,
      business_name,
      phone,
      address,
      city,
      state,
      postal_code,
    })

    const subscriber = await repo.getSubscriberById(subscriberId, {
      isAdmin: true,
      subscriberId: null,
    })

    return NextResponse.json(subscriber, { status: 201 })
  } catch (error) {
    console.error('Error creating subscriber:', error)
    return NextResponse.json(
      { error: 'Failed to create subscriber' },
      { status: 500 }
    )
  }
}
