import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ProductMarketingRepository } from '@/lib/repositories/ProductMarketingRepository'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const productId = parseInt(id, 10)

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
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
      session.user
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

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const productId = parseInt(id, 10)

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }

  try {
    const repo = new ProductMarketingRepository()
    await repo.deleteMarketingData(productId, session.user)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product marketing data:', error)
    return NextResponse.json(
      { error: 'Failed to delete product marketing data' },
      { status: 500 }
    )
  }
}
