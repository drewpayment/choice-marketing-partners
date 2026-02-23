// src/components/marketing/PricingCalculator.tsx
'use client'

import { useState, useMemo } from 'react'
import { Check, ArrowRight } from 'lucide-react'
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
  const iconMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
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
