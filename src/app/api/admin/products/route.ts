import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ProductRepository } from '@/lib/repositories/ProductRepository'
import { StripeService } from '@/lib/services/StripeService'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function GET(request: NextRequest) {
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

  const repo = new ProductRepository()

  try {
    const products = await repo.getAllProducts({ isAdmin: true })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json()
    const { name, description, type, amount_cents, interval, interval_count } = body

    if (!name || !amount_cents) {
      return NextResponse.json(
        { error: 'Name and amount are required' },
        { status: 400 }
      )
    }

    const stripeService = new StripeService()
    const repo = new ProductRepository()

    // Create product in Stripe
    const stripeProduct = await stripeService.createProduct(name, description)

    // Create product in database
    const productId = await repo.createProduct({
      stripe_product_id: stripeProduct.id,
      name,
      description,
      type: type || 'recurring',
      is_active: true,
    })

    // Create price in Stripe
    const stripePrice = await stripeService.createPrice(
      stripeProduct.id,
      amount_cents,
      interval || 'month',
      interval_count || 1
    )

    // Create price in database
    await repo.createPrice({
      product_id: productId,
      stripe_price_id: stripePrice.id,
      amount_cents,
      currency: 'usd',
      interval: interval || 'month',
      interval_count: interval_count || 1,
      is_active: true,
    })

    const product = await repo.getProductById(productId, { isAdmin: true })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
