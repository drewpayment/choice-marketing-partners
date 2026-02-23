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
import type { MarketingProduct } from '@/lib/repositories/ProductMarketingRepository'

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
  { number: '2', title: 'We Build It', description: "Our team designs and develops your site with regular check-ins so it's exactly what you want.", bg: 'bg-amber-600' },
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
      .catch((err) => console.error('Failed to load marketing products:', err))
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
              onGetStarted={() => handleGetStarted()}
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
