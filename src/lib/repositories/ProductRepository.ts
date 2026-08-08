import { db } from '@/lib/database/client'
import type { NotNull } from 'kysely'

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
  /**
   * `products.type` and `prices.interval` are `text` columns under Postgres
   * (they were MySQL ENUMs pre-migration and lost their string-literal union
   * in codegen — see docs/postgres-migration-plan.md §2.2). The value domain is
   * enforced by the DB: `chk_products_type_enum` and `chk_prices_interval_enum`
   * (post-import-fixups.sql §6b), which restore exactly the source ENUM value
   * sets. `$narrowType` below only tells the compiler what the constraint
   * already guarantees.
   *
   * `stripe_price_id`/`stripe_product_id` are nullable in the *imported*
   * schema, but `createProduct`/`createPrice` (the only insert paths) always
   * require a value, and post-import-fixups.sql §6c makes both columns
   * `NOT NULL`. Narrowed to `NotNull` here rather than widening the public
   * return type and rippling `| null` into every Stripe SDK call site.
   * (Once kysely-codegen is re-run against a fixed-up database these `NotNull`
   * narrowings become redundant and can be deleted.)
   */
  private async getPricesForProduct(
    productId: number,
    activeOnly: boolean
  ): Promise<ProductWithPrices['prices']> {
    let query = db
      .selectFrom('prices')
      .where('product_id', '=', productId)

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    return query
      .select([
        'id',
        'stripe_price_id',
        'amount_cents',
        'currency',
        'interval',
        'interval_count',
        'is_active',
      ])
      .$narrowType<{
        stripe_price_id: NotNull
        interval: ProductWithPrices['prices'][number]['interval']
      }>()
      .execute()
  }

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
      .$narrowType<{ type: ProductWithPrices['type']; stripe_product_id: NotNull }>()
      .execute()

    const productsWithPrices: ProductWithPrices[] = []

    for (const product of products) {
      const prices = await this.getPricesForProduct(product.id, false)

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
      .$narrowType<{ type: ProductWithPrices['type']; stripe_product_id: NotNull }>()
      .execute()

    const productsWithPrices: ProductWithPrices[] = []

    for (const product of products) {
      const prices = await this.getPricesForProduct(product.id, true)

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
      .$narrowType<{ type: ProductWithPrices['type']; stripe_product_id: NotNull }>()
      .executeTakeFirst()

    if (!product) {
      return null
    }

    const prices = await this.getPricesForProduct(product.id, false)

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
      .$narrowType<{ type: ProductWithPrices['type']; stripe_product_id: NotNull }>()
      .executeTakeFirst()

    if (!product) {
      return null
    }

    const prices = await this.getPricesForProduct(product.id, false)

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
      .returning('id')
      .executeTakeFirstOrThrow()

    return Number(result.id)
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
      .returning('id')
      .executeTakeFirstOrThrow()

    return Number(result.id)
  }

  async getPriceByStripeId(stripePriceId: string) {
    return db
      .selectFrom('prices')
      .where('stripe_price_id', '=', stripePriceId)
      .selectAll()
      .executeTakeFirst()
  }
}
