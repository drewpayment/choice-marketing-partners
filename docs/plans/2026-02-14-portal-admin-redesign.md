# Portal & Admin Section Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all hardcoded Tailwind color classes across the portal and admin sections with design system tokens, and polish the employee dashboard layout with shadcn/ui Card components and Lucide icons for a cohesive, modern, deuteranopia-safe experience.

**Architecture:** Systematic token replacement across 3 tiers: (1) shared layout components (ProtectedLayout, ClientNavigation, AdminSidebar, AdminMainContent, AdminBreadcrumb), (2) employee dashboard layout upgrade with shadcn Cards + icons, (3) bulk sweep of remaining portal/admin pages. All changes use existing CSS custom properties from `globals.css` — no new tokens needed.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4 with oklch CSS variables, shadcn/ui (Card, Badge, Button), Lucide React icons

---

## Design Token Reference

These CSS variables are already defined in `src/app/globals.css`. Use the corresponding Tailwind classes:

| Hardcoded Class | Replace With | Notes |
|----------------|-------------|-------|
| `text-gray-900` | `text-foreground` | Headings, primary text |
| `text-gray-800` | `text-foreground` | Same as above |
| `text-gray-700` | `text-foreground` | Or `text-muted-foreground` for secondary |
| `text-gray-600` | `text-muted-foreground` | Supporting text |
| `text-gray-500` | `text-muted-foreground` | Captions, labels |
| `text-gray-400` | `text-muted-foreground` | Icons, placeholders |
| `bg-gray-50` | `bg-muted` | Section backgrounds |
| `bg-gray-100` | `bg-muted` | Same |
| `bg-gray-200` | `bg-muted` | Skeletons, progress track |
| `bg-white` | `bg-card` | Cards, surfaces, panels |
| `border-gray-200` | `border-border` | Standard borders |
| `border-gray-300` | `border-border` | Same |
| `hover:bg-gray-50` | `hover:bg-muted` | Hover states |
| `hover:bg-gray-100` | `hover:bg-muted` | Same |
| `hover:text-gray-700` | `hover:text-foreground` | Hover text |
| `hover:border-gray-300` | `hover:border-border` | Hover borders |
| `text-blue-600` | `text-primary` | Active/brand color |
| `text-blue-700` | `text-primary` | Same |
| `bg-blue-50` | `bg-primary/10` | Light primary tint |
| `bg-blue-600` | `bg-primary` | Primary backgrounds |
| `border-blue-500` | `border-primary` | Active indicators |
| `hover:text-blue-600` | `hover:text-primary` | Hover brand |
| `hover:bg-blue-50` | `hover:bg-primary/10` | Hover tint |
| `text-green-500` | `text-primary` | Success (pair with icon) |
| `text-green-600` | `text-primary` | Success (pair with icon) |
| `text-green-800` | `text-primary` | Success text |
| `bg-green-100` | `bg-primary/10` | Success background |
| `text-red-500` | `text-destructive` | Error (pair with icon) |
| `text-red-600` | `text-destructive` | Error text |
| `text-red-800` | `text-destructive` | Error text |
| `bg-red-100` | `bg-destructive/10` | Error background |
| `hover:text-red-700` | `hover:text-destructive` | Error hover |
| `hover:bg-red-50` | `hover:bg-destructive/10` | Error hover bg |
| `bg-yellow-50` | `bg-secondary/10` | Warning backgrounds |
| `border-yellow-200` | `border-secondary/30` | Warning borders |
| `text-yellow-600` | `text-secondary` | Warning icons |
| `text-yellow-700` | `text-secondary` | Warning text |
| `text-yellow-800` | `text-secondary` | Warning headings |
| `bg-gray-900/80` | `bg-black/60` | Overlays |

### Accessibility Rules
- **Never use color alone** — all status indicators already have icons; just swap the colors
- Success = `text-primary` + CheckCircle icon
- Error = `text-destructive` + AlertCircle/XCircle icon
- Warning = `text-secondary` + AlertTriangle icon

---

## Task 1: Shared Layout Components (ProtectedLayout, ClientNavigation)

**Files:**
- Modify: `src/components/layout/ProtectedLayout.tsx:12`
- Modify: `src/components/layout/ClientNavigation.tsx:64-158`

**Step 1: Update ProtectedLayout**

In `src/components/layout/ProtectedLayout.tsx`, replace:
```tsx
<div className="min-h-screen bg-gray-50">
```
with:
```tsx
<div className="min-h-screen bg-background">
```

