# Stripe Billing Integration Design

**Date:** 2026-02-16
**Status:** Approved

## Overview

Add Stripe-powered billing to allow admin to charge independent contractors for subscription services and one-time implementation fees. Subscribers log in to view billing status, payment history, manage their profile, and access shared documents.

## Key Decisions

- **Stripe as source of truth** for all billing data. Local DB caches state via webhooks.
- **Admin-managed billing** — admin creates subscribers, assigns plans, triggers charges. Subscribers are read-only viewers.
- **Payment method collection via Stripe setup links** — no card data touches our server.
- **Flexible product catalog** — admin manages products/services with recurring, one-time, and custom fee types.
- **Flexible billing intervals** — monthly, quarterly, annual, or custom intervals per price.

## User Model

New `subscriber` role alongside existing employee/manager/admin roles.

- New `is_subscriber` flag in session (`session.user.isSubscriber`)
- A user CAN be both employee and subscriber (overlapping roles)
- New `subscribers` table for subscriber-specific data
- New `subscriber_user` junction table (mirrors `employee_user` pattern)
- Subscriber-only routes under `/subscriber/*`

Session extension:
```typescript
session.user = {
  ...existing fields,
  isSubscriber: boolean,
  subscriberId: number | null
}
```

## Database Schema

### `subscribers`

| Column | Type | Purpose |
|---|---|---|
| id | int AUTO_INCREMENT PK | Internal ID |
| stripe_customer_id | varchar(255) UNIQUE | Stripe customer reference |
| business_name | varchar(255) NULL | Contractor's business name |
| phone | varchar(50) NULL | Contact phone |
| address, city, state, postal_code | varchar | Business address |
| status | enum('active','past_due','canceled','paused') | Synced from Stripe |
| notes | text NULL | Admin notes |
| created_at, updated_at, deleted_at | timestamps | Standard audit fields |

### `subscriber_user` (junction)

| Column | Type | Purpose |
|---|---|---|
| subscriber_id | int FK → subscribers | |
| user_id | int FK → users | |

### `products` (admin-managed catalog)

| Column | Type | Purpose |
|---|---|---|
| id | int AUTO_INCREMENT PK | Internal ID |
| stripe_product_id | varchar(255) UNIQUE | Stripe product reference |
| name | varchar(255) | Display name |
| description | text NULL | Service description |
| type | enum('recurring','one_time','custom') | Billing type |
| is_active | tinyint(1) DEFAULT 1 | Soft active flag |
| created_at, updated_at | timestamps | |

### `prices` (linked to products, synced to Stripe)

| Column | Type | Purpose |
|---|---|---|
| id | int AUTO_INCREMENT PK | |
| product_id | int FK → products | |
| stripe_price_id | varchar(255) UNIQUE | Stripe price reference |
| amount_cents | int | Price in cents |
| currency | varchar(3) DEFAULT 'usd' | |
| interval | enum('month','quarter','year','one_time') | Billing frequency |
| interval_count | int DEFAULT 1 | e.g. 2 + month = every 2 months |
| is_active | tinyint(1) DEFAULT 1 | |
| created_at, updated_at | timestamps | |

### `subscriber_subscriptions` (local cache of Stripe subscriptions)

| Column | Type | Purpose |
|---|---|---|
| id | int AUTO_INCREMENT PK | |
| subscriber_id | int FK → subscribers | |
| stripe_subscription_id | varchar(255) UNIQUE | Stripe sub reference |
| product_id | int FK → products | |
| price_id | int FK → prices | |
| status | varchar(50) | Stripe status |
| current_period_start | datetime | |
| current_period_end | datetime | |
| cancel_at_period_end | tinyint(1) DEFAULT 0 | |
| created_at, updated_at | timestamps | |

### `payment_history` (webhook-populated, append-only)

| Column | Type | Purpose |
|---|---|---|
| id | int AUTO_INCREMENT PK | |
| subscriber_id | int FK → subscribers | |
| stripe_invoice_id | varchar(255) UNIQUE | |
| stripe_payment_intent_id | varchar(255) NULL | |
| amount_cents | int | |
| currency | varchar(3) | |
| status | varchar(50) | paid, failed, refunded |
| description | varchar(255) NULL | Line item summary |
| invoice_pdf_url | text NULL | Stripe-hosted PDF |
| paid_at | datetime NULL | |
| created_at | timestamp | |

## Stripe Integration

### Primitives Used

