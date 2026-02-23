# Website Services Marketing Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a marketing page for CMP's website services offering with a dynamic pricing calculator driven by real subscription products, gated behind the `enable-subscriptions` feature flag.

**Architecture:** A new authenticated route at `/subscriber/services` that fetches active products + marketing metadata from a `product_marketing` table, renders tier cards and toggleable add-ons, and shows a running total. The page links to the existing subscription signup flow. All product data is admin-managed — no hardcoded prices.

**Tech Stack:** Next.js 15 App Router, TypeScript, Kysely ORM (MySQL), React state for calculator, shadcn/ui components, Tailwind CSS, `useFeatureFlag` hook for gating.

---

### Task 1: Database Migration — `product_marketing` Table

**Files:**
- Create: `src/lib/database/migrations/003_product_marketing.sql`

**Step 1: Write the migration SQL**

```sql
-- Product marketing metadata (idempotent — safe to run multiple times)

CREATE TABLE IF NOT EXISTS product_marketing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  category ENUM('tier', 'addon') NOT NULL DEFAULT 'tier',
  tagline VARCHAR(255) NULL,
  feature_list JSON NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  icon_name VARCHAR(100) NULL,
  badge_text VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_product_marketing (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Column notes:
- `category`: `'tier'` for base pricing tiers, `'addon'` for toggleable add-ons
- `feature_list`: JSON array of strings, e.g. `["Up to 5 pages", "Basic CMS", "CRM integration"]`
- `display_order`: Sort order on the marketing page (lower = first)
- `is_featured`: Shows "MOST POPULAR" badge on tier cards
- `icon_name`: Lucide icon name for add-on display (e.g. `"shopping-cart"`)
- `badge_text`: Optional custom badge text (e.g. `"MOST POPULAR"`, `"NEW"`)

**Step 2: Run the migration**

Run: `mysql -u root choice_marketing < src/lib/database/migrations/003_product_marketing.sql`
Expected: No errors, table created.

**Step 3: Regenerate Kysely types**

Run: `bun run kysely-codegen`
Expected: `src/lib/database/types.ts` updated with `ProductMarketing` interface.

**Step 4: Commit**

```bash
git add src/lib/database/migrations/003_product_marketing.sql src/lib/database/types.ts
git commit -m "feat: add product_marketing table for website services page"
```

---

### Task 2: ProductMarketingRepository

**Files:**
- Create: `src/lib/repositories/ProductMarketingRepository.ts`
- Test: `src/lib/repositories/__tests__/ProductMarketingRepository.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/repositories/__tests__/ProductMarketingRepository.test.ts
import { ProductMarketingRepository } from '../ProductMarketingRepository'

