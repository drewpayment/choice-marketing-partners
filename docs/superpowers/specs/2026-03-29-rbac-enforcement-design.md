# Role-Based Access Control Enforcement Design

**Date**: 2026-03-29
**Status**: Draft
**Author**: Jon (PM agent)

## Problem

The application has inconsistent role-based access control. PayrollRepository correctly filters data by user role, but most other repositories (Employee, Invoice, Document, Vendor, Audit) return all records to any authenticated caller regardless of role. Additionally, ~10 admin pages rely on client-side-only auth checks that can be bypassed.

This is a payroll system handling sensitive compensation data. Unauthorized data exposure is unacceptable.

## Approach

**Dual-layer enforcement (Approach C)**:
1. **Repository layer** (hard gate) — every repository method that touches protected data requires a `UserContext` parameter and enforces access rules internally. Unauthorized reads return empty results; unauthorized writes throw errors.
2. **API route / page layer** (fast gate) — every API route and page checks the user's role before calling repositories. Rejects early with 401/403 for unauthorized requests.

This follows the pattern already proven by PayrollRepository + payroll API routes.

## Role Hierarchy

| Role | Description | Determination |
|------|-------------|---------------|
| SuperAdmin | Feature flag management only | `isSuperAdmin` session flag |
| Admin | Full system access | `is_admin` on employees table |
| Manager | Own data + direct reports | `is_mgr` + `manager_employees` table |
| Employee | Own data only | Base authenticated user |
| Subscriber | Billing portal only | Separate `isSubscriber` flag |

**Access cascade**: Admin > Manager > Employee. Admins inherit all lower-level access. Managers inherit employee-level access.

## Section 1: Shared UserContext Type

Create `src/lib/auth/types.ts`:

```typescript
export interface UserContext {
  employeeId?: number
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin?: boolean
  isSubscriber?: boolean
  subscriberId?: number
  managedEmployeeIds?: number[]
}
```

- `getEmployeeContext()` in `payroll-access.ts` is the canonical builder for this type
- All repositories and access checks use this single type
- `managedEmployeeIds` is populated once per request, not per query

## Section 2: Repository Access Rules

### EmployeeRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| `getEmployees()` | All employees | Self + direct reports | Self only |
| `getEmployeeById()` | Any employee | Self + direct reports | Self only |
| `searchEmployees()` | All | Self + direct reports | Self only |
| `createEmployee()` | Allowed | Throw error | Throw error |
| `updateEmployee()` | Allowed | Throw error | Throw error |
| `softDeleteEmployee()` | Allowed | Throw error | Throw error |

### InvoiceRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| `getInvoicePageResources()` | All agents/vendors | Direct reports' agents/vendors | Throw error |
| `getInvoiceDetail()` | Any agent | Direct reports only | Throw error |
| `saveInvoiceData()` | Any | Direct reports only | Throw error |
| `deleteInvoice()` | Allowed | Throw error | Throw error |

### DocumentRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| `getDocuments()` | All | All | All |
| `getDocumentById()` | Any | Any | Any |
| `createDocument()` | Allowed | Throw error | Throw error |
| `updateDocument()` | Allowed | Throw error | Throw error |
| `deleteDocuments()` | Allowed | Throw error | Throw error |

Documents are viewable by all authenticated users. Edit/delete is admin-only. Private document filtering is deferred to a future iteration.

### InvoiceAuditRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| All read methods | Full access | Throw error | Throw error |

### VendorRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| All methods | Full access | Throw error | Throw error |

### VendorFieldRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| All methods | Full access | Throw error | Throw error |

### ManagerEmployeeRepository

| Method | Admin | Manager | Employee |
|--------|-------|---------|----------|
| All read/write methods | Full access | Throw error | Throw error |

### BillingRepository (partial)

| Method | Admin | Subscriber (own) | Others |
|--------|-------|-------------------|--------|
| `getSubscriptionsBySubscriber()` | All | Own only | Throw error |
| `getPaymentHistory()` | All | Own only | Throw error |
| `getSubscriptionByStripeId()` | Unchanged (webhook) | — | — |
| `getPaymentByInvoiceId()` | Unchanged (webhook) | — | — |

The two unprotected methods are called by the Stripe webhook handler which authenticates via signature verification. Adding UserContext would break webhook processing.

## Section 3: API Route & Page Protection

### API Route Changes