- **Customers** — one per subscriber
- **Products** — synced from local catalog
- **Prices** — synced from local prices (supports flexible intervals)
- **Subscriptions** — created when admin assigns a plan
- **Invoices** — auto-generated for subscriptions; standalone for one-time fees

### Admin Action → Stripe Flow

```
Admin creates product   → save to DB → stripe.products.create()
Admin creates price     → save to DB → stripe.prices.create()
Admin adds subscriber   → save to DB → stripe.customers.create()
Admin assigns plan      → stripe.subscriptions.create() → save locally
Admin adds impl fee     → stripe.invoiceItems.create() + stripe.invoices.create()
Admin sends setup link  → stripe.customer.createSetupIntent() → email link
```

### Webhook → App Flow (POST /api/webhooks/stripe)

```
invoice.paid                        → insert payment_history, update subscriber status
invoice.payment_failed              → insert payment_history, status → 'past_due'
customer.subscription.updated       → update subscriber_subscriptions
customer.subscription.deleted       → update subscriber_subscriptions, update status
setup_intent.succeeded              → log payment method attached
```

Webhook handler: signature-verified, idempotent (upsert on Stripe IDs), returns 200 quickly.

### Not Using

- Stripe Checkout (admin-managed, not self-service)
- Stripe Customer Portal (building our own subscriber view)
- Metered billing
- Coupons/discounts

## Application Structure

### New Repositories

- `SubscriberRepository.ts` — subscriber CRUD, user linking, status
- `ProductRepository.ts` — product/price catalog management
- `BillingRepository.ts` — subscriptions, payment history queries
- `StripeService.ts` — Stripe SDK wrapper (external service client)

### API Routes

**Admin:**
```
POST   /api/admin/subscribers                    — create subscriber + Stripe customer
GET    /api/admin/subscribers                    — list subscribers
GET    /api/admin/subscribers/[id]               — subscriber detail
PUT    /api/admin/subscribers/[id]               — update subscriber
POST   /api/admin/subscribers/[id]/setup-link    — send payment method setup email
POST   /api/admin/subscribers/[id]/charge        — one-time charge (impl fee)

POST   /api/admin/products                       — create product + sync to Stripe
GET    /api/admin/products                       — list products
PUT    /api/admin/products/[id]                  — update product
DELETE /api/admin/products/[id]                  — deactivate product
POST   /api/admin/products/[id]/prices           — create price for product

GET    /api/admin/subscriptions                  — list all subscriptions
POST   /api/admin/subscriptions                  — assign subscription to subscriber
DELETE /api/admin/subscriptions/[id]             — cancel subscription
```

**Subscriber:**
```
GET /api/subscriber/billing     — current subscriptions + status
GET /api/subscriber/payments    — payment history
GET /api/subscriber/profile     — subscriber profile
PUT /api/subscriber/profile     — update own profile
```

**Webhook:**
```
POST /api/webhooks/stripe       — Stripe event handler
```

### Pages

**Admin:**
```
/admin/subscribers              — subscriber list + management
/admin/subscribers/[id]         — subscriber detail (subs, payments, docs)
/admin/subscribers/new          — create subscriber form
/admin/products                 — product/price catalog management
```

**Subscriber portal:**
```
/subscriber/dashboard           — subscription status overview
/subscriber/payments            — payment history table
/subscriber/profile             — edit contact/business info
/subscriber/documents           — shared documents (reuses existing doc system)
```

### Navigation

- Admin sidebar: new "Billing" section with Subscribers and Products links
- Subscriber users: own sidebar with Dashboard, Payments, Profile, Documents
- Dual-role users (employee + subscriber): combined or switchable navigation

## Error Handling

| Scenario | Handling |
|---|---|
| Stripe API down on product create | Save to DB as `pending_sync`, manual retry |
| Webhook delivery fails | Stripe retries up to 3 days. Idempotent handlers |
| Payment fails | Stripe retry logic + dunning. Webhook updates status |
| No payment method on subscription create | Subscription starts as `incomplete` |
| Delete product with active subscriptions | Blocked — deactivation only |
| Duplicate webhook events | Upsert on Stripe IDs |

## Explicitly Deferred (YAGNI)

- Proration for mid-cycle plan changes (Stripe defaults sufficient)
- Tax calculation (Stripe Tax can be added later)
- Multi-currency (USD only)
- Refund UI (admin uses Stripe Dashboard)
- Billing email customization (Stripe defaults)
- Coupon/discount system
