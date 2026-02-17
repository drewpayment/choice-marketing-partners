# Stripe Billing Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Stripe-powered subscription billing with admin management and subscriber portal.

**Architecture:** Stripe as source of truth. Local MySQL tables cache billing state via webhooks. Admin creates subscribers/products/subscriptions through the app, which syncs to Stripe. Subscribers view their billing, profile, and documents through a read-only portal. Payment methods collected via Stripe-hosted setup links.

**Tech Stack:** Stripe SDK (`stripe`), Next.js 16 App Router, Kysely ORM, NextAuth.js, shadcn/ui, Zod validation, React Hook Form.

---

## Task 1: Install Stripe SDK and Add Environment Variables

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

**Step 1: Install stripe package**

Run: `bun add stripe`

**Step 2: Add env vars to .env.example**

Add to `.env.example`:
```bash
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

**Step 3: Commit**

```bash
git add package.json bun.lockb .env.example
git commit -m "chore: add stripe SDK and env config"
```

---

## Task 2: Create Database Migration SQL and Update Types

**Files:**
- Create: `src/lib/database/migrations/001_billing_tables.sql`
- Modify: `src/lib/database/types.ts` (after running kysely-codegen)

**Step 1: Write the migration SQL**

Create `src/lib/database/migrations/001_billing_tables.sql`:

```sql
-- Subscribers table
CREATE TABLE subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_customer_id VARCHAR(255) UNIQUE,
  business_name VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  postal_code VARCHAR(20) NULL,
  status ENUM('active', 'past_due', 'canceled', 'paused') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriber-User junction
CREATE TABLE subscriber_user (
  subscriber_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (subscriber_id, user_id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products catalog
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_product_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('recurring', 'one_time', 'custom') NOT NULL DEFAULT 'recurring',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Prices linked to products
CREATE TABLE prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE,
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  `interval` ENUM('month', 'quarter', 'year', 'one_time') NOT NULL DEFAULT 'month',
  interval_count INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriber subscriptions (cache of Stripe)
CREATE TABLE subscriber_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriber_id INT NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  product_id INT NOT NULL,
  price_id INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (price_id) REFERENCES prices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment history (append-only, webhook-populated)
CREATE TABLE payment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriber_id INT NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255) NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  invoice_pdf_url TEXT NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Step 2: Run migration against local database**

Run: `mysql -u choice_user -p choice_marketing < src/lib/database/migrations/001_billing_tables.sql`

(Adjust credentials to match local `.env.local` DATABASE_URL.)

**Step 3: Regenerate Kysely types**

Run: `bun run kysely-codegen`

This updates `src/lib/database/types.ts` with the new table interfaces.

**Step 4: Verify types generated**

Run: `bun run build` (should compile without errors)

**Step 5: Commit**

```bash
git add src/lib/database/migrations/ src/lib/database/types.ts
git commit -m "feat: add billing database tables and regenerate types"
```

---

## Task 3: Create StripeService Wrapper

**Files:**
- Create: `src/lib/services/StripeService.ts`
- Create: `src/lib/services/__tests__/StripeService.test.ts`

**Step 1: Write the failing test**

Create `src/lib/services/__tests__/StripeService.test.ts`:

```typescript
import { StripeService } from '../StripeService'

// Mock stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    products: {
      create: jest.fn().mockResolvedValue({ id: 'prod_test123' }),
      update: jest.fn().mockResolvedValue({ id: 'prod_test123', active: false }),
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_test123' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      cancel: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' }),
    },
    invoiceItems: {
      create: jest.fn().mockResolvedValue({ id: 'ii_test123' }),
    },
    invoices: {
      create: jest.fn().mockResolvedValue({ id: 'in_test123' }),
      pay: jest.fn().mockResolvedValue({ id: 'in_test123', status: 'paid' }),
    },
    setupIntents: {
      create: jest.fn().mockResolvedValue({ id: 'seti_test123', url: 'https://stripe.com/setup' }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }))
})

describe('StripeService', () => {
  let service: StripeService

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    service = new StripeService()
  })

  it('creates a customer', async () => {
    const result = await service.createCustomer('test@example.com', 'Test Business')
    expect(result.id).toBe('cus_test123')
  })

  it('creates a product', async () => {
    const result = await service.createProduct('Test Product', 'A description')
    expect(result.id).toBe('prod_test123')
  })

  it('creates a recurring price', async () => {
    const result = await service.createPrice('prod_test123', 4999, 'month', 1)
    expect(result.id).toBe('price_test123')
  })

  it('creates a subscription', async () => {
    const result = await service.createSubscription('cus_test123', 'price_test123')
    expect(result.id).toBe('sub_test123')
  })

  it('cancels a subscription', async () => {
    const result = await service.cancelSubscription('sub_test123')
    expect(result.status).toBe('canceled')
  })

  it('creates a one-time invoice', async () => {
    const result = await service.createOneTimeCharge('cus_test123', 15000, 'Implementation fee')
    expect(result.id).toBe('in_test123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/services/__tests__/StripeService.test.ts`

Expected: FAIL — `Cannot find module '../StripeService'`

**Step 3: Write the implementation**

Create `src/lib/services/StripeService.ts`:

```typescript
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'

export class StripeService {
  private stripe: Stripe

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    this.stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia' })
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name: name || undefined,
    })
  }

  async createProduct(name: string, description?: string): Promise<Stripe.Product> {
    return this.stripe.products.create({
      name,
      description: description || undefined,
    })
  }

  async deactivateProduct(stripeProductId: string): Promise<Stripe.Product> {
    return this.stripe.products.update(stripeProductId, { active: false })
  }

  async createPrice(
    stripeProductId: string,
    amountCents: number,
    interval: 'month' | 'quarter' | 'year' | 'one_time',
    intervalCount: number = 1
  ): Promise<Stripe.Price> {
    if (interval === 'one_time') {
      return this.stripe.prices.create({
        product: stripeProductId,
        unit_amount: amountCents,
        currency: 'usd',
      })
    }

    // Stripe only supports day/week/month/year — map quarter to 3 months
    let stripeInterval: 'month' | 'year' = 'month'
    let stripeIntervalCount = intervalCount
    if (interval === 'quarter') {
      stripeInterval = 'month'
      stripeIntervalCount = 3 * intervalCount
    } else if (interval === 'year') {
      stripeInterval = 'year'
    } else {
      stripeInterval = 'month'
    }

    return this.stripe.prices.create({
      product: stripeProductId,
      unit_amount: amountCents,
      currency: 'usd',
      recurring: {
        interval: stripeInterval,
        interval_count: stripeIntervalCount,
      },
    })
  }

  async createSubscription(
    stripeCustomerId: string,
    stripePriceId: string
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: stripePriceId }],
      payment_behavior: 'default_incomplete',
    })
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(stripeSubscriptionId)
  }

  async createOneTimeCharge(
    stripeCustomerId: string,
    amountCents: number,
    description: string
  ): Promise<Stripe.Invoice> {
    await this.stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: amountCents,
      currency: 'usd',
      description,
    })

    const invoice = await this.stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true,
    })

    return this.stripe.invoices.pay(invoice.id)
  }

  async createSetupLink(stripeCustomerId: string): Promise<string> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
    })
    // Return the client secret — the frontend will redirect to Stripe's hosted page
    return setupIntent.client_secret!
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')
    }
    return this.stripe.webhooks.constructEvent(payload, signature, secret)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/services/__tests__/StripeService.test.ts`

Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/lib/services/
git commit -m "feat: add StripeService wrapper with tests"
```

---

## Task 4: Extend Auth System for Subscriber Role

**Files:**
- Modify: `src/types/auth.d.ts`
- Modify: `src/lib/auth/config.ts` (authorize + callbacks)
- Modify: `src/lib/auth/utils.ts` (add requireSubscriber)
- Modify: `src/lib/auth/access-control.ts` (add SUBSCRIBER routes)

**Step 1: Update type declarations**

In `src/types/auth.d.ts`, add `isSubscriber` and `subscriberId` to all three interfaces:

```typescript
import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      isManager: boolean
      isActive: boolean
      isSubscriber: boolean
      employeeId?: number
      subscriberId?: number | null
      salesIds: string[]
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
    isSubscriber: boolean
    employeeId?: number
    subscriberId?: number | null
    salesIds: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
    isSubscriber: boolean
    employeeId?: number
    subscriberId?: number | null
    salesIds: string[]
  }
}
```

**Step 2: Update auth config to query subscriber data**

In `src/lib/auth/config.ts`, after the employee query in `authorize()`, add a subscriber lookup:

```typescript
// After the existing employee query, add:
const subscriberLink = await db
  .selectFrom('subscriber_user')
  .innerJoin('subscribers', 'subscriber_user.subscriber_id', 'subscribers.id')
  .select(['subscribers.id as subscriber_id'])
  .where('subscriber_user.user_id', '=', user.id)
  .where('subscribers.deleted_at', 'is', null)
  .executeTakeFirst()