| Route | Current Check | Required Check |
|-------|--------------|----------------|
| `GET/PUT/DELETE /api/employees/[id]` | `isAdmin` | No change needed |
| `GET /api/documents` | Authenticated | Authenticated + pass `userContext` to repo |
| `POST/PATCH/DELETE /api/documents/[id]` | Authenticated | **Change to `isAdmin`** |
| `GET /api/invoices` | Manager\|Admin | Manager\|Admin + pass `userContext` for filtering |
| `POST /api/invoices` | Authenticated | **Change to Manager\|Admin** + validate agent access |
| `GET /api/invoices/search` | Manager\|Admin | Manager\|Admin + **implement manager-employee filtering** |
| `GET /api/invoices/audit/[invoiceId]` | Manager\|Admin | **Change to Admin only** |
| `GET /api/debug/env` | NODE_ENV only | **Add `isAdmin` check** |

All other admin/vendor/override routes already have correct admin-only checks.

**Note on dual-layer overlap**: Some repository methods (e.g., `EmployeeRepository.getEmployeeById()`) support manager/employee filtering even though their primary API routes are admin-only. This is intentional — repositories may be called from multiple contexts (API routes, server components, other repositories), and the repository layer must enforce access regardless of how it's called.

### Page-Level Changes

10 admin pages with client-side-only auth need server-side protection. For `'use client'` pages, add a server-side wrapper `page.tsx` that calls `requireAuth('ADMIN')` and renders the client component:

| Page | Fix |
|------|-----|
| `/admin/feature-flags` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/invoice-search` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/payroll-monitoring` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/settings` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/tools` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/vendors` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/billing/subscribers` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/billing/subscribers/[id]` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/billing/subscribers/new` | Server-side `requireAuth('ADMIN')` wrapper |
| `/admin/billing/products` | Server-side `requireAuth('ADMIN')` wrapper |

### Middleware

No `middleware.ts` will be added in this phase. The dual-layer approach (route + repository) provides sufficient protection. Middleware can be a future hardening step.

## Section 4: Test Data & Test Strategy

### Test Account Relationships

Existing test accounts:
- `admin@test.com` — admin role
- `manager@test.com` — manager role
- `employee@test.com` — employee role

Required setup: Insert a `manager_employees` record linking manager's employee ID to employee's employee ID. This will be done via a test fixture/seed that runs before E2E tests.

### Test Layers

**Layer 1: Unit tests (Jest)** — Test each repository method with admin/manager/employee UserContext. Verify filtering and error behavior.

**Layer 2: API route tests (Jest/integration)** — Test HTTP status codes (200/401/403) per role per endpoint.

**Layer 3: E2E browser tests (Playwright + agent-browser)** — Log in as each role, attempt restricted pages, verify redirects and no data leakage.

### Test Cases

#### Employee Role (most restricted)

| # | Test | Expected |
|---|------|----------|
| E1 | Navigate to `/admin/employees` | Redirect to `/forbidden` |
| E2 | `GET /api/employees` | 403 |
| E3 | Navigate to `/admin/vendors` | Redirect to `/forbidden` |
| E4 | Navigate to `/admin/invoice-search` | Redirect to `/forbidden` |
| E5 | View `/payroll` | See own payroll data only |
| E6 | `GET /api/employees/[other-id]` | 403 |
| E7 | View `/documents` | See all docs, read-only (no edit/delete buttons) |
| E8 | `DELETE /api/documents/[id]` | 403 |
| E9 | `GET /api/invoices` | 403 |
| E10 | `GET /api/invoices/audit/[id]` | 403 |

#### Manager Role (scoped to direct reports)

| # | Test | Expected |
|---|------|----------|
| M1 | Navigate to `/admin/employees` | Redirect to `/forbidden` |
| M2 | View `/payroll` | See self + direct reports only |
| M3 | View `/invoices` | See direct reports' invoices only |
| M4 | `GET /api/employees/[non-report-id]` | 403 |
| M5 | Navigate to `/admin/vendors` | Redirect to `/forbidden` |
| M6 | `GET /api/invoices/audit/[id]` | 403 |
| M7 | View `/documents` | See all docs, read-only |
| M8 | `POST /api/overrides/employees` | 403 |
| M9 | `GET /api/invoices` with non-report agent | Empty/filtered results |

#### Admin Role (full access, positive tests)

| # | Test | Expected |
|---|------|----------|
| A1 | View all employees | Full list |
| A2 | CRUD vendors | All operations succeed |
| A3 | View audit trails | Full history |
| A4 | Edit/delete documents | Allowed |
| A5 | View all invoices | Full access |

#### Cross-Cutting

| # | Test | Expected |
|---|------|----------|
| X1 | Unauthenticated API calls | 401 on all protected routes |
| X2 | Employee direct-hits admin API routes | 403 |
| X3 | Soft-deleted employee session | Should not have access (future hardening) |

## Out of Scope

- Private document flag (`is_private`) — deferred to future iteration
- Next.js middleware.ts file — deferred to future hardening
- Soft-deleted employee session invalidation — noted as future work (X3)
- `BillingRepository` webhook methods — protected by Stripe signature verification, not user sessions