// We test the interface and types — DB calls are tested via integration
describe('ProductMarketingRepository', () => {
  it('should instantiate', () => {
    const repo = new ProductMarketingRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.getMarketingProducts).toBe('function')
    expect(typeof repo.getMarketingProductsByCategory).toBe('function')
    expect(typeof repo.upsertMarketingData).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/ProductMarketingRepository.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the repository**

```typescript
// src/lib/repositories/ProductMarketingRepository.ts
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
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/repositories/__tests__/ProductMarketingRepository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/repositories/ProductMarketingRepository.ts src/lib/repositories/__tests__/ProductMarketingRepository.test.ts
git commit -m "feat: add ProductMarketingRepository with tier/addon queries"
```

---

### Task 3: API Route — Public Marketing Products Endpoint

**Files:**
- Create: `src/app/api/marketing/products/route.ts`
- Test: `src/app/api/marketing/products/__tests__/route.test.ts`

**Step 1: Write the failing test**

```typescript
// src/app/api/marketing/products/__tests__/route.test.ts
import { GET } from '../route'

// Mock the repository
jest.mock('@/lib/repositories/ProductMarketingRepository', () => ({
  ProductMarketingRepository: jest.fn().mockImplementation(() => ({
    getMarketingProducts: jest.fn().mockResolvedValue([
      {
        product_id: 1,
        product_name: 'Business Site',
        amount_cents: 149900,
        interval: 'month',
        category: 'tier',
        feature_list: ['Up to 5 pages', 'Basic CMS'],
        display_order: 1,
        is_featured: true,
        tagline: 'Most popular choice',
        icon_name: null,
        badge_text: 'MOST POPULAR',
      },
    ]),
  })),
}))

// Mock feature flag
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}))

describe('GET /api/marketing/products', () => {
  it('returns marketing products when flag is enabled', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(1)
    expect(data[0].product_name).toBe('Business Site')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/app/api/marketing/products/__tests__/route.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the API route**

```typescript
// src/app/api/marketing/products/route.ts
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
```

**Step 4: Run test to verify it passes**

Run: `bun test src/app/api/marketing/products/__tests__/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/marketing/products/route.ts src/app/api/marketing/products/__tests__/route.test.ts
git commit -m "feat: add public API for marketing products"
```

---

### Task 4: Admin API — Manage Product Marketing Metadata

**Files:**
- Create: `src/app/api/admin/products/[id]/marketing/route.ts`

**Step 1: Write the API route**

```typescript
// src/app/api/admin/products/[id]/marketing/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ProductMarketingRepository } from '@/lib/repositories/ProductMarketingRepository'

export async function PUT(
  request: Request,
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
}

export async function DELETE(
  request: Request,
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

  const repo = new ProductMarketingRepository()
  await repo.deleteMarketingData(productId, session.user)

  return NextResponse.json({ success: true })
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/products/[id]/marketing/route.ts
git commit -m "feat: add admin API for product marketing metadata"
```

---

### Task 5: Pricing Calculator Component

**Files:**
- Create: `src/components/marketing/PricingCalculator.tsx`

This is the core interactive component. It receives marketing products as props and manages tier selection + add-on toggle state to compute a running total.

**Step 1: Write the component**

```typescript
// src/components/marketing/PricingCalculator.tsx
'use client'

import { useState, useMemo } from 'react'
import { Check, X, ArrowRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MarketingProduct {
  product_id: number
  product_name: string
  product_description: string | null
  product_type: 'recurring' | 'one_time' | 'custom'
  price_id: number
  stripe_price_id: string
  amount_cents: number
  currency: string
  interval: 'month' | 'quarter' | 'year' | 'one_time'
  interval_count: number
  category: 'tier' | 'addon'
  tagline: string | null
  feature_list: string[]
  display_order: number
  is_featured: boolean
  icon_name: string | null
  badge_text: string | null
}

interface PricingCalculatorProps {
  tiers: MarketingProduct[]
  addons: MarketingProduct[]
  onGetStarted?: (selectedTier: MarketingProduct, selectedAddons: MarketingProduct[]) => void
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatInterval(interval: string): string {
  const labels: Record<string, string> = {
    month: '/mo',
    quarter: '/qtr',
    year: '/yr',
    one_time: ' one-time',
  }
  return labels[interval] ?? ''
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  // Safely look up Lucide icon by name
  const iconMap = LucideIcons as Record<string, React.ComponentType<{ className?: string }>>
  const pascalName = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  const Icon = iconMap[pascalName]
  if (!Icon) return null
  return <Icon className={className} />
}

export function PricingCalculator({ tiers, addons, onGetStarted }: PricingCalculatorProps) {
  const [selectedTierId, setSelectedTierId] = useState<number | null>(
    () => tiers.find((t) => t.is_featured)?.product_id ?? tiers[0]?.product_id ?? null
  )
  const [enabledAddons, setEnabledAddons] = useState<Set<number>>(new Set())

  const selectedTier = tiers.find((t) => t.product_id === selectedTierId)
  const isCustomTier = selectedTier?.product_type === 'custom'

  const monthlyTotal = useMemo(() => {
    if (!selectedTier || isCustomTier) return 0
    let total = selectedTier.amount_cents
    for (const addon of addons) {
      if (enabledAddons.has(addon.product_id)) {
        total += addon.amount_cents
      }
    }
    return total
  }, [selectedTier, isCustomTier, addons, enabledAddons])

  const toggleAddon = (productId: number) => {
    setEnabledAddons((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleGetStarted = () => {
    if (!selectedTier) return
    const selected = addons.filter((a) => enabledAddons.has(a.product_id))
    onGetStarted?.(selectedTier, selected)
  }

  return (
    <div className="space-y-12">
      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiers.map((tier) => {
          const isSelected = tier.product_id === selectedTierId
          const isCustom = tier.product_type === 'custom'

          return (
            <Card
              key={tier.product_id}
              className={cn(
                'cursor-pointer transition-all relative',
                isSelected && tier.is_featured && 'border-primary border-2 shadow-lg',
                isSelected && !tier.is_featured && 'border-primary border-2',
                !isSelected && 'border hover:border-stone-300',
                isCustom && 'bg-stone-900 text-white border-stone-900'
              )}
              onClick={() => setSelectedTierId(tier.product_id)}
            >
              <CardContent className="p-7 space-y-6">
                {tier.badge_text && (
                  <span className={cn(
                    'inline-block text-xs font-bold tracking-wide px-3 py-1 rounded-full',
                    isCustom
                      ? 'bg-amber-600 text-white'
                      : 'bg-primary text-white'
                  )}>
                    {tier.badge_text}
                  </span>
                )}

                <div className="space-y-2">
                  <h3 className={cn(
                    'text-lg font-bold',
                    isCustom ? 'text-white' : 'text-stone-900'
                  )}>
                    {tier.product_name}
                  </h3>
                  <div className="flex items-end gap-1">
                    <span className={cn(
                      'text-4xl font-extrabold',
                      isCustom ? 'text-white' : 'text-stone-900'
                    )}>
                      {isCustom ? 'Custom' : formatCurrency(tier.amount_cents)}
                    </span>
                    {!isCustom && (
                      <span className={cn(
                        'text-sm mb-1',
                        isCustom ? 'text-stone-400' : 'text-stone-500'
                      )}>
                        {formatInterval(tier.interval)}
                      </span>
                    )}
                  </div>
                  {tier.tagline && (
                    <p className={cn(
                      'text-sm leading-relaxed',
                      isCustom ? 'text-stone-400' : 'text-stone-500'
                    )}>
                      {tier.tagline}
                    </p>
                  )}
                </div>

                <div className={cn(
                  'h-px w-full',
                  isCustom ? 'bg-white/15' : 'bg-stone-200'
                )} />

                <ul className="space-y-3">
                  {tier.feature_list.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <Check className={cn(
                        'h-4 w-4 flex-shrink-0',
                        isCustom ? 'text-amber-500' : 'text-primary'
                      )} />
                      <span className={cn(
                        'text-sm',
                        isCustom ? 'text-white' : 'text-stone-700'
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isSelected && tier.is_featured ? 'default' : isCustom ? 'secondary' : 'outline'}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isCustom) {
                      // Contact flow
                      handleGetStarted()
                    } else {
                      setSelectedTierId(tier.product_id)
                    }
                  }}
                >
                  {isCustom ? 'Contact Us' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add-ons */}
      {addons.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-stone-900">
              Customize with Add-ons
            </h3>
            <p className="text-sm text-stone-500">
              Toggle features to update your total
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((addon) => (
              <div
                key={addon.product_id}
                className={cn(
                  'flex items-center justify-between p-5 rounded-lg border bg-white transition-all',
                  enabledAddons.has(addon.product_id)
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-stone-200'
                )}
              >
                <div className="flex items-center gap-3">
                  {addon.icon_name && (
                    <DynamicIcon
                      name={addon.icon_name}
                      className="h-5 w-5 text-primary"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {addon.product_name}
                    </p>
                    <p className="text-xs font-semibold text-amber-600 font-mono">
                      +{formatCurrency(addon.amount_cents)}
                      {formatInterval(addon.interval)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabledAddons.has(addon.product_id)}
                  onCheckedChange={() => toggleAddon(addon.product_id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running Total Bar */}
      <div className="flex items-center justify-between p-6 md:p-8 rounded-xl bg-gradient-to-r from-teal-700 to-teal-900">
        <div>
          <p className="text-sm text-white/70">Your Estimated Monthly Total</p>
          <p className="text-3xl md:text-4xl font-extrabold text-white">
            {isCustomTier ? 'Custom Pricing' : `${formatCurrency(monthlyTotal)}/mo`}
          </p>
        </div>
        <Button
          size="lg"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={handleGetStarted}
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/marketing/PricingCalculator.tsx
git commit -m "feat: add PricingCalculator component with tier selection and add-on toggles"
```

---

### Task 6: Website Services Marketing Page

**Files:**
- Create: `src/app/(portal)/subscriber/services/page.tsx`

This is the full marketing page that fetches products from the API and renders all sections from the design.

**Step 1: Write the page**

```typescript
// src/app/(portal)/subscriber/services/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Globe,
  FileText,
  Target,
  Briefcase,
  MonitorSmartphone,
  Building2,
  Rocket,
  PanelTop,
} from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/button'
import { PricingCalculator } from '@/components/marketing/PricingCalculator'
import { logger } from '@/lib/utils/logger'

interface MarketingProduct {
  product_id: number
  product_name: string
  product_description: string | null
  product_type: 'recurring' | 'one_time' | 'custom'
  price_id: number
  stripe_price_id: string
  amount_cents: number
  currency: string
  interval: 'month' | 'quarter' | 'year' | 'one_time'
  interval_count: number
  category: 'tier' | 'addon'
  tagline: string | null
  feature_list: string[]
  display_order: number
  is_featured: boolean
  icon_name: string | null
  badge_text: string | null
}

const painPoints = [
  {
    icon: Globe,
    title: 'No Online Credibility',
    description:
      "Prospects can't find you online, so they go with someone they can. A professional website builds trust before the first meeting.",
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    icon: FileText,
    title: 'Manual Document Sharing',
    description:
      'Emailing paystubs and contracts one by one is slow and error-prone. A digital portal lets your team access everything instantly.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Target,
    title: 'No Lead Capture',
    description:
      "Without a website, every prospect you meet has no way to learn more. You're leaving money on the table.",
    iconBg: 'bg-sky-50',
    iconColor: 'text-teal-600',
  },
]

const services = [
  {
    icon: PanelTop,
    title: 'Landing Pages',
    description: 'A single high-impact page to capture leads and showcase your services.',
    gradient: 'from-teal-600 to-teal-800',
  },
  {
    icon: Briefcase,
    title: 'Business Websites',
    description: 'Multi-page sites with CMS, lead capture forms, and CRM integration.',
    gradient: 'from-amber-600 to-amber-800',
  },
  {
    icon: MonitorSmartphone,
    title: 'Web Applications',
    description: 'Full-featured apps with dashboards, analytics, and payroll integration.',
    gradient: 'from-teal-600 to-teal-900',
  },
  {
    icon: Building2,
    title: 'Enterprise Solutions',
    description: 'Fully custom builds with dedicated support, unlimited features, and white-glove service.',
    gradient: 'from-stone-800 to-stone-600',
  },
]

const steps = [
  { number: '1', title: 'Choose Your Package', description: 'Pick from four tiers and customize with add-ons to match your needs and budget.', bg: 'bg-teal-700' },
  { number: '2', title: 'We Build It', description: 'Our team designs and develops your site with regular check-ins so it\'s exactly what you want.', bg: 'bg-amber-600' },
  { number: '3', title: 'Launch & Grow', description: 'Go live with ongoing support, analytics, and tools to help you scale your business.', bg: 'bg-stone-900' },
]

export default function WebsiteServicesPage() {
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [products, setProducts] = useState<MarketingProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (subscriptionsEnabled !== true) return

    fetch('/api/marketing/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data)
      })
      .catch((err) => logger.error('Failed to load marketing products:', err))
      .finally(() => setLoading(false))
  }, [subscriptionsEnabled])

  if (subscriptionsEnabled === null || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!subscriptionsEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">This feature is not available.</p>
      </div>
    )
  }

  const tiers = products.filter((p) => p.category === 'tier')
  const addons = products.filter((p) => p.category === 'addon')

  const handleGetStarted = () => {
    // Navigate to subscription signup — this integrates with the existing flow
    window.location.href = '/subscriber'
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-600 via-teal-800 to-stone-900 py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white/80 text-sm">
            <Rocket className="h-4 w-4 text-amber-500" />
            Built for Outside Sales Professionals
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
            Your Brand. Your Website.{'\n'}Built for You.
          </h1>
          <p className="text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
            Custom websites, apps, and digital tools designed to help you market your brand, capture leads, and manage your business online.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white px-9"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See Pricing
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-9"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest text-amber-600 font-mono">
              THE PROBLEM
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
              You&apos;re Losing Business Without a Digital Presence
            </h2>
            <p className="text-stone-500">
              In today&apos;s market, your prospects research you online before they ever pick up the phone.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {painPoints.map((point) => (
              <div
                key={point.title}
                className="p-8 rounded-xl border border-stone-200 bg-stone-50 space-y-4"
              >
                <div className={`w-12 h-12 rounded-lg ${point.iconBg} flex items-center justify-center`}>
                  <point.icon className={`h-6 w-6 ${point.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-stone-900">{point.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Build Section */}
      <section id="services" className="py-20 px-6 md:px-12 bg-stone-50">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest text-teal-700 font-mono">
              OUR SERVICES
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
              Everything You Need to Go Digital
            </h2>
            <p className="text-stone-500">
              From simple landing pages to full-featured web applications, we build it all.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="p-8 rounded-xl border border-stone-200 bg-white space-y-5"
              >
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${svc.gradient} flex items-center justify-center`}>
                  <svc.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">{svc.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{svc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest text-teal-700 font-mono">
              HOW IT WORKS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
              From Idea to Launch in 3 Simple Steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center space-y-5 p-8">
                <div className={`w-16 h-16 ${step.bg} rounded-full flex items-center justify-center mx-auto`}>
                  <span className="text-3xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900">{step.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <section id="pricing" className="py-20 px-6 md:px-12 bg-stone-50">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest text-amber-600 font-mono">
              PRICING
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
              Choose the Right Plan for Your Business
            </h2>
            <p className="text-stone-500">
              Select a tier, add features you need, and see your monthly total instantly.
            </p>
          </div>

          {tiers.length > 0 ? (
            <PricingCalculator
              tiers={tiers}
              addons={addons}
              onGetStarted={handleGetStarted}
            />
          ) : (
            <div className="text-center py-12 border rounded-xl">
              <p className="text-stone-500">
                Pricing plans are being configured. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-br from-teal-600 via-teal-800 to-stone-900 py-20 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Build Your Digital Presence?
          </h2>
          <p className="text-white/85 leading-relaxed">
            Join other CMP contractors who are growing their business with a professional website.
            Sign up through your existing account — no extra setup required.
          </p>
          <Button
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white px-10"
            onClick={handleGetStarted}
          >
            Get Started Today
            <span className="ml-2">→</span>
          </Button>
          <p className="text-sm text-white/50">No long-term contracts. Cancel anytime.</p>
        </div>
      </section>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/(portal)/subscriber/services/page.tsx
git commit -m "feat: add website services marketing page with dynamic pricing calculator"
```

---

### Task 7: Add Navigation Link to Subscriber Layout

**Files:**
- Modify: `src/app/(portal)/subscriber/layout.tsx`

The subscriber layout needs a link to the new services page. Check the existing layout and add a nav entry.

**Step 1: Update the subscriber layout**

Add the services page to the subscriber navigation. The layout currently just calls `requireSubscriber()` — if there's a nav component, add the link there. If not, the page is accessible via direct URL at `/subscriber/services`.

At minimum, ensure the route is accessible under the subscriber layout (it inherits `requireSubscriber()` auth gate automatically).

**Step 2: Verify the route works**

Run: `bun dev`
Navigate to: `http://localhost:3000/subscriber/services`
Expected: Marketing page renders with feature flag gate. If flag is enabled, shows full page. If no marketing products configured yet, shows "Pricing plans are being configured" fallback.

**Step 3: Commit**

```bash
git add src/app/(portal)/subscriber/layout.tsx
git commit -m "feat: ensure services page accessible under subscriber layout"
```

---

### Task 8: Seed Marketing Data for Testing

**Files:**
- Create: `src/lib/database/seeds/seed_marketing_products.sql`

This seed file populates the `product_marketing` table with the 4 tiers and 6 add-ons from the design. It assumes corresponding products and prices exist in the `products`/`prices` tables (they should be created via the admin UI or a separate seed).

**Step 1: Write the seed SQL**

```sql
-- Seed marketing data for website services page
-- Run AFTER products and prices exist in the database
-- This maps existing products to marketing presentation

-- Example: adjust product_id values to match your actual products table

-- Tiers
INSERT INTO product_marketing (product_id, category, tagline, feature_list, display_order, is_featured, badge_text)
VALUES
  (1, 'tier', 'Perfect for getting started with a professional online presence.',
   '["1 page", "Lead capture form", "Mobile responsive", "Email support"]',
   1, 0, NULL),
  (2, 'tier', 'The complete package for growing your brand and capturing leads.',
   '["Up to 5 pages", "3 custom features", "Basic CMS", "CRM integration", "Priority support"]',
   2, 1, 'MOST POPULAR'),
  (3, 'tier', 'Full-featured applications with dashboards, analytics, and integrations.',
   '["Up to 15 pages", "8 custom features", "Advanced CMS", "Analytics dashboard", "Dedicated support"]',
   3, 0, NULL),
  (4, 'tier', 'White-glove service with unlimited features and a dedicated account manager.',
   '["Unlimited pages", "Unlimited features", "Custom CMS + integrations", "Full analytics suite", "Dedicated account manager"]',
   4, 0, NULL)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  tagline = VALUES(tagline),
  feature_list = VALUES(feature_list),
  display_order = VALUES(display_order),
  is_featured = VALUES(is_featured),
  badge_text = VALUES(badge_text);

-- Add-ons
INSERT INTO product_marketing (product_id, category, tagline, feature_list, display_order, is_featured, icon_name)
VALUES
  (5, 'addon', NULL, '[]', 10, 0, 'shopping-cart'),
  (6, 'addon', NULL, '[]', 11, 0, 'search'),
  (7, 'addon', NULL, '[]', 12, 0, 'palette'),
  (8, 'addon', NULL, '[]', 13, 0, 'wallet'),
  (9, 'addon', NULL, '[]', 14, 0, 'trending-up'),
  (10, 'addon', NULL, '[]', 15, 0, 'share-2')
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  icon_name = VALUES(icon_name),
  display_order = VALUES(display_order);
```

Note: The `product_id` values (1-10) are placeholders. The implementer must first create the corresponding products via the admin UI at `/admin/billing/products`, then update the IDs in this seed file to match.

**Step 2: Commit**

```bash
git add src/lib/database/seeds/seed_marketing_products.sql
git commit -m "feat: add seed data for website services marketing products"
```

---

### Task 9: E2E Test — Website Services Page

**Files:**
- Create: `tests/website-services.spec.ts`

**Step 1: Write the E2E test**

```typescript
// tests/website-services.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Website Services Marketing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as a subscriber/employee user
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'employee@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|subscriber)/)
  })

  test('renders hero section and navigation', async ({ page }) => {
    await page.goto('/subscriber/services')
    await expect(page.getByText('Your Brand. Your Website.')).toBeVisible()
    await expect(page.getByText('See Pricing')).toBeVisible()
    await expect(page.getByText('Learn More')).toBeVisible()
  })

  test('renders pain points section', async ({ page }) => {
    await page.goto('/subscriber/services')
    await expect(page.getByText('No Online Credibility')).toBeVisible()
    await expect(page.getByText('Manual Document Sharing')).toBeVisible()
    await expect(page.getByText('No Lead Capture')).toBeVisible()
  })

  test('renders services section', async ({ page }) => {
    await page.goto('/subscriber/services')
    await expect(page.getByText('Landing Pages')).toBeVisible()
    await expect(page.getByText('Business Websites')).toBeVisible()
    await expect(page.getByText('Web Applications')).toBeVisible()
    await expect(page.getByText('Enterprise Solutions')).toBeVisible()
  })

  test('renders how it works section', async ({ page }) => {
    await page.goto('/subscriber/services')
    await expect(page.getByText('Choose Your Package')).toBeVisible()
    await expect(page.getByText('We Build It')).toBeVisible()
    await expect(page.getByText('Launch & Grow')).toBeVisible()
  })

  test('shows pricing section with fallback when no products configured', async ({ page }) => {
    await page.goto('/subscriber/services')
    // Either shows real pricing or the fallback message
    const pricingSection = page.locator('#pricing')
    await expect(pricingSection).toBeVisible()
  })

  test('shows feature unavailable when flag is disabled', async ({ page }) => {
    // This test depends on the feature flag being disabled for the test user
    // Skip if flag is enabled in test environment
    test.skip(true, 'Requires feature flag to be disabled for test user')
  })
})
```

**Step 2: Run E2E tests**

Run: `bun test:e2e tests/website-services.spec.ts`
Expected: Tests pass (hero, pain points, services, how it works sections all render).

**Step 3: Commit**

```bash
git add tests/website-services.spec.ts
git commit -m "test: add E2E tests for website services marketing page"
```

---

### Task 10: Final Integration Verification

**Step 1: Verify the full flow end-to-end**

1. Start dev server: `bun dev`
2. Sign in as admin at `/auth/signin` (admin@test.com / password123)
3. Go to `/admin/billing/products` — create the 4 tier products and 6 add-on products with appropriate prices
4. Run the marketing seed SQL (after updating product IDs)
5. Go to `/admin/feature-flags` — ensure `enable-subscriptions` is enabled
6. Sign in as an employee/subscriber user
7. Navigate to `/subscriber/services`
8. Verify: hero, pain points, services, how it works, and pricing calculator all render
9. Verify: clicking tier cards updates the selected state
10. Verify: toggling add-ons updates the running total
11. Verify: "Get Started" button navigates to subscriber dashboard

**Step 2: Run full test suite**

Run: `bun test && bun test:e2e`
Expected: All tests pass.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete website services marketing page with dynamic pricing calculator"
```