```

Update the return object to include:
```typescript
return {
  // ...existing fields...
  isSubscriber: !!subscriberLink,
  subscriberId: subscriberLink?.subscriber_id ?? null,
}
```

Update `jwt` callback to pass through:
```typescript
token.isSubscriber = user.isSubscriber
token.subscriberId = user.subscriberId
```

Update `session` callback to pass through:
```typescript
session.user = {
  ...session.user,
  // ...existing fields...
  isSubscriber: token.isSubscriber as boolean,
  subscriberId: token.subscriberId as number | null,
}
```

**Step 3: Add requireSubscriber to auth utils**

In `src/lib/auth/utils.ts`, add:

```typescript
// Require subscriber role
export async function requireSubscriber() {
  const session = await requireAuth()
  if (!session.user.isSubscriber) {
    redirect('/unauthorized')
  }
  return session
}

export function isSubscriber(session: Session | null): boolean {
  return session?.user?.isSubscriber === true
}
```

**Step 4: Add subscriber routes to access control**

In `src/lib/auth/access-control.ts`, add to ROUTE_ACCESS:

```typescript
// Subscriber level
SUBSCRIBER: [
  '/subscriber',
  '/api/subscriber'
],
```

Update `hasRouteAccess()` to check subscriber routes:

```typescript
// Check subscriber routes (after admin, before employee)
if (ROUTE_ACCESS.SUBSCRIBER.some(route => pathname.startsWith(route))) {
  return isSubscriber || isAdmin  // Admin can also access subscriber routes
}
```

Note: `hasRouteAccess` will need a new `isSubscriber` parameter.

**Step 5: Run build to verify types compile**

Run: `bun run build`

Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/types/auth.d.ts src/lib/auth/config.ts src/lib/auth/utils.ts src/lib/auth/access-control.ts
git commit -m "feat: extend auth system with subscriber role"
```

---

## Task 5: Create SubscriberRepository

**Files:**
- Create: `src/lib/repositories/SubscriberRepository.ts`
- Create: `src/lib/repositories/__tests__/SubscriberRepository.test.ts`

**Step 1: Write the failing test**

Create `src/lib/repositories/__tests__/SubscriberRepository.test.ts`:

```typescript
import { SubscriberRepository } from '../SubscriberRepository'

// Mock the database client
jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  }
}))

describe('SubscriberRepository', () => {
  let repo: SubscriberRepository

  beforeEach(() => {
    repo = new SubscriberRepository()
  })

  it('instantiates without error', () => {
    expect(repo).toBeInstanceOf(SubscriberRepository)
  })

  it('has getSubscribers method', () => {
    expect(typeof repo.getSubscribers).toBe('function')
  })

  it('has getSubscriberById method', () => {
    expect(typeof repo.getSubscriberById).toBe('function')
  })

  it('has createSubscriber method', () => {
    expect(typeof repo.createSubscriber).toBe('function')
  })

  it('has updateSubscriber method', () => {
    expect(typeof repo.updateSubscriber).toBe('function')
  })

  it('has linkUserToSubscriber method', () => {
    expect(typeof repo.linkUserToSubscriber).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/SubscriberRepository.test.ts`

Expected: FAIL — `Cannot find module '../SubscriberRepository'`

