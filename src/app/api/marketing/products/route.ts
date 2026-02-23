import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ProductMarketingRepository } from '@/lib/repositories/ProductMarketingRepository'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const flagEnabled = await isFeatureEnabled('enable-subscriptions', session.user)
  if (!flagEnabled) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 })
  }

  const repo = new ProductMarketingRepository()
  const products = await repo.getMarketingProducts()

  return NextResponse.json(products)
}