**Step 2: Update ClientNavigation — desktop nav bar**

In `src/components/layout/ClientNavigation.tsx`:

Replace the nav wrapper (line 64):
```tsx
<nav className="bg-white shadow">
```
with:
```tsx
<nav className="bg-card border-b border-border">
```

Replace logo text (line 70):
```tsx
<Link href="/dashboard" className="text-xl font-bold text-gray-900">
```
with:
```tsx
<Link href="/dashboard" className="text-xl font-bold text-foreground">
```

Replace active route classes (line 86):
```tsx
? "border-blue-500 text-blue-600"
: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
```
with:
```tsx
? "border-primary text-primary"
: "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
```

Replace user info text (line 101):
```tsx
<span className="text-sm text-gray-700">
```
with:
```tsx
<span className="text-sm text-muted-foreground">
```

Replace SignOutButton classes (line 104):
```tsx
className='border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left'
```
with:
```tsx
className='border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left'
```

Replace mobile hamburger button (line 113):
```tsx
className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
```
with:
```tsx
className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
```

**Step 3: Update ClientNavigation — mobile menu**

Replace mobile active route classes (line 144-145):
```tsx
? "bg-blue-50 border-blue-500 text-blue-700"
: "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
```
with:
```tsx
? "bg-primary/10 border-primary text-primary"
: "border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground"
```

Replace mobile SignOutButton classes (line 153):
```tsx
className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left"
```
with:
```tsx
className="border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left"
```

**Step 4: Verify the build compiles**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/layout/ProtectedLayout.tsx src/components/layout/ClientNavigation.tsx
git commit -m "style: replace hardcoded color classes with design tokens in portal layout components"
```

---

## Task 2: Admin Layout Components (AdminSidebar, AdminMainContent, AdminBreadcrumb, admin layout)

**Files:**
- Modify: `src/app/(portal)/admin/layout.tsx:24`
- Modify: `src/components/admin/AdminMainContent.tsx:21`
- Modify: `src/components/admin/AdminBreadcrumb.tsx:45-56`
- Modify: `src/components/admin/AdminSidebar.tsx:81-206`

**Step 1: Update admin layout.tsx**

In `src/app/(portal)/admin/layout.tsx`, replace:
```tsx
<div className="bg-gray-50">
```
with:
```tsx
<div className="bg-background">
```

**Step 2: Update AdminMainContent**

In `src/components/admin/AdminMainContent.tsx`, replace:
```tsx
<div className="border-b bg-white px-6 py-4">
```
with:
```tsx
<div className="border-b border-border bg-card px-6 py-4">
```

**Step 3: Update AdminBreadcrumb**

In `src/components/admin/AdminBreadcrumb.tsx`:

Replace chevron icon class (line 45):
```tsx
<ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
```
with:
```tsx
<ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
```

Replace link classes (line 50):
```tsx
className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
```
with:
```tsx
className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
```

Replace current page span (line 55):
```tsx
<span className="text-sm font-medium text-gray-900">
```
with:
```tsx
<span className="text-sm font-medium text-foreground">
```

**Step 4: Update AdminSidebar — mobile**

In `src/components/admin/AdminSidebar.tsx`:

Mobile menu button bar (line 81):
```tsx
<div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
```
with:
```tsx
<div className="sticky top-0 z-40 flex items-center gap-x-6 bg-card px-4 py-4 shadow-sm sm:px-6 lg:hidden">
```

Mobile button text (line 84):
```tsx
className="-m-2.5 p-2.5 text-gray-700"
```
with:
```tsx
className="-m-2.5 p-2.5 text-foreground"
```

Mobile title (line 90):
```tsx
<div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Admin Panel</div>
```
with:
```tsx
<div className="flex-1 text-sm font-semibold leading-6 text-foreground">Admin Panel</div>
```

Mobile overlay (line 96):
```tsx
<div className="fixed inset-0 bg-gray-900/80" onClick={() => setIsMobileOpen(false)} />
```
with:
```tsx
<div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileOpen(false)} />
```

Mobile sidebar panel (line 109):
```tsx
<div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
```
with:
```tsx
<div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-2">
```

Mobile sidebar title (line 111):
```tsx
<h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
```
with:
```tsx
<h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
```

Mobile nav item active/inactive (lines 125-127):
```tsx
isActive
  ? 'bg-gray-50 text-blue-600'
  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