**Step 3: Write the implementation**

Create `src/lib/repositories/SubscriberRepository.ts`:

```typescript
import { db } from '@/lib/database/client'
import { logger } from '@/lib/utils/logger'

export interface SubscriberSummary {
  id: number
  stripe_customer_id: string | null
  business_name: string | null
  phone: string | null
  status: string
  created_at: Date | null
  user_email: string | null
  user_name: string | null
}

export interface SubscriberDetail extends SubscriberSummary {
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  updated_at: Date | null
}

export interface CreateSubscriberData {
  stripe_customer_id: string
  business_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  notes?: string
}

export interface UpdateSubscriberData {
  business_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  notes?: string
  status?: 'active' | 'past_due' | 'canceled' | 'paused'
}

export interface SubscriberFilters {
  search?: string
  status?: string
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
  async getSubscribers(filters: SubscriberFilters = {}): Promise<SubscriberPage> {
    const { search, status, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    let query = db
      .selectFrom('subscribers')
      .leftJoin('subscriber_user', 'subscribers.id', 'subscriber_user.subscriber_id')
      .leftJoin('users', 'subscriber_user.user_id', 'users.id')
      .select([
        'subscribers.id',
        'subscribers.stripe_customer_id',
        'subscribers.business_name',
        'subscribers.phone',
        'subscribers.status',
        'subscribers.created_at',
        'users.email as user_email',
        'users.name as user_name',
      ])
      .where('subscribers.deleted_at', 'is', null)

    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('subscribers.business_name', 'like', `%${search}%`),
          eb('users.email', 'like', `%${search}%`),
          eb('users.name', 'like', `%${search}%`),
        ])
      )
    }

    if (status && status !== 'all') {
      query = query.where('subscribers.status', '=', status)
    }

    // Count query
    const countResult = await db
      .selectFrom('subscribers')
      .select(db.fn.countAll().as('count'))
      .where('subscribers.deleted_at', 'is', null)
      .executeTakeFirst()

    const total = Number(countResult?.count ?? 0)

    const subscribers = await query
      .orderBy('subscribers.created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return {
      subscribers: subscribers as SubscriberSummary[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getSubscriberById(id: number): Promise<SubscriberDetail | null> {
    const subscriber = await db
      .selectFrom('subscribers')
      .leftJoin('subscriber_user', 'subscribers.id', 'subscriber_user.subscriber_id')
      .leftJoin('users', 'subscriber_user.user_id', 'users.id')
      .select([
        'subscribers.id',
        'subscribers.stripe_customer_id',
        'subscribers.business_name',
        'subscribers.phone',
        'subscribers.address',
        'subscribers.city',
        'subscribers.state',
        'subscribers.postal_code',
        'subscribers.status',
        'subscribers.notes',
        'subscribers.created_at',
        'subscribers.updated_at',
        'users.email as user_email',
        'users.name as user_name',
      ])
      .where('subscribers.id', '=', id)
      .where('subscribers.deleted_at', 'is', null)
      .executeTakeFirst()

    return (subscriber as SubscriberDetail) ?? null
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
        notes: data.notes ?? null,
        status: 'active',
      })
      .execute()

    // MySQL insertId
    return Number(result[0].insertId)
  }

  async updateSubscriber(id: number, data: UpdateSubscriberData): Promise<void> {
    await db
      .updateTable('subscribers')
      .set(data)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .execute()
  }

  async softDeleteSubscriber(id: number): Promise<void> {
    await db
      .updateTable('subscribers')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .execute()
  }

  async linkUserToSubscriber(subscriberId: number, userId: number): Promise<void> {
    await db
      .insertInto('subscriber_user')
      .values({ subscriber_id: subscriberId, user_id: userId })
      .execute()
  }

  async getSubscriberByUserId(userId: number): Promise<SubscriberDetail | null> {
    const link = await db
      .selectFrom('subscriber_user')
      .select('subscriber_id')
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (!link) return null
    return this.getSubscriberById(link.subscriber_id)
  }

  async updateSubscriberStatus(
    stripeCustomerId: string,
    status: 'active' | 'past_due' | 'canceled' | 'paused'
  ): Promise<void> {
    await db
      .updateTable('subscribers')
      .set({ status })
      .where('stripe_customer_id', '=', stripeCustomerId)
      .execute()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/repositories/__tests__/SubscriberRepository.test.ts`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/repositories/SubscriberRepository.ts src/lib/repositories/__tests__/SubscriberRepository.test.ts
git commit -m "feat: add SubscriberRepository with tests"
```

---

## Task 6: Create ProductRepository (Products + Prices)

**Files:**
- Create: `src/lib/repositories/ProductRepository.ts`
- Create: `src/lib/repositories/__tests__/ProductRepository.test.ts`

**Step 1: Write the failing test**

Create `src/lib/repositories/__tests__/ProductRepository.test.ts`:

```typescript
import { ProductRepository } from '../ProductRepository'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  }
}))

