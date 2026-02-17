import { db } from '@/lib/database/client'

export interface SubscriberSummary {
  id: number
  stripe_customer_id: string
  business_name: string | null
  phone: string | null
  status: 'active' | 'past_due' | 'canceled' | 'paused'
  created_at: Date | null
  updated_at: Date | null
}

export interface SubscriberDetail extends SubscriberSummary {
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  users: Array<{
    user_id: number
    email: string
    name: string
  }>
}

export interface CreateSubscriberData {
  stripe_customer_id: string
  business_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  status?: 'active' | 'past_due' | 'canceled' | 'paused'
  notes?: string
}

export interface UpdateSubscriberData {
  business_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  status?: 'active' | 'past_due' | 'canceled' | 'paused'
  notes?: string
}

export interface SubscriberFilters {
  search?: string
  status?: 'active' | 'past_due' | 'canceled' | 'paused' | 'all'
  page?: number
  limit?: number
}

export interface SubscriberPage {
  subscribers: SubscriberSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class SubscriberRepository {
  async getAllSubscribers(
    filters: SubscriberFilters = {},
    currentUser: { isAdmin: boolean }
  ): Promise<SubscriberPage> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can list all subscribers')
    }

    const { search, status = 'all', page = 1, limit = 25 } = filters
    const offset = (page - 1) * limit

    let query = db
      .selectFrom('subscribers')
      .where('subscribers.deleted_at', 'is', null)

    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('subscribers.business_name', 'like', `%${search}%`),
          eb('subscribers.phone', 'like', `%${search}%`),
          eb('subscribers.stripe_customer_id', 'like', `%${search}%`),
        ])
      )
    }

    if (status !== 'all') {
      query = query.where('subscribers.status', '=', status)
    }

    const [subscribers, countResult] = await Promise.all([
      query
        .select([
          'id',
          'stripe_customer_id',
          'business_name',
          'phone',
          'status',
          'created_at',
          'updated_at',
        ])
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      query
        .select(({ fn }) => [fn.count<number>('id').as('count')])
        .executeTakeFirst(),
    ])

    const total = Number(countResult?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    return {
      subscribers,
      total,
      page,
      limit,
      totalPages,
    }
  }

  async getSubscriberById(
    id: number,
    currentUser: { isAdmin: boolean; subscriberId?: number | null }
  ): Promise<SubscriberDetail | null> {
    if (!currentUser.isAdmin && currentUser.subscriberId !== id) {
      throw new Error('Unauthorized: Cannot access this subscriber')
    }

    const subscriber = await db
      .selectFrom('subscribers')
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .selectAll()
      .executeTakeFirst()

    if (!subscriber) {
      return null
    }

    const users = await db
      .selectFrom('subscriber_user')
      .innerJoin('users', 'subscriber_user.user_id', 'users.id')
      .where('subscriber_user.subscriber_id', '=', id)
      .select(['users.id as user_id', 'users.email', 'users.name'])
      .execute()

    return {
      ...subscriber,
      users,
    }
  }

  async getSubscriberByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<SubscriberSummary | null> {
    const result = await db
      .selectFrom('subscribers')
      .where('stripe_customer_id', '=', stripeCustomerId)
      .where('deleted_at', 'is', null)
      .select([
        'id',
        'stripe_customer_id',
        'business_name',
        'phone',
        'status',
        'created_at',
        'updated_at',
      ])
      .executeTakeFirst()

    return result ?? null
  }

  async createSubscriber(data: CreateSubscriberData): Promise<number> {
    const result = await db
      .insertInto('subscribers')
      .values({
        stripe_customer_id: data.stripe_customer_id,
        business_name: data.business_name ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        postal_code: data.postal_code ?? null,
        status: data.status ?? 'active',
        notes: data.notes ?? null,
      })
      .executeTakeFirst()

    return Number(result.insertId)
  }

  async updateSubscriber(
    id: number,
    data: UpdateSubscriberData,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can update subscribers')
    }

    await db
      .updateTable('subscribers')
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .execute()
  }

  async deleteSubscriber(
    id: number,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can delete subscribers')
    }

    await db
      .updateTable('subscribers')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .execute()
  }

  async linkUserToSubscriber(
    subscriberId: number,
    userId: number,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can link users')
    }

    await db
      .insertInto('subscriber_user')
      .values({
        subscriber_id: subscriberId,
        user_id: userId,
      })
      .execute()
  }

  async unlinkUserFromSubscriber(
    subscriberId: number,
    userId: number,
    currentUser: { isAdmin: boolean }
  ): Promise<void> {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Only admins can unlink users')
    }

    await db
      .deleteFrom('subscriber_user')
      .where('subscriber_id', '=', subscriberId)
      .where('user_id', '=', userId)
      .execute()
  }
}
