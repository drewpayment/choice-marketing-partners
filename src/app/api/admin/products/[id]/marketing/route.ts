import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ProductMarketingRepository } from '@/lib/repositories/ProductMarketingRepository'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAdminAndFlag(session: any) {
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const flagEnabled = await isFeatureEnabled('enable-subscriptions', {
    userId: session.user.id,
    isAdmin: session.user.isAdmin,
    isManager: session.user.isManager ?? false,
    isSubscriber: !!(session.user.subscriberId),
    subscriberId: session.user.subscriberId ?? null,
  })
  if (!flagEnabled) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 })
  }
  return null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const authError = await checkAdminAndFlag(session)
  if (authError) return authError

  const { id } = await params
  const productId = parseInt(id, 10)

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }

  try {
    const body = await request.json()

    if (body.category !== undefined && body.category !== 'tier' && body.category !== 'addon') {
      return NextResponse.json({ error: 'category must be "tier" or "addon"' }, { status: 400 })
    }
    if (body.feature_list !== undefined && !Array.isArray(body.feature_list)) {
      return NextResponse.json({ error: 'feature_list must be an array' }, { status: 400 })
    }
    if (body.display_order !== undefined && typeof body.display_order !== 'number') {
      return NextResponse.json({ error: 'display_order must be a number' }, { status: 400 })
    }

    const repo = new ProductMarketingRepository()

    await repo.upsertMarketingData(
      {
        product_id: productId,
        category: body.category,
        tagline: body.tagline,
        feature_list: body.feature_list,
        display_order: body.display_order,
        is_featured: body.is_featured,
        icon_name: body.icon_name,
        badge_text: body.badge_text,
      },
      session!.user
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error upserting product marketing data:', error)
    return NextResponse.json(
      { error: 'Failed to update product marketing data' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const authError = await checkAdminAndFlag(session)
  if (authError) return authError

  const { id } = await params
  const productId = parseInt(id, 10)

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }

  try {
    const repo = new ProductMarketingRepository()
    await repo.deleteMarketingData(productId, session!.user)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product marketing data:', error)
    return NextResponse.json(
      { error: 'Failed to delete product marketing data' },
      { status: 500 }
    )
  }
}
