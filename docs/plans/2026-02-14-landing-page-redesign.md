# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the root landing page (`/`) with the new Blue-Teal & Amber color system, modern layout, and deuteranopia-safe semantic colors while preserving all existing functionality (testimonials, blog feed, comma club, partnerships).

**Architecture:** Update CSS custom properties in `globals.css` to the new color tokens, then rewrite `src/app/page.tsx` with a modern component structure using existing shadcn/ui `Button` and `Card` components. Extract reusable landing page sections into separate components. Update `TestimonialSection` styling to match the new system.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, shadcn/ui, Lucide React icons, Geist font family

---

## Design System Reference

### Color Tokens (Blue-Teal & Amber, Deuteranopia-Safe)

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#0E7490` (cyan-700) | Main brand, links, active states |
| Primary Hover | `#0C6380` | Button/link hover states |
| Primary Foreground | `#FFFFFF` | Text on primary backgrounds |
| Secondary (Amber) | `#D97706` (amber-600) | CTA buttons, accent highlights |
| Secondary Hover | `#B45309` | Amber hover states |
| Destructive | `#DC2626` | Error states |
| Background | `#FAFAFA` (stone-50) | Page background |
| Surface | `#FFFFFF` | Cards, elevated surfaces |
| Muted | `#F5F5F4` (stone-100) | Section backgrounds |
| Border | `#E7E5E4` (stone-300) | Borders, dividers |
| Text Primary | `#1C1917` (stone-900) | Headings, body text |
| Text Secondary | `#78716C` (stone-500) | Supporting text |
| Text Muted | `#A8A29E` (stone-400) | Placeholders, captions |

### Accessibility Rules (Deuteranopia)
- Never use color alone as an indicator — always pair with icons or labels
- Primary blue-teal reads as clear blue to deuteranopes
- Secondary amber reads as yellow to deuteranopes
- Blue vs yellow is the safest high-contrast pair for red-green color blindness

### Typography
- Font: Geist (already configured)
- Hero headline: 56px/800 weight
- Section titles: 36px/700 weight
- Body: 16px/400 weight
- Labels/Tags: 12px/600 weight, uppercase, letter-spacing 2px

### Spacing & Radius
- Section padding: `py-20 px-4 sm:px-6 lg:px-8`
- Card radius: `rounded-xl` (12px)
- Button radius: `rounded-lg` (8px)
- Container max-width: `max-w-7xl`

---

## Pre-Implementation Notes

### Files That Will Be Modified
- `src/app/globals.css` — Update CSS custom properties to new color tokens
- `src/app/page.tsx` — Complete rewrite of landing page structure
- `src/components/testimonials/TestimonialSection.tsx` — Restyle to match new system

### Files That Will NOT Be Modified
- `src/app/layout.tsx` — No changes needed (Geist font already configured)
- `src/components/comma-club/CommaClubModal.tsx` — Internal modal, leave as-is for now
- `src/components/blog/BlogFeed.tsx` — Internal component, leave as-is for now
- `src/components/ui/button.tsx` — Works via CSS variables, will auto-update

