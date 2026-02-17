import { db } from '@/lib/database/client'

export interface ProductWithPrices {
  id: number
  stripe_product_id: string
  name: string
  description: string | null
  type: 'recurring' | 'one_time' | 'custom'
  is_active: number
  created_at: Date | null
  updated_at: Date | null
  prices: Array<{
    id: number
    stripe_price_id: string
    amount_cents: number
    currency: string
    interval: 'month' | 'quarter' | 'year' | 'one_time'
    interval_count: number
    is_active: number
  }>
}

export interface CreateProductData {
  stripe_product_id: string
  name: string
  description?: string
  type?: 'recurring' | 'one_time' | 'custom'
  is_active?: boolean
}

export interface CreatePriceData {
  product_id: number
  stripe_price_id: string
  amount_cents: number
  currency?: string
  interval?: 'month' | 'quarter' | 'year' | 'one_time'
  interval_count?: number
  is_active?: boolean
}

export interface UpdateProductData {
  name?: string
  description?: string
  is_active?: boolean
}

export class ProductRepository {
  async getAllProducts(
    currentUser: { isAdmin: boolean }
  ): Promise<ProductWithPrices[]> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can list products')
    }

    const products = await db
      .selectFrom('products')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute()

    const productsWithPrices: ProductWithPrices[] = []

    for (const product of products) {
      const prices = await db
        .selectFrom('prices')
        .where('product_id', '=', product.id)
        .select([
          'id',
          'stripe_price_id',
          'amount_cents',
          'currency',
          'interval',
          'interval_count',
          'is_active',
        ])
        .execute()

      productsWithPrices.push({
        ...product,
        prices,
      })
    }

    return productsWithPrices
  }

  async getActiveProducts(): Promise<ProductWithPrices[]> {
    const products = await db
      .selectFrom('products')
      .where('is_active', '=', 1)
      .selectAll()
      .orderBy('name', 'asc')
      .execute()

    const productsWithPrices: ProductWithPrices[] = []

    for (const product of products) {
      const prices = await db
        .selectFrom('prices')
        .where('product_id', '=', product.id)
        .where('is_active', '=', 1)
        .select([
          'id',
          'stripe_price_id',
          'amount_cents',
          'currency',
          'interval',
          'interval_count',
          'is_active',
        ])
        .execute()

      productsWithPrices.push({
        ...product,
        prices,
      })
    }

    return productsWithPrices
  }

  async getProductById(
    id: number,
    currentUser: { isAdmin: boolean }
  ): Promise<ProductWithPrices | null> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can view products')
    }

    const product = await db
      .selectFrom('products')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()

    if (!product) {
      return null
    }

    const prices = await db
      .selectFrom('prices')
      .where('product_id', '=', product.id)
      .select([
        'id',
        'stripe_price_id',
        'amount_cents',
        'currency',
        'interval',
        'interval_count',
        'is_active',
      ])
      .execute()

    return {
      ...product,
      prices,
    }
  }

  async getProductByStripeId(stripeProductId: string): Promise<ProductWithPrices | null> {
    const product = await db
      .selectFrom('products')
      .where('stripe_product_id', '=', stripeProductId)
      .selectAll()
      .executeTakeFirst()

    if (!product) {
      return null
    }

    const prices = await db
      .selectFrom('prices')
      .where('product_id', '=', product.id)
      .select([
        'id',
        'stripe_price_id',
        'amount_cents',
        'currency',
        'interval',
        'interval_count',
        'is_active',
      ])
      .execute()

    return {
      ...product,
      prices,
    }
  }

  async createProduct(data: CreateProductData): Promise<number> {
    const result = await db
      .insertInto('products')
      .values({
        stripe_product_id: data.stripe_product_id,
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? 'recurring',
        is_active: data.is_active ? 1 : 0,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }

  async updateProduct(
    id: number,
    data: UpdateProductData,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can update products')
    }

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date()

      await db
        .updateTable('products')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    }
  }

  async createPrice(data: CreatePriceData): Promise<number> {
    const result = await db
      .insertInto('prices')
      .values({
        product_id: data.product_id,
        stripe_price_id: data.stripe_price_id,
        amount_cents: data.amount_cents,
        currency: data.currency ?? 'usd',
        interval: data.interval ?? 'month',
        interval_count: data.interval_count ?? 1,
        is_active: data.is_active ? 1 : 0,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }

  async getPriceByStripeId(stripePriceId: string) {
    return db
      .selectFrom('prices')
      .where('stripe_price_id', '=', stripePriceId)
      .selectAll()
      .executeTakeFirst()
  }
}