```
with:
```tsx
isActive
  ? 'bg-primary/10 text-primary'
  : 'text-muted-foreground hover:text-primary hover:bg-muted'
```

**Step 5: Update AdminSidebar — desktop**

Desktop sidebar container (line 148-149):
```tsx
'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col border-r border-gray-200 bg-white transition-all duration-300',
```
with:
```tsx
'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col border-r border-border bg-card transition-all duration-300',
```

Desktop title (line 155):
```tsx
<h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
```
with:
```tsx
<h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
```

Desktop nav item active/inactive (lines 182-184):
```tsx
isActive
  ? 'bg-gray-50 text-blue-600'
  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
```
with:
```tsx
isActive
  ? 'bg-primary/10 text-primary'
  : 'text-muted-foreground hover:text-primary hover:bg-muted'
```

Desktop description text (line 192):
```tsx
<span className="text-xs text-gray-500 font-normal truncate">
```
with:
```tsx
<span className="text-xs text-muted-foreground font-normal truncate">
```

**Step 6: Verify build**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/app/(portal)/admin/layout.tsx src/components/admin/AdminMainContent.tsx src/components/admin/AdminBreadcrumb.tsx src/components/admin/AdminSidebar.tsx
git commit -m "style: replace hardcoded colors with design tokens in admin layout components"
```

---

## Task 3: Employee Dashboard Layout Polish

**Files:**
- Modify: `src/app/(portal)/dashboard/page.tsx` (full rewrite)
- Modify: `src/app/(portal)/dashboard/home/page.tsx` (full rewrite — mirrors dashboard/page.tsx)

**Step 1: Rewrite dashboard/page.tsx with shadcn Cards and Lucide icons**

Replace the entire contents of `src/app/(portal)/dashboard/page.tsx` with:

```tsx
import { requireAuth } from '@/lib/auth/utils'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, FolderOpen, FileText, Shield, CheckCircle, XCircle } from 'lucide-react'

export default async function PortalDashboard() {
  const session = await requireAuth()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {session.user.name}!
          </h1>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-medium text-foreground">{session.user.email}</p>
              </div>
              {(session.user.isAdmin || session.user.isManager) && (
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="text-lg font-medium text-foreground">{session.user.employeeId || 'N/A'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-lg font-medium text-foreground">
                  {session.user.isAdmin ? 'Administrator' :
                   session.user.isManager ? 'Manager' : 'Employee'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {session.user.isActive ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/payroll">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">View Payroll</h3>
                      <p className="text-sm text-muted-foreground mt-1">Access your paystubs and payroll history</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documents">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Documents</h3>
                      <p className="text-sm text-muted-foreground mt-1">Upload and manage your documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {(session.user.isManager || session.user.isAdmin) && (
              <Link href="/invoices">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">Manage Invoices</h3>
                        <p className="text-sm text-muted-foreground mt-1">Edit and manage pay statements</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {session.user.isAdmin && (
              <Link href="/admin">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">Admin Portal</h3>
                        <p className="text-sm text-muted-foreground mt-1">Access administrative tools and settings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-secondary/30 bg-secondary/5">
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-secondary mb-2">Debug Info (Development)</h3>
              <pre className="text-xs text-muted-foreground overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Update dashboard/home/page.tsx**

Apply the same rewrite to `src/app/(portal)/dashboard/home/page.tsx` — this is a duplicate of the dashboard page. Use the exact same code as above.

**Step 3: Verify build**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/(portal)/dashboard/page.tsx src/app/(portal)/dashboard/home/page.tsx
git commit -m "style: upgrade employee dashboard with shadcn Cards, Lucide icons, and design tokens"
```

---

## Task 4: Admin Dashboard Token Swap

**Files:**
- Modify: `src/app/(portal)/admin/page.tsx:36-205`

**Step 1: Replace hardcoded colors in admin page**

In `src/app/(portal)/admin/page.tsx`:

Replace skeleton classes (line 36, 37, 38 — three instances):
```tsx
<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
```
All `bg-gray-200` → `bg-muted`

Replace quick action icon color (line 158):
```tsx
<action.icon className="h-8 w-8 text-blue-600" />
```
with:
```tsx
<action.icon className="h-8 w-8 text-primary" />
```

Replace activity status icons (lines 202-205):
```tsx
<CheckCircle className="h-4 w-4 text-green-600" />
```
with:
```tsx
<CheckCircle className="h-4 w-4 text-primary" />
```

```tsx
<AlertCircle className="h-4 w-4 text-red-600" />
```
with:
```tsx
<AlertCircle className="h-4 w-4 text-destructive" />
```