### Key Behavior to Preserve
- Server-side data fetching for testimonials and blog posts
- Conditional rendering (authenticated vs unauthenticated hero)
- Comma Club modal integration (all 5 tiers)
- Partnership logos grid with external links
- Agent/Customer testimonials display
- Anchor link navigation (#incentives, #clients, etc.)

---

### Task 1: Update CSS Custom Properties

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update the `:root` CSS variables to the new color system**

Replace the `:root` block with new color tokens using oklch values that correspond to our hex palette. The key changes:
- Primary: dark slate-blue → cyan-700 (`#0E7490`)
- Secondary: light gray → amber-600 (`#D97706`)
- Background/surface: warm stone tones
- Border/muted: warm gray (stone) instead of cool slate

```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.985 0.002 75);
  --foreground: oklch(0.147 0.004 49.25);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.147 0.004 49.25);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.147 0.004 49.25);
  --primary: oklch(0.520 0.105 207);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.583 0.158 62);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.970 0.001 75);
  --muted-foreground: oklch(0.553 0.013 58);
  --accent: oklch(0.970 0.001 75);
  --accent-foreground: oklch(0.147 0.004 49.25);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.923 0.003 75);
  --input: oklch(0.923 0.003 75);
  --ring: oklch(0.520 0.105 207);
  --chart-1: oklch(0.520 0.105 207);
  --chart-2: oklch(0.583 0.158 62);
  --chart-3: oklch(0.577 0.245 27.325);
  --chart-4: oklch(0.696 0.17 162.48);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.147 0.004 49.25);
  --sidebar-foreground: oklch(0.985 0.002 75);
  --sidebar-primary: oklch(0.520 0.105 207);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.216 0.006 56.04);
  --sidebar-accent-foreground: oklch(0.985 0.002 75);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.520 0.105 207);
}
```

**Step 2: Update the `.dark` block similarly**

Update the dark mode variables to complement the new palette (dark backgrounds with teal/amber accents).

```css
.dark {
  --background: oklch(0.147 0.004 49.25);
  --foreground: oklch(0.985 0.002 75);
  --card: oklch(0.216 0.006 56.04);
  --card-foreground: oklch(0.985 0.002 75);
  --popover: oklch(0.216 0.006 56.04);
  --popover-foreground: oklch(0.985 0.002 75);
  --primary: oklch(0.520 0.105 207);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.583 0.158 62);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.216 0.006 56.04);
  --muted-foreground: oklch(0.553 0.013 58);
  --accent: oklch(0.216 0.006 56.04);
  --accent-foreground: oklch(0.985 0.002 75);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.520 0.105 207);
  --chart-1: oklch(0.520 0.105 207);
  --chart-2: oklch(0.583 0.158 62);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.147 0.004 49.25);
  --sidebar-foreground: oklch(0.985 0.002 75);
  --sidebar-primary: oklch(0.520 0.105 207);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.279 0.006 56.04);
  --sidebar-accent-foreground: oklch(0.985 0.002 75);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.520 0.105 207);
}
```

**Step 3: Verify the dev server runs without errors**

Run: `bun dev` and load `http://localhost:3000`
Expected: Page loads with updated colors throughout (all shadcn/ui components should automatically pick up the new primary/secondary)

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: update CSS custom properties to blue-teal & amber color system"
```

---

### Task 2: Rewrite the Landing Page

**Files:**
- Modify: `src/app/page.tsx`

This is the main task. We rewrite the landing page with the new design while preserving all existing functionality. The page keeps its server component nature and all data fetching.

**Step 1: Rewrite `src/app/page.tsx`**

The new structure:
1. **Sticky Navigation** — Logo left, anchor links center, Sign In button right
2. **Hero Section** — Teal gradient background, centered headline + subtitle, dual CTA buttons. Authenticated users see Comma Club + Blog Feed below in a card.
3. **Features Section** — "FEATURES" tag, section title, 4 feature cards in a grid (Payroll, Invoices, Documents, Team Management) with Lucide icons
4. **Agent Incentives Section** — Preserved from current page, restyled
5. **Testimonials Section** — Two-column layout, restyled cards
6. **Partnerships Section** — Logo grid, restyled
7. **CTA Section** — Dark teal gradient, centered headline + amber CTA button
8. **Footer** — Dark background, logo + links + copyright

```tsx
import { TestimonialRepository } from '@/lib/repositories/testimonials'
import { BlogRepository } from '@/lib/repositories/blog'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import CommaClubModal from '@/components/comma-club/CommaClubModal'
import TestimonialSection from '@/components/testimonials/TestimonialSection'
import BlogFeed from '@/components/blog/BlogFeed'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  FileText,
  FolderOpen,
  Users,
  ArrowRight,
  Sparkles,
  Trophy,
  Gift,
  Building2,
} from 'lucide-react'

