# Website Services Marketing Page — Design Doc

**Date:** 2026-02-23
**Status:** Approved

## Overview

A long-form marketing page selling custom website/app development services to CMP contractors (outside sales reps) who already use the payroll platform. Signup flows through the existing subscriptions feature. The page is gated behind the **subscriptions feature flag**.

## Target Audience

Outside sales professionals who are CMP contractors, paid through the web app. They need digital presence tools (websites, apps) to market their personal brand and acquire leads.

## Page Structure

### 1. Navigation
Reuse existing landing page nav bar.

### 2. Hero Section
- Headline: "Your Brand, Your Website. Built for You."
- Subtext about digital presence for sales professionals
- Primary CTA "See Pricing" (scrolls to calculator)
- Secondary CTA "Learn More"

### 3. Pain Points Section
3-column grid showing problems outside sales reps face:
- No online credibility / professional presence
- Manual document sharing and payroll management
- No lead capture or digital marketing tools

### 4. What We Build Section
Visual showcase of the 4 service types with icons and descriptions:
- Landing Pages
- Business Websites
- Web Applications
- Enterprise Solutions

### 5. How It Works
3-step process: Choose Your Package → We Build It → Launch & Grow

### 6. Interactive Pricing Calculator (Centerpiece)

#### 4 Tiers

| | Landing Page | Business Site | Web App | Enterprise |
|---|---|---|---|---|
| **Price** | $799/mo | $1,499/mo | $2,999/mo | Custom |
| **Pages** | 1 | Up to 5 | Up to 15 | Unlimited |
| **Custom Features** | 0 | 3 included | 8 included | Unlimited |
| **CMS** | — | Basic | Advanced | Custom |
| **Lead Capture** | Form only | + CRM integration | + Analytics | Full suite |
| **Support** | Email | Priority | Dedicated | Account Mgr |

#### Add-ons (toggleable, adjust running total)
- E-commerce store (+$299/mo)
- SEO optimization package (+$199/mo)
- Custom branding & design (+$499 one-time)
- Payroll portal integration (+$149/mo)
- Analytics dashboard (+$99/mo)
- Social media integration (+$79/mo)

The calculator displays a running total that updates as users select a tier and toggle add-ons.

### 7. Social Proof
Testimonials or trust badges from existing contractors.

### 8. Final CTA
"Get Started Today" — routes to subscriptions signup.

### 9. Footer
Reuse existing footer.

## Design System

- **Consistent brand extension** of existing CMP design: teal/amber palette, Geist fonts, same visual language
- Uses existing design variables ($primary, $secondary, $surface, etc.)
- 1440px wide frame in redesign.pen

## Access Control

- Page gated behind the **subscriptions feature flag**
- Only visible to authenticated contractors with the flag enabled

## Implementation Notes

- Design frame added to `docs/redesign.pen` alongside existing screens
- Frontend implementation as a Next.js page under the portal routes
- Calculator is client-side interactive (React state for tier selection + add-on toggles)
- Subscription signup integrates with existing Stripe billing flow