**Step 2: Verify build**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(portal)/admin/page.tsx
git commit -m "style: replace hardcoded colors with design tokens in admin dashboard"
```

---

## Task 5: Admin Sub-Pages Token Sweep

**Files:**
- Modify: `src/app/(portal)/admin/tools/page.tsx`
- Modify: `src/app/(portal)/admin/settings/page.tsx`
- Modify: `src/app/(portal)/admin/payroll-monitoring/page.tsx`
- Modify: `src/app/(portal)/admin/invoice-search/page.tsx`
- Modify: `src/app/(portal)/admin/vendors/page.tsx`
- Modify: `src/app/(portal)/admin/employees/page.tsx`

**Step 1: Update admin/tools/page.tsx**

Replace all hardcoded color classes using the token reference table:

| Find | Replace |
|------|---------|
| `text-gray-500` | `text-muted-foreground` |
| `text-blue-500` | `text-primary` |
| `text-green-500` | `text-primary` |
| `text-red-500` | `text-destructive` |
| `bg-gray-200` | `bg-muted` |
| `bg-blue-600` | `bg-primary` |
| `bg-yellow-50` | `bg-secondary/10` |
| `border-yellow-200` | `border-secondary/30` |
| `text-yellow-600` | `text-secondary` |
| `text-yellow-800` | `text-secondary` |
| `text-yellow-700` | `text-secondary` |
| `bg-gray-50` | `bg-muted` |
| `text-red-600` (in error spans) | `text-destructive` |

**Step 2: Update admin/settings/page.tsx**

| Find | Replace |
|------|---------|
| `bg-blue-50` | `bg-primary/10` |
| `bg-gray-50` | `bg-muted` |
| `hover:bg-gray-100` | `hover:bg-muted` |
| `text-gray-500` | `text-muted-foreground` |
| `text-red-600` | `text-destructive` |
| `hover:text-red-700` | `hover:text-destructive` |
| `hover:bg-red-50` | `hover:bg-destructive/10` |

**Step 3: Update remaining admin sub-pages**

Apply the same token reference table replacements to:
- `admin/payroll-monitoring/page.tsx`
- `admin/invoice-search/page.tsx`
- `admin/vendors/page.tsx`
- `admin/employees/page.tsx`

Use the master replacement table from the Design Token Reference section at the top of this plan.

**Step 4: Verify build**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/app/(portal)/admin/
git commit -m "style: replace hardcoded colors with design tokens across all admin sub-pages"
```

---

## Task 6: Portal Pages Token Sweep

**Files:**
- Modify: `src/app/(portal)/payroll/page.tsx`
- Modify: `src/app/(portal)/payroll/[employeeId]/[vendorId]/[issueDate]/loading.tsx`
- Modify: `src/app/(portal)/invoices/page.tsx`
- Modify: `src/app/(portal)/invoices/new/page.tsx`
- Modify: `src/app/(portal)/invoices/detail/[...params]/page.tsx`
- Modify: `src/components/payroll/PayrollList.tsx`
- Modify: `src/components/payroll/PaystubDetailView.tsx`
- Modify: `src/components/payroll/PayrollFilters.tsx`
- Modify: `src/components/invoice/InvoiceList.tsx`
- Modify: `src/components/invoice/PaystubManagementList.tsx`
- Modify: `src/components/invoice/InvoiceEditor.tsx`
- Modify: `src/components/invoice/InvoiceOverridesTable.tsx`
- Modify: `src/components/invoice-audit/InvoiceAuditHistory.tsx`
- Modify: `src/components/documents/DocumentList.tsx`
- Modify: `src/components/documents/DocumentUpload.tsx`
- Modify: `src/components/documents/DocumentsPageClient.tsx`
- Modify: `src/components/overrides/ManagerAssignmentInterface.tsx`
- Modify: `src/components/employees/EmployeeForm.tsx`

**Step 1: Sweep all portal component files**

Apply the master replacement table from the Design Token Reference section. For each file:
1. Replace all `text-gray-*` with `text-foreground` or `text-muted-foreground` (use foreground for headings/primary text, muted-foreground for labels/secondary)
2. Replace all `bg-gray-*` with `bg-muted` or `bg-card`
3. Replace all `border-gray-*` with `border-border`
4. Replace all `text-blue-*` / `bg-blue-*` with `text-primary` / `bg-primary` or `bg-primary/10`
5. Replace all `text-green-*` / `bg-green-*` with `text-primary` / `bg-primary/10`
6. Replace all `text-red-*` / `bg-red-*` with `text-destructive` / `bg-destructive/10`
7. Replace all `hover:bg-gray-*` with `hover:bg-muted`
8. Replace all `hover:text-gray-*` with `hover:text-foreground`
9. Replace all `yellow-*` variants with `secondary` variants