describe('ProductRepository', () => {
  let repo: ProductRepository

  beforeEach(() => {
    repo = new ProductRepository()
  })

  it('instantiates without error', () => {
    expect(repo).toBeInstanceOf(ProductRepository)
  })

  it('has getProducts method', () => {
    expect(typeof repo.getProducts).toBe('function')
  })

  it('has createProduct method', () => {
    expect(typeof repo.createProduct).toBe('function')
  })

  it('has createPrice method', () => {
    expect(typeof repo.createPrice).toBe('function')
  })

  it('has getPricesByProductId method', () => {
    expect(typeof repo.getPricesByProductId).toBe('function')
  })

  it('has deactivateProduct method', () => {
    expect(typeof repo.deactivateProduct).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/ProductRepository.test.ts`

Expected: FAIL

**Step 3: Write the implementation**

Create `src/lib/repositories/ProductRepository.ts`:

```typescript
import { db } from '@/lib/database/client'

export interface ProductSummary {
  id: number
  stripe_product_id: string | null
  name: string
  description: string | null
  type: 'recurring' | 'one_time' | 'custom'
  is_active: boolean
  created_at: Date | null
}

export interface PriceSummary {
  id: number
  product_id: number
  stripe_price_id: string | null
  amount_cents: number
  currency: string
  interval: string
  interval_count: number
  is_active: boolean
}

export interface CreateProductData {
  stripe_product_id: string
  name: string
  description?: string
  type: 'recurring' | 'one_time' | 'custom'
}

export interface CreatePriceData {
  product_id: number
  stripe_price_id: string
  amount_cents: number
  currency?: string
  interval: 'month' | 'quarter' | 'year' | 'one_time'
  interval_count?: number
}

export class ProductRepository {
  async getProducts(activeOnly: boolean = true): Promise<ProductSummary[]> {
    let query = db
      .selectFrom('products')
      .select([
        'id',
        'stripe_product_id',
        'name',
        'description',
        'type',
        'is_active',
        'created_at',
      ])
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const products = await query.execute()
    return products as unknown as ProductSummary[]
  }

  async getProductById(id: number): Promise<ProductSummary | null> {
    const product = await db
      .selectFrom('products')
      .select([
        'id',
        'stripe_product_id',
        'name',
        'description',
        'type',
        'is_active',
        'created_at',
      ])
      .where('id', '=', id)
      .executeTakeFirst()

    return (product as unknown as ProductSummary) ?? null
  }

  async createProduct(data: CreateProductData): Promise<number> {
    const result = await db
      .insertInto('products')
      .values({
        stripe_product_id: data.stripe_product_id,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
      })
      .execute()

    return Number(result[0].insertId)
  }

  async updateProduct(id: number, data: Partial<Pick<CreateProductData, 'name' | 'description'>>): Promise<void> {
    await db
      .updateTable('products')
      .set(data)
      .where('id', '=', id)
      .execute()
  }

  async deactivateProduct(id: number): Promise<void> {
    await db
      .updateTable('products')
      .set({ is_active: 0 })
      .where('id', '=', id)
      .execute()
  }

  async hasActiveSubscriptions(productId: number): Promise<boolean> {
    const result = await db
      .selectFrom('subscriber_subscriptions')
      .select(db.fn.countAll().as('count'))
      .where('product_id', '=', productId)
      .where('status', 'in', ['active', 'past_due', 'incomplete'])
      .executeTakeFirst()

    return Number(result?.count ?? 0) > 0
  }

  async getPricesByProductId(productId: number): Promise<PriceSummary[]> {
    const prices = await db
      .selectFrom('prices')
      .select([
        'id',
        'product_id',
        'stripe_price_id',
        'amount_cents',
        'currency',
        'interval',
        'interval_count',
        'is_active',
      ])
      .where('product_id', '=', productId)
      .where('is_active', '=', 1)
      .orderBy('amount_cents', 'asc')
      .execute()

    return prices as unknown as PriceSummary[]
  }

  async createPrice(data: CreatePriceData): Promise<number> {
    const result = await db
      .insertInto('prices')
      .values({
        product_id: data.product_id,
        stripe_price_id: data.stripe_price_id,
        amount_cents: data.amount_cents,
        currency: data.currency ?? 'usd',
        interval: data.interval,
        interval_count: data.interval_count ?? 1,
      })
      .execute()

    return Number(result[0].insertId)
  }

  async deactivatePrice(id: number): Promise<void> {
    await db
      .updateTable('prices')
      .set({ is_active: 0 })
      .where('id', '=', id)
      .execute()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/repositories/__tests__/ProductRepository.test.ts`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/repositories/ProductRepository.ts src/lib/repositories/__tests__/ProductRepository.test.ts
git commit -m "feat: add ProductRepository for billing catalog"
```

---

## Task 7: Create BillingRepository (Subscriptions + Payment History)

**Files:**
- Create: `src/lib/repositories/BillingRepository.ts`
- Create: `src/lib/repositories/__tests__/BillingRepository.test.ts`

**Step 1: Write the failing test**

Create `src/lib/repositories/__tests__/BillingRepository.test.ts`:

```typescript
import { BillingRepository } from '../BillingRepository'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  }
}))

describe('BillingRepository', () => {
  let repo: BillingRepository

  beforeEach(() => {
    repo = new BillingRepository()
  })

  it('has getSubscriptionsBySubscriberId method', () => {
    expect(typeof repo.getSubscriptionsBySubscriberId).toBe('function')
  })

  it('has createSubscription method', () => {
    expect(typeof repo.createSubscription).toBe('function')
  })

  it('has updateSubscriptionStatus method', () => {
    expect(typeof repo.updateSubscriptionStatus).toBe('function')
  })

  it('has getPaymentHistory method', () => {
    expect(typeof repo.getPaymentHistory).toBe('function')
  })

  it('has recordPayment method', () => {
    expect(typeof repo.recordPayment).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/BillingRepository.test.ts`

Expected: FAIL

**Step 3: Write the implementation**

Create `src/lib/repositories/BillingRepository.ts`:

```typescript
import { db } from '@/lib/database/client'

export interface SubscriptionSummary {
  id: number
  subscriber_id: number
  stripe_subscription_id: string
  product_id: number
  price_id: number
  status: string
  current_period_start: Date | null
  current_period_end: Date | null
  cancel_at_period_end: boolean
  product_name: string
  amount_cents: number
  interval: string
  interval_count: number
}

export interface CreateSubscriptionData {
  subscriber_id: number
  stripe_subscription_id: string
  product_id: number
  price_id: number
  status: string
  current_period_start?: Date
  current_period_end?: Date
}

export interface PaymentRecord {
  id: number
  subscriber_id: number
  stripe_invoice_id: string
  stripe_payment_intent_id: string | null
  amount_cents: number
  currency: string
  status: string
  description: string | null
  invoice_pdf_url: string | null
  paid_at: Date | null
  created_at: Date | null
}

export interface RecordPaymentData {
  subscriber_id: number
  stripe_invoice_id: string
  stripe_payment_intent_id?: string
  amount_cents: number
  currency?: string
  status: string
  description?: string
  invoice_pdf_url?: string
  paid_at?: Date
}

export interface PaymentHistoryFilters {
  page?: number
  limit?: number
}

export interface PaymentHistoryPage {
  payments: PaymentRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class BillingRepository {
  async getSubscriptionsBySubscriberId(subscriberId: number): Promise<SubscriptionSummary[]> {
    const subs = await db
      .selectFrom('subscriber_subscriptions')
      .innerJoin('products', 'subscriber_subscriptions.product_id', 'products.id')
      .innerJoin('prices', 'subscriber_subscriptions.price_id', 'prices.id')
      .select([
        'subscriber_subscriptions.id',
        'subscriber_subscriptions.subscriber_id',
        'subscriber_subscriptions.stripe_subscription_id',
        'subscriber_subscriptions.product_id',
        'subscriber_subscriptions.price_id',
        'subscriber_subscriptions.status',
        'subscriber_subscriptions.current_period_start',
        'subscriber_subscriptions.current_period_end',
        'subscriber_subscriptions.cancel_at_period_end',
        'products.name as product_name',
        'prices.amount_cents',
        'prices.interval',
        'prices.interval_count',
      ])
      .where('subscriber_subscriptions.subscriber_id', '=', subscriberId)
      .orderBy('subscriber_subscriptions.created_at', 'desc')
      .execute()

    return subs as unknown as SubscriptionSummary[]
  }

  async getAllSubscriptions(): Promise<SubscriptionSummary[]> {
    const subs = await db
      .selectFrom('subscriber_subscriptions')
      .innerJoin('products', 'subscriber_subscriptions.product_id', 'products.id')
      .innerJoin('prices', 'subscriber_subscriptions.price_id', 'prices.id')
      .select([
        'subscriber_subscriptions.id',
        'subscriber_subscriptions.subscriber_id',
        'subscriber_subscriptions.stripe_subscription_id',
        'subscriber_subscriptions.product_id',
        'subscriber_subscriptions.price_id',
        'subscriber_subscriptions.status',
        'subscriber_subscriptions.current_period_start',
        'subscriber_subscriptions.current_period_end',
        'subscriber_subscriptions.cancel_at_period_end',
        'products.name as product_name',
        'prices.amount_cents',
        'prices.interval',
        'prices.interval_count',
      ])
      .orderBy('subscriber_subscriptions.created_at', 'desc')
      .execute()

    return subs as unknown as SubscriptionSummary[]
  }

  async createSubscription(data: CreateSubscriptionData): Promise<number> {
    const result = await db
      .insertInto('subscriber_subscriptions')
      .values({
        subscriber_id: data.subscriber_id,
        stripe_subscription_id: data.stripe_subscription_id,
        product_id: data.product_id,
        price_id: data.price_id,
        status: data.status,
        current_period_start: data.current_period_start ?? null,
        current_period_end: data.current_period_end ?? null,
      })
      .execute()

    return Number(result[0].insertId)
  }

  async updateSubscriptionStatus(stripeSubscriptionId: string, status: string, cancelAtPeriodEnd?: boolean): Promise<void> {
    const update: Record<string, unknown> = { status }
    if (cancelAtPeriodEnd !== undefined) {
      update.cancel_at_period_end = cancelAtPeriodEnd ? 1 : 0
    }

    await db
      .updateTable('subscriber_subscriptions')
      .set(update)
      .where('stripe_subscription_id', '=', stripeSubscriptionId)
      .execute()
  }

  async updateSubscriptionPeriod(
    stripeSubscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    await db
      .updateTable('subscriber_subscriptions')
      .set({
        current_period_start: periodStart,
        current_period_end: periodEnd,
      })
      .where('stripe_subscription_id', '=', stripeSubscriptionId)
      .execute()
  }

  async getPaymentHistory(subscriberId: number, filters: PaymentHistoryFilters = {}): Promise<PaymentHistoryPage> {
    const { page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const countResult = await db
      .selectFrom('payment_history')
      .select(db.fn.countAll().as('count'))
      .where('subscriber_id', '=', subscriberId)
      .executeTakeFirst()

    const total = Number(countResult?.count ?? 0)

    const payments = await db
      .selectFrom('payment_history')
      .select([
        'id',
        'subscriber_id',
        'stripe_invoice_id',
        'stripe_payment_intent_id',
        'amount_cents',
        'currency',
        'status',
        'description',
        'invoice_pdf_url',
        'paid_at',
        'created_at',
      ])
      .where('subscriber_id', '=', subscriberId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return {
      payments: payments as unknown as PaymentRecord[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async recordPayment(data: RecordPaymentData): Promise<void> {
    // Upsert on stripe_invoice_id for idempotency
    const existing = await db
      .selectFrom('payment_history')
      .select('id')
      .where('stripe_invoice_id', '=', data.stripe_invoice_id)
      .executeTakeFirst()

    if (existing) {
      await db
        .updateTable('payment_history')
        .set({
          status: data.status,
          stripe_payment_intent_id: data.stripe_payment_intent_id ?? null,
          invoice_pdf_url: data.invoice_pdf_url ?? null,
          paid_at: data.paid_at ?? null,
        })
        .where('id', '=', existing.id)
        .execute()
    } else {
      await db
        .insertInto('payment_history')
        .values({
          subscriber_id: data.subscriber_id,
          stripe_invoice_id: data.stripe_invoice_id,
          stripe_payment_intent_id: data.stripe_payment_intent_id ?? null,
          amount_cents: data.amount_cents,
          currency: data.currency ?? 'usd',
          status: data.status,
          description: data.description ?? null,
          invoice_pdf_url: data.invoice_pdf_url ?? null,
          paid_at: data.paid_at ?? null,
        })
        .execute()
    }
  }

  async getSubscriberIdByStripeCustomerId(stripeCustomerId: string): Promise<number | null> {
    const result = await db
      .selectFrom('subscribers')
      .select('id')
      .where('stripe_customer_id', '=', stripeCustomerId)
      .executeTakeFirst()

    return result?.id ?? null
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/repositories/__tests__/BillingRepository.test.ts`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/repositories/BillingRepository.ts src/lib/repositories/__tests__/BillingRepository.test.ts
git commit -m "feat: add BillingRepository for subscriptions and payment history"
```

---

## Task 8: Create Stripe Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

**Step 1: Write the webhook route**

Create `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/StripeService'
import { BillingRepository } from '@/lib/repositories/BillingRepository'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { logger } from '@/lib/utils/logger'
import type Stripe from 'stripe'

const billingRepo = new BillingRepository()
const subscriberRepo = new SubscriberRepository()

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripeService = new StripeService()
    event = stripeService.verifyWebhookSignature(body, signature)
  } catch (err) {
    logger.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        logger.log(`Unhandled webhook event type: ${event.type}`)
    }
  } catch (err) {
    logger.error(`Error handling webhook event ${event.type}:`, err)
    // Return 200 anyway to prevent Stripe retries on app-level errors
    // The error is logged for investigation
  }

  return NextResponse.json({ received: true })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const subscriberId = await billingRepo.getSubscriberIdByStripeCustomerId(customerId)
  if (!subscriberId) {
    logger.error(`No subscriber found for Stripe customer ${customerId}`)
    return
  }

  await billingRepo.recordPayment({
    subscriber_id: subscriberId,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id ?? undefined,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
    status: 'paid',
    description: invoice.lines?.data?.[0]?.description ?? 'Payment',
    invoice_pdf_url: invoice.invoice_pdf ?? undefined,
    paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
  })

  await subscriberRepo.updateSubscriberStatus(customerId, 'active')
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const subscriberId = await billingRepo.getSubscriberIdByStripeCustomerId(customerId)
  if (!subscriberId) return

  await billingRepo.recordPayment({
    subscriber_id: subscriberId,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    description: invoice.lines?.data?.[0]?.description ?? 'Payment failed',
  })

  await subscriberRepo.updateSubscriberStatus(customerId, 'past_due')
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await billingRepo.updateSubscriptionStatus(
    subscription.id,
    subscription.status,
    subscription.cancel_at_period_end
  )

  if (subscription.current_period_start && subscription.current_period_end) {
    await billingRepo.updateSubscriptionPeriod(
      subscription.id,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000)
    )
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await billingRepo.updateSubscriptionStatus(subscription.id, 'canceled')

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (customerId) {
    // Check if subscriber has any remaining active subs
    const subscriberId = await billingRepo.getSubscriberIdByStripeCustomerId(customerId)
    if (subscriberId) {
      const remaining = await billingRepo.getSubscriptionsBySubscriberId(subscriberId)
      const hasActive = remaining.some(s => s.status === 'active' || s.status === 'past_due')
      if (!hasActive) {
        await subscriberRepo.updateSubscriberStatus(customerId, 'canceled')
      }
    }
  }
}
```

**Step 2: Verify build compiles**

Run: `bun run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/webhooks/stripe/
git commit -m "feat: add Stripe webhook handler for billing events"
```

---

## Task 9: Create Admin API Routes — Subscribers

**Files:**
- Create: `src/app/api/admin/subscribers/route.ts` (GET list, POST create)
- Create: `src/app/api/admin/subscribers/[id]/route.ts` (GET detail, PUT update)
- Create: `src/app/api/admin/subscribers/[id]/setup-link/route.ts` (POST)
- Create: `src/app/api/admin/subscribers/[id]/charge/route.ts` (POST)

**Step 1: Write subscriber list + create route**

Create `src/app/api/admin/subscribers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/database/client'
import bcrypt from 'bcryptjs'

const subscriberRepo = new SubscriberRepository()

async function verifyAdminAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  return null
}

// GET /api/admin/subscribers
export async function GET(request: NextRequest) {
  const authError = await verifyAdminAccess()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    const result = await subscriberRepo.getSubscribers(filters)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error fetching subscribers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/subscribers
export async function POST(request: NextRequest) {
  const authError = await verifyAdminAccess()
  if (authError) return authError

  try {
    const body = await request.json()
    const { email, name, password, business_name, phone, address, city, state, postal_code, notes } = body

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'email, name, and password are required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst()

    let userId: number

    if (existingUser) {
      // User exists — check if already a subscriber
      const existingSub = await subscriberRepo.getSubscriberByUserId(existingUser.id)
      if (existingSub) {
        return NextResponse.json({ error: 'User is already a subscriber' }, { status: 409 })
      }
      userId = existingUser.id
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10)
      const userResult = await db
        .insertInto('users')
        .values({
          email,
          name,
          password: hashedPassword,
          role: 'subscriber',
        })
        .execute()
      userId = Number(userResult[0].insertId)
    }

    // Create Stripe customer
    const stripeService = new StripeService()
    const stripeCustomer = await stripeService.createCustomer(email, business_name || name)

    // Create subscriber record
    const subscriberId = await subscriberRepo.createSubscriber({
      stripe_customer_id: stripeCustomer.id,
      business_name,
      phone,
      address,
      city,
      state,
      postal_code,
      notes,
    })

    // Link user to subscriber
    await subscriberRepo.linkUserToSubscriber(subscriberId, userId)

    return NextResponse.json({ id: subscriberId, stripe_customer_id: stripeCustomer.id }, { status: 201 })
  } catch (error) {
    logger.error('Error creating subscriber:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Write subscriber detail + update route**

Create `src/app/api/admin/subscribers/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { BillingRepository } from '@/lib/repositories/BillingRepository'
import { logger } from '@/lib/utils/logger'

const subscriberRepo = new SubscriberRepository()
const billingRepo = new BillingRepository()

async function verifyAdminAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  return null
}

// GET /api/admin/subscribers/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await verifyAdminAccess()
  if (authError) return authError

  try {
    const { id } = await params
    const subscriberId = parseInt(id)

    const subscriber = await subscriberRepo.getSubscriberById(subscriberId)
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const subscriptions = await billingRepo.getSubscriptionsBySubscriberId(subscriberId)
    const payments = await billingRepo.getPaymentHistory(subscriberId, { limit: 10 })

    return NextResponse.json({ subscriber, subscriptions, payments: payments.payments })
  } catch (error) {
    logger.error('Error fetching subscriber detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/subscribers/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await verifyAdminAccess()
  if (authError) return authError

  try {
    const { id } = await params
    const subscriberId = parseInt(id)
    const body = await request.json()

    await subscriberRepo.updateSubscriber(subscriberId, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error updating subscriber:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 3: Write setup-link route**

Create `src/app/api/admin/subscribers/[id]/setup-link/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'
import { logger } from '@/lib/utils/logger'

const subscriberRepo = new SubscriberRepository()

// POST /api/admin/subscribers/[id]/setup-link
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { id } = await params
    const subscriber = await subscriberRepo.getSubscriberById(parseInt(id))
    if (!subscriber || !subscriber.stripe_customer_id) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const stripeService = new StripeService()
    const clientSecret = await stripeService.createSetupLink(subscriber.stripe_customer_id)

    return NextResponse.json({ client_secret: clientSecret })
  } catch (error) {
    logger.error('Error creating setup link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 4: Write one-time charge route**

Create `src/app/api/admin/subscribers/[id]/charge/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { StripeService } from '@/lib/services/StripeService'
import { logger } from '@/lib/utils/logger'

const subscriberRepo = new SubscriberRepository()

// POST /api/admin/subscribers/[id]/charge
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { amount_cents, description } = body

    if (!amount_cents || !description) {
      return NextResponse.json({ error: 'amount_cents and description are required' }, { status: 400 })
    }

    const subscriber = await subscriberRepo.getSubscriberById(parseInt(id))
    if (!subscriber || !subscriber.stripe_customer_id) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const stripeService = new StripeService()
    const invoice = await stripeService.createOneTimeCharge(
      subscriber.stripe_customer_id,
      amount_cents,
      description
    )

    return NextResponse.json({ invoice_id: invoice.id, status: invoice.status })
  } catch (error) {
    logger.error('Error creating one-time charge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 5: Verify build compiles**

Run: `bun run build`

**Step 6: Commit**

```bash
git add src/app/api/admin/subscribers/
git commit -m "feat: add admin subscriber API routes"
```

---

## Task 10: Create Admin API Routes — Products, Prices, Subscriptions

**Files:**
- Create: `src/app/api/admin/products/route.ts` (GET, POST)
- Create: `src/app/api/admin/products/[id]/route.ts` (PUT, DELETE)
- Create: `src/app/api/admin/products/[id]/prices/route.ts` (POST)
- Create: `src/app/api/admin/subscriptions/route.ts` (GET, POST)
- Create: `src/app/api/admin/subscriptions/[id]/route.ts` (DELETE)

These follow the same admin API pattern as Task 9. Each route:
1. Verifies admin session
2. Validates input
3. Calls repository + StripeService
4. Returns JSON response

Key behaviors:
- `POST /api/admin/products` — creates product in DB, then syncs to Stripe. Stores `stripe_product_id`.
- `DELETE /api/admin/products/[id]` — checks `hasActiveSubscriptions()`. If yes, returns 409. If no, deactivates locally + on Stripe.
- `POST /api/admin/products/[id]/prices` — creates price in DB + Stripe. Links to product.
- `POST /api/admin/subscriptions` — accepts `{ subscriber_id, price_id }`. Looks up subscriber's `stripe_customer_id` and price's `stripe_price_id`, creates Stripe Subscription, saves locally.
- `DELETE /api/admin/subscriptions/[id]` — cancels on Stripe, updates local status.

**Step 1: Write product routes (see pattern from Task 9)**

**Step 2: Write subscription routes (see pattern from Task 9)**

**Step 3: Verify build**

Run: `bun run build`

**Step 4: Commit**

```bash
git add src/app/api/admin/products/ src/app/api/admin/subscriptions/
git commit -m "feat: add admin product and subscription API routes"
```

---

## Task 11: Create Subscriber API Routes

**Files:**
- Create: `src/app/api/subscriber/billing/route.ts`
- Create: `src/app/api/subscriber/payments/route.ts`
- Create: `src/app/api/subscriber/profile/route.ts`

These are read-only (except profile PUT) routes for the subscriber portal. Each:
1. Gets session via `getServerSession`
2. Checks `session.user.isSubscriber` and `session.user.subscriberId`
3. Reads from repository filtered by their own `subscriberId`

**Step 1: Write billing route**

Create `src/app/api/subscriber/billing/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { BillingRepository } from '@/lib/repositories/BillingRepository'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'

const billingRepo = new BillingRepository()
const subscriberRepo = new SubscriberRepository()

// GET /api/subscriber/billing
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Subscriber access required' }, { status: 403 })
  }

  const subscriber = await subscriberRepo.getSubscriberById(session.user.subscriberId)
  const subscriptions = await billingRepo.getSubscriptionsBySubscriberId(session.user.subscriberId)

  return NextResponse.json({ subscriber, subscriptions })
}
```

**Step 2: Write payments route**

Create `src/app/api/subscriber/payments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { BillingRepository } from '@/lib/repositories/BillingRepository'

const billingRepo = new BillingRepository()

// GET /api/subscriber/payments
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Subscriber access required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const result = await billingRepo.getPaymentHistory(session.user.subscriberId, { page, limit })
  return NextResponse.json(result)
}
```

**Step 3: Write profile route**

Create `src/app/api/subscriber/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { SubscriberRepository } from '@/lib/repositories/SubscriberRepository'
import { logger } from '@/lib/utils/logger'

const subscriberRepo = new SubscriberRepository()

// GET /api/subscriber/profile
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Subscriber access required' }, { status: 403 })
  }

  const subscriber = await subscriberRepo.getSubscriberById(session.user.subscriberId)
  return NextResponse.json(subscriber)
}

// PUT /api/subscriber/profile
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSubscriber || !session.user.subscriberId) {
    return NextResponse.json({ error: 'Subscriber access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    // Subscribers can only update their own contact info — not status or notes
    const { business_name, phone, address, city, state, postal_code } = body

    await subscriberRepo.updateSubscriber(session.user.subscriberId, {
      business_name,
      phone,
      address,
      city,
      state,
      postal_code,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error updating subscriber profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 4: Verify build**

Run: `bun run build`

**Step 5: Commit**

```bash
git add src/app/api/subscriber/
git commit -m "feat: add subscriber portal API routes"
```

---

## Task 12: Update Navigation for Subscriber Role

**Files:**
- Modify: `src/components/layout/ClientNavigation.tsx`

**Step 1: Add subscriber menu items**

In `ClientNavigation.tsx`, update the `ClientNavigationProps` interface to include `isSubscriber`:

```typescript
interface ClientNavigationProps {
  user: {
    name?: string | null
    email?: string | null
    isAdmin: boolean
    isManager: boolean
    isActive: boolean
    isSubscriber: boolean
  }
}
```

Add subscriber menu items to the `menuItems` array:

```typescript
// Add after existing items, before the .filter(item => item.show)
{
  href: '/subscriber/dashboard',
  label: 'Billing',
  show: user.isSubscriber
},
{
  href: '/subscriber/payments',
  label: 'Payments',
  show: user.isSubscriber
},
{
  href: '/subscriber/documents',
  label: 'Documents',
  show: user.isSubscriber && !user.isAdmin && !user.isManager
},
```

Also add subscriber links to admin nav:

```typescript
{
  href: '/admin/subscribers',
  label: 'Subscribers',
  show: user.isAdmin
},
{
  href: '/admin/products',
  label: 'Products',
  show: user.isAdmin
},
```

Update the role display:

```typescript
{user.isAdmin ? 'Admin' : user.isManager ? 'Manager' : user.isSubscriber ? 'Subscriber' : 'Employee'}
```

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add src/components/layout/ClientNavigation.tsx
git commit -m "feat: add subscriber and billing links to navigation"
```

---

## Task 13: Create Subscriber Portal Pages

**Files:**
- Create: `src/app/(portal)/subscriber/layout.tsx`
- Create: `src/app/(portal)/subscriber/dashboard/page.tsx`
- Create: `src/app/(portal)/subscriber/payments/page.tsx`
- Create: `src/app/(portal)/subscriber/profile/page.tsx`
- Create: `src/app/(portal)/subscriber/documents/page.tsx`

**Step 1: Create subscriber layout**

Create `src/app/(portal)/subscriber/layout.tsx`:

```typescript
import { requireSubscriber } from '@/lib/auth/utils'

export default async function SubscriberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSubscriber()
  return <>{children}</>
}
```

**Step 2: Create dashboard page**

This is a server component that fetches billing data and renders subscription cards showing: product name, status badge, price, next billing date.

**Step 3: Create payments page**

Table page showing payment history: date, description, amount, status (with badge colors), PDF download link.

**Step 4: Create profile page**

Form page (React Hook Form + Zod) for editing: business name, phone, address, city, state, postal code. Read-only display for email and subscription status.

**Step 5: Create documents page**

Reuse the existing document listing pattern from `src/app/(portal)/documents/`. Filter documents by subscriber access.

**Step 6: Verify build**

Run: `bun run build`

**Step 7: Commit**

```bash
git add src/app/\(portal\)/subscriber/
git commit -m "feat: add subscriber portal pages"
```

---

## Task 14: Create Admin Billing Pages

**Files:**
- Create: `src/app/(portal)/admin/subscribers/page.tsx`
- Create: `src/app/(portal)/admin/subscribers/[id]/page.tsx`
- Create: `src/app/(portal)/admin/subscribers/new/page.tsx`
- Create: `src/app/(portal)/admin/products/page.tsx`

**Step 1: Create subscriber list page**

Table with columns: Name/Business, Email, Status (badge), Created. Search input, status filter dropdown. "Add Subscriber" button linking to `/admin/subscribers/new`.

**Step 2: Create subscriber detail page**

Tabbed view (shadcn Tabs): Overview (subscriber info + edit), Subscriptions (list + assign new), Payments (history table), Actions (setup link button, one-time charge form).

**Step 3: Create new subscriber page**

Form (React Hook Form + Zod): email, name, password, business_name, phone, address fields, notes. Submits to `POST /api/admin/subscribers`.

**Step 4: Create products page**

Two-section page: product list (cards with name, type, active badge, prices listed, deactivate button) + "Add Product" form (name, description, type select). Each product has "Add Price" inline form (amount, interval, interval_count).

**Step 5: Verify build**

Run: `bun run build`

**Step 6: Commit**

```bash
git add src/app/\(portal\)/admin/subscribers/ src/app/\(portal\)/admin/products/
git commit -m "feat: add admin billing management pages"
```

---

## Task 15: End-to-End Smoke Test

**Files:**
- Create: `tests/billing.spec.ts`

**Step 1: Write E2E test for admin subscriber flow**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Billing - Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('admin can navigate to subscribers page', async ({ page }) => {
    await page.goto('/admin/subscribers')
    await expect(page.locator('h1')).toContainText('Subscribers')
  })

  test('admin can navigate to products page', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page.locator('h1')).toContainText('Products')
  })
})
```

**Step 2: Run E2E tests**

Run: `bun test:e2e tests/billing.spec.ts`

Note: Full Stripe integration tests require Stripe test mode keys configured in `.env.local`. The E2E tests verify page rendering and navigation, not actual Stripe API calls.

**Step 3: Commit**

```bash
git add tests/billing.spec.ts
git commit -m "test: add billing E2E smoke tests"
```

---

## Task 16: Final Verification and Cleanup

**Step 1: Run all unit tests**

Run: `bun test`

Expected: All tests pass

**Step 2: Run lint**

Run: `bun lint`

Fix any lint errors.

**Step 3: Run full build**

Run: `bun run build`

Expected: Clean build with no errors

**Step 4: Manual verification checklist**

- [ ] Admin can create a subscriber (with Stripe test keys)
- [ ] Admin can create products and prices
- [ ] Admin can assign a subscription to a subscriber
- [ ] Admin can send a setup link
- [ ] Admin can charge a one-time fee
- [ ] Subscriber can log in and see dashboard
- [ ] Subscriber can view payment history
- [ ] Subscriber can update profile
- [ ] Subscriber can view documents
- [ ] Webhook endpoint responds to test events
- [ ] Navigation shows correct items per role
- [ ] Dual-role user (employee + subscriber) sees both navs

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: billing integration cleanup and final verification"
```
