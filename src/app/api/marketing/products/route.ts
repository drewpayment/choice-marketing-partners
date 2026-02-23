import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ProductMarketingRepository } from '@/lib/repositories/ProductMarketingRepository'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
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

    const repo = new ProductMarketingRepository()
    const products = await repo.getMarketingProducts()

    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