**Step 2: Verify build**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(portal)/payroll/ src/app/(portal)/invoices/ src/components/payroll/ src/components/invoice/ src/components/invoice-audit/ src/components/documents/ src/components/overrides/ src/components/employees/
git commit -m "style: replace hardcoded colors with design tokens across portal pages and components"
```

---

## Task 7: Remaining Pages Token Sweep (Auth, Blog, Static)

**Files:**
- Modify: `src/components/auth/SignInForm.tsx`
- Modify: `src/app/auth/signin/page.tsx`
- Modify: `src/app/auth/forgot-password/page.tsx`
- Modify: `src/app/auth/reset-password/page.tsx`
- Modify: `src/components/blog/BlogFeed.tsx`
- Modify: `src/app/blog/page.tsx`
- Modify: `src/app/blog/[slug]/page.tsx`
- Modify: `src/app/blog/user/[id]/page.tsx`
- Modify: `src/app/about-us/page.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/forbidden/page.tsx`
- Modify: `src/app/manager/page.tsx`
- Modify: `src/app/manager/dashboard/page.tsx`
- Modify: `src/components/comma-club/CommaClubModal.tsx`
- Modify: `src/components/excel-import/ColumnMapper.tsx`
- Modify: `src/components/excel-import/ExcelImportDialog.tsx`
- Modify: `src/components/excel-import/WorksheetSelector.tsx`
- Modify: `src/components/excel-import/DateFormatSelector.tsx`
- Modify: `src/components/excel-import/ImportPreview.tsx`
- Modify: `src/components/excel-import/BatchSalesUpload.tsx`

**Step 1: Sweep all remaining files**

Apply the master replacement table from the Design Token Reference section. Same rules as Task 6.

**Step 2: Verify build**

Run: `bun build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/auth/ src/app/auth/ src/components/blog/ src/app/blog/ src/app/about-us/ src/app/not-found.tsx src/app/forbidden/ src/app/manager/ src/components/comma-club/ src/components/excel-import/
git commit -m "style: replace hardcoded colors with design tokens across auth, blog, and remaining pages"
```

---

## Task 8: Final Verification & Cleanup

**Step 1: Verify no hardcoded colors remain**

Run a grep to confirm all hardcoded color classes are gone (excluding `src/components/ui/` which are shadcn internals):

```bash
grep -r --include="*.tsx" -l "text-gray-\|bg-gray-\|text-blue-\|bg-blue-\|border-blue-\|text-green-\|bg-green-\|text-red-\|bg-red-\|bg-yellow-\|text-yellow-" src/ | grep -v "src/components/ui/" | grep -v "src/app/page.tsx"
```

Expected: No results (or only intentional exceptions like orange in the system config notice)

**Step 2: Production build**

Run: `bun build`
Expected: Build succeeds with no errors

**Step 3: Visual spot-check**

Start dev server and verify:
1. Portal navigation bar uses teal active state
2. Employee dashboard shows Cards with icons
3. Admin sidebar uses teal active/hover states
4. Admin dashboard icons are teal (not blue)
5. Status badges have icons alongside colors

**Step 4: Update roadmap**

Add entry to `docs/roadmap.md` under "In Progress" or "Completed":

```markdown
### Portal & Admin Section Redesign
- **Plan:** [2026-02-14-portal-admin-redesign](plans/2026-02-14-portal-admin-redesign.md)
- **Status:** Done
- **Summary:** Replaced all hardcoded Tailwind color classes with design system tokens across 50+ files. Upgraded employee dashboard with shadcn Card components and Lucide icons. Established consistent Blue-Teal & Amber color system across the entire portal and admin section.
- **Key deliverables:**
  - Design token replacement across 52 files (580+ class instances)
  - Employee dashboard upgraded with shadcn Cards and Lucide icons
  - ClientNavigation restyled with design tokens
  - AdminSidebar restyled with design tokens
  - All admin sub-pages using consistent design tokens
  - Deuteranopia-safe status indicators (color + icon pairs)
```

**Step 5: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: update roadmap with portal & admin redesign completion"
```