export default async function HomePage() {
  const [testimonialRepo, blogRepo] = [new TestimonialRepository(), new BlogRepository()]
  const session = await getServerSession(authOptions)

  const [customers, agents, latestPosts] = await Promise.all([
    testimonialRepo.getCustomerTestimonials(),
    testimonialRepo.getAgentTestimonials(),
    blogRepo.getLatestPosts(1, 5),
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Choice Marketing Partners
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#incentives" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Incentives
            </a>
            <a href="#agent_testimonials" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Testimonials
            </a>
            <a href="#clients" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Partners
            </a>
          </div>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-700 via-cyan-800 to-cyan-950 py-24 text-white sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-600/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-cyan-100 backdrop-blur-sm">
              <Sparkles className="size-4" />
              Trusted by teams since 2005
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Payroll Management,{' '}
              <span className="text-amber-400">Simplified.</span>
            </h1>
            <p className="mb-10 text-lg text-cyan-100 sm:text-xl">
              Commissions, paystubs, invoices, and documents — all in one place.
              Built for marketing teams that move fast.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-amber-600 text-white shadow-lg hover:bg-amber-700">
                <Link href="/contact">
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>

          {/* Authenticated: Comma Club + Blog Feed */}
          {session && (
            <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-center text-2xl font-bold">Weekly Comma Club</h2>
                <div className="space-y-2 text-center">
                  {[4000, 3000, 2000, 1000, 500].map((amount) => (
                    <p key={amount}>
                      <CommaClubModal
                        amount={amount}
                        className="text-lg font-semibold text-cyan-200 transition-colors hover:text-white"
                      />
                    </p>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <p className="mb-3 text-sm text-cyan-200">
                    Interested in becoming a part of Choice Marketing Partners?
                  </p>
                  <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Link href="/contact">
                      <Users className="mr-2 size-4" />
                      Apply Now
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-xl bg-white p-6 text-foreground shadow-xl">
                <BlogFeed posts={latestPosts.posts} />
              </div>
            </div>
          )}

          {/* Unauthenticated: Comma Club */}
          {!session && (
            <div className="mx-auto mt-16 max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
              <h2 className="mb-4 text-2xl font-bold">Weekly Comma Club</h2>
              <div className="space-y-2">
                {[4000, 3000, 2000, 1000, 500].map((amount) => (
                  <p key={amount}>
                    <CommaClubModal
                      amount={amount}
                      className="text-lg font-semibold text-cyan-200 transition-colors hover:text-white"
                    />
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Features
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From payroll processing to document management, we&apos;ve got you covered.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2">
            {[
              {
                icon: DollarSign,
                title: 'Payroll & Commissions',
                description: 'Automated commission calculations, paystub generation, and payroll tracking for your entire team.',
                iconBg: 'bg-cyan-50 text-primary',
              },
              {
                icon: FileText,
                title: 'Invoice Management',
                description: 'Create, track, and manage invoices with automatic audit trails and paystub recalculation.',
                iconBg: 'bg-amber-50 text-amber-600',
              },
              {
                icon: FolderOpen,
                title: 'Document Storage',
                description: 'Secure cloud storage for all your team documents with role-based access control and easy sharing.',
                iconBg: 'bg-cyan-50 text-primary',
              },
              {
                icon: Users,
                title: 'Team Management',
                description: 'Manage employees, assign managers, track roles, and handle user permissions — all from one dashboard.',
                iconBg: 'bg-violet-50 text-violet-600',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-lg"
              >
                <div className={`mb-4 inline-flex size-12 items-center justify-center rounded-lg ${feature.iconBg}`}>
                  <feature.icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Incentives Section */}
      <section id="incentives" className="bg-muted py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Why Choose Us
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Agent Incentives
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Beyond normal salaries and commission opportunities, Choice Marketing Partners strives to be one of the most competitive compensatory energy affiliates in the industry. We believe that if we share profits with our people, they will work harder and be more likely to invest themselves in the organization. We regularly award Agents with daily cash incentives, weekly bonus opportunities through exceptional sales and customer service interactions, and big award contests like all-expense paid vacations, cars and even houses!
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: DollarSign, label: 'Commission & Incentives', color: 'text-primary bg-cyan-50' },
                { icon: Gift, label: 'Contest Awards', color: 'text-amber-600 bg-amber-50' },
                { icon: Trophy, label: 'Competitive Comp', color: 'text-violet-600 bg-violet-50' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center rounded-xl bg-card p-6 text-center shadow-sm">
                  <div className={`mb-3 inline-flex size-14 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="size-7" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Testimonials
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              What people are saying
            </h2>
          </div>
          <div className="grid gap-12 lg:grid-cols-2">
            <TestimonialSection
              title="Agents"
              testimonials={agents}
              id="agent_testimonials"
            />
            <TestimonialSection
              title="Customers"
              testimonials={customers}
              id="customer_testimonials"
            />
          </div>
        </div>
      </section>

      {/* Partnerships Section */}
      <section id="clients" className="bg-muted py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Our Network
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Partnerships
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {[
              { name: 'Santanna Energy', url: 'https://santannaenergyservices.com/', logo: '/images/clients/santanna.jpeg' },
              { name: 'Continuum Energy', url: 'https://continuumenergyservices.com/', logo: '/images/clients/continuum.jpg' },
              { name: 'Palmco Energy', url: 'https://palmcoenergy.com/', logo: '/images/clients/palmco.jpeg' },
              { name: 'AT&T', url: 'https://www.att.com/', logo: '/images/clients/att.png' },
              { name: 'Spectrum', url: 'https://www.spectrum.com/', logo: '/images/clients/charter.png' },
              { name: 'DirecTV', url: 'https://www.directv.com/', logo: '/images/clients/directv.png' },
            ].map((client) => (
              <a
                key={client.name}
                href={client.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Image
                  src={client.logo}
                  alt={client.name}
                  width={64}
                  height={64}
                  className="h-12 w-full object-contain transition-transform group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-cyan-900 via-cyan-800 to-cyan-950 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to simplify your payroll?
          </h2>
          <p className="mt-4 text-lg text-cyan-200">
            Join Choice Marketing Partners and take control of your commissions, paystubs, and documents.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="bg-amber-600 text-white shadow-lg hover:bg-amber-700">
              <Link href="/contact">
                Get Started Today
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-stone-400">
            Choice Marketing Partners
          </p>
          <div className="flex items-center gap-6">
            <Link href="/about-us" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              About Us
            </Link>
            <Link href="/blog" className="text-sm text-stone-500 transition-colors hover:text-stone-300">
              Blog
            </Link>
            <p className="text-sm text-stone-600">
              &copy; {new Date().getFullYear()} Choice Marketing Partners
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

**Step 2: Verify the page loads correctly**

Run: `bun dev` and load `http://localhost:3000`
Expected: Fully redesigned landing page with teal gradient hero, amber CTAs, feature cards, and all existing content preserved.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign landing page with blue-teal & amber color system"
```

---

### Task 3: Restyle TestimonialSection Component

**Files:**
- Modify: `src/components/testimonials/TestimonialSection.tsx`

**Step 1: Update the TestimonialSection component styling**

Replace the blue-600 header bar with the new primary color and update card styling to use design tokens.

```tsx
import { TestimonialData } from '@/lib/repositories/testimonials'

interface TestimonialSectionProps {
  title: string
  testimonials: TestimonialData[]
  id: string
}

export default function TestimonialSection({ title, testimonials, id }: TestimonialSectionProps) {
  return (
    <section id={id}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="bg-primary px-6 py-4">
          <h2 className="text-center text-xl font-bold text-primary-foreground">{title}</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.id} className="rounded-lg bg-muted p-4">
                <blockquote className={index % 2 === 0 ? 'text-left' : 'text-right'}>
                  <p className="mb-2 text-sm italic text-muted-foreground">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <footer className="text-xs text-muted-foreground/70">
                    &mdash; {testimonial.location}
                  </footer>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Verify testimonials render correctly**

Load `http://localhost:3000` and scroll to the testimonials section.
Expected: Testimonials show with teal header bar, warm gray cards, proper spacing.

**Step 3: Commit**

```bash
git add src/components/testimonials/TestimonialSection.tsx
git commit -m "feat: restyle TestimonialSection with new design system tokens"
```

---

### Task 4: Visual Review and Polish

**Files:**
- Possibly modify: `src/app/page.tsx` (minor tweaks only)

**Step 1: Test responsive breakpoints**

Load the page at various viewport widths:
- Mobile (375px): Hero should stack, navigation should hide links, feature cards should be single column
- Tablet (768px): Feature cards 2-column, partnerships 3-column
- Desktop (1440px): Full layout with all columns

**Step 2: Test authenticated vs unauthenticated views**

- Sign out → verify hero shows "Join Our Success Story" equivalent (now "Payroll Management, Simplified.") with Comma Club card below
- Sign in → verify Comma Club + Blog Feed appear in 2-column layout below hero

**Step 3: Test all interactive elements**

- Click Comma Club amounts → modal should open (modal keeps existing styling)
- Click partner logos → should open in new tab
- Click Sign In button → should navigate to /auth/signin
- Click anchor links (Features, Incentives, Testimonials, Partners) → smooth scroll to sections

**Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: complete landing page redesign with visual polish"
```

---

## Summary of Changes

| File | Change Type | Description |
|------|------------|-------------|
| `src/app/globals.css` | Modified | Updated CSS custom properties from slate-blue to blue-teal & amber |
| `src/app/page.tsx` | Rewritten | Modern landing page with sticky nav, teal gradient hero, feature cards, CTA, footer |
| `src/components/testimonials/TestimonialSection.tsx` | Restyled | Updated from hardcoded blue-600 to design system tokens |

**What's preserved:**
- All server-side data fetching (testimonials, blog posts)
- Conditional auth rendering (Comma Club + Blog Feed)
- Partnership logos with external links
- All existing routes and anchor links
- CommaClubModal integration (5 tiers)

**What's new:**
- Sticky navigation with backdrop blur
- Teal gradient hero with sparkle badge
- Amber "Get Started" CTA buttons (deuteranopia-safe contrast)
- Feature cards with Lucide icons
- CTA section with dark teal gradient
- Proper footer with About Us / Blog links
- Consistent use of CSS custom properties (auto-updates all shadcn/ui components)
