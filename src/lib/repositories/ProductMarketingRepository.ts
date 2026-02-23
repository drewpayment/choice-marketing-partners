import { db } from '@/lib/database/client'

export interface MarketingProduct {
  // product fields
  product_id: number
  product_name: string
  product_description: string | null
  product_type: 'recurring' | 'one_time' | 'custom'
  // price fields
  price_id: number
  stripe_price_id: string
  amount_cents: number
  currency: string
  interval: 'month' | 'quarter' | 'year' | 'one_time'
  interval_count: number
  // marketing fields
  category: 'tier' | 'addon'
  tagline: string | null
  feature_list: string[]
  display_order: number
  is_featured: boolean
  icon_name: string | null
  badge_text: string | null
}

export interface UpsertMarketingData {
  product_id: number
  category?: 'tier' | 'addon'
  tagline?: string
  feature_list?: string[]
  display_order?: number
  is_featured?: boolean
  icon_name?: string
  badge_text?: string
}

export class ProductMarketingRepository {
  /**
   * Get all active products that have marketing metadata, joined with
   * their active price and marketing data. Sorted by display_order.
   * This is the public query — no auth required (data is non-sensitive).
   */
  async getMarketingProducts(): Promise<MarketingProduct[]> {
    const rows = await db
      .selectFrom('product_marketing as pm')
      .innerJoin('products as p', 'p.id', 'pm.product_id')
      .innerJoin('prices as pr', (join) =>
        join
          .onRef('pr.product_id', '=', 'p.id')
          .on('pr.is_active', '=', 1)
      )
      .where('p.is_active', '=', 1)
      .select([
        'pm.product_id',
        'p.name as product_name',
        'p.description as product_description',
        'p.type as product_type',
        'pr.id as price_id',
        'pr.stripe_price_id',
        'pr.amount_cents',
        'pr.currency',
        'pr.interval',
        'pr.interval_count',
        'pm.category',
        'pm.tagline',
        'pm.feature_list',
        'pm.display_order',
        'pm.is_featured',
        'pm.icon_name',
        'pm.badge_text',
      ])
      .orderBy('pm.display_order', 'asc')
      .execute()

    return rows.map((row) => ({
      ...row,
      feature_list: typeof row.feature_list === 'string'
        ? JSON.parse(row.feature_list)
        : (row.feature_list as string[]) ?? [],
      is_featured: !!row.is_featured,
    }))
  }

  /**
   * Get marketing products filtered by category (tier or addon).
   */
  async getMarketingProductsByCategory(
    category: 'tier' | 'addon'
  ): Promise<MarketingProduct[]> {
    const all = await this.getMarketingProducts()
    return all.filter((p) => p.category === category)
  }

  /**
   * Admin: upsert marketing metadata for a product.
   */
  async upsertMarketingData(
    data: UpsertMarketingData,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can manage marketing data')
    }

    const values = {
      product_id: data.product_id,
      category: data.category ?? 'tier',
      tagline: data.tagline ?? null,
      feature_list: data.feature_list ? JSON.stringify(data.feature_list) : null,
      display_order: data.display_order ?? 0,
      is_featured: data.is_featured ? 1 : 0,
      icon_name: data.icon_name ?? null,
      badge_text: data.badge_text ?? null,
    }

    // MySQL upsert via INSERT ... ON DUPLICATE KEY UPDATE
    await db
      .insertInto('product_marketing')
      .values(values)
      .onDuplicateKeyUpdate({
        category: values.category,
        tagline: values.tagline,
        feature_list: values.feature_list,
        display_order: values.display_order,
        is_featured: values.is_featured,
        icon_name: values.icon_name,
        badge_text: values.badge_text,
      })
      .execute()
  }

  /**
   * Admin: remove marketing metadata for a product.
   */
  async deleteMarketingData(
    productId: number,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can manage marketing data')
    }

    await db
      .deleteFrom('product_marketing')
      .where('product_id', '=', productId)
      .execute()
  }
}
