# Mobile Employee UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize mobile experience for employees viewing payroll data with functional navigation, simplified filters, card-based layouts, and collapsible detail views.

**Architecture:** Mobile-first responsive design using Tailwind breakpoints (md: 768px). Role-based rendering for employees vs managers/admins. Pure frontend changes with no database modifications.

**Tech Stack:** Next.js 15 App Router, React Server Components, TypeScript, Tailwind CSS, shadcn/ui

---

## Task 1: Fix Hamburger Menu Navigation

**Files:**
- Modify: `src/components/layout/ClientNavigation.tsx`

**Problem:** Hamburger menu button doesn't work - menu always visible, no toggle functionality.

**Step 1: Add useState import**

Line 1-3, add useState to imports:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
```

**Step 2: Add mobile menu state**

Line 19 (after `const pathname = usePathname()`):

```typescript
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
```

**Step 3: Update hamburger button with toggle handler**

Replace lines 108-118:

```typescript
{/* Mobile menu button */}
<div className="sm:hidden flex items-center">
  <button
    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
    aria-expanded={isMobileMenuOpen}
  >
    <span className="sr-only">{isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
    {isMobileMenuOpen ? (
      <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : (
      <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    )}
  </button>
</div>
```

**Step 4: Add conditional rendering to mobile menu**

Replace lines 122-146:

```typescript
{/* Mobile menu */}
{isMobileMenuOpen && (
  <div className="sm:hidden">
    <div className="pt-2 pb-3 space-y-1">
      {menuItems.map((item) => {
        const isActive = isActiveRoute(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors",
              isActive
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            {item.label}
          </Link>
        )
      })}
      <SignOutButton className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left">
        Sign Out
      </SignOutButton>
    </div>
  </div>
)}
```

**Step 5: Test in browser**

```bash
bun dev
```

- Open http://localhost:3000/dashboard
- Resize to mobile width (< 640px)
- Expected: Menu should be hidden by default
- Click hamburger: Menu should slide open, icon changes to X
- Click X: Menu should close
- Click menu item: Menu should close and navigate

**Step 6: Commit**

```bash
git add src/components/layout/ClientNavigation.tsx
git commit -m "fix: add functional hamburger menu toggle for mobile navigation"
```

---

## Task 2: Hide Employee ID on Dashboard for Employees

**Files:**
- Modify: `src/app/(portal)/dashboard/page.tsx`

**Problem:** Employee ID shown to all users but irrelevant to employees.

**Step 1: Wrap Employee ID in conditional**

Replace lines 23-26:

```typescript
{(session.user.isAdmin || session.user.isManager) && (
  <div>
    <p className="text-sm text-gray-600">Employee ID</p>
    <p className="text-lg font-medium">{session.user.employeeId || 'N/A'}</p>
  </div>
)}
```

**Step 2: Test in browser**

```bash
bun dev
```

- Login as employee (employee@test.com / password123)
- Navigate to /dashboard
- Expected: Employee ID field NOT visible
- Logout, login as manager (manager@test.com / password123)
- Expected: Employee ID field IS visible

**Step 3: Commit**

```bash
git add src/app/(portal)/dashboard/page.tsx
git commit -m "feat: hide employee ID field from employee users on dashboard"
```

---

## Task 3: Add Quick Filter Presets for Employees

**Files:**
- Modify: `src/components/payroll/PayrollFilters.tsx`
- Modify: `src/app/(portal)/payroll/page.tsx`

### Step 1: Update PayrollFilters props interface

Line 12-21, add userContext:

```typescript
interface PayrollFiltersProps {
  initialFilters: {
    employeeId?: number
    vendorId?: number
    issueDate?: string
    startDate?: string
    endDate?: string
    status?: string
  }
  userContext?: {
    isAdmin: boolean
    isManager: boolean
  }
}
```

### Step 2: Add quickFilter state

Line 27 (after filters state):

```typescript
const [quickFilter, setQuickFilter] = useState<string>('all')
```

### Step 3: Add quick filter handler function

After handleFilterChange function (around line 89):

```typescript
const handleQuickFilter = (preset: string) => {
  setQuickFilter(preset)

  const now = new Date()
  let startDate = ''
  let endDate = now.toISOString().split('T')[0]

  switch(preset) {
    case 'last30':
      const date30 = new Date()
      date30.setDate(date30.getDate() - 30)
      startDate = date30.toISOString().split('T')[0]
      break
    case 'last90':
      const date90 = new Date()
      date90.setDate(date90.getDate() - 90)
      startDate = date90.toISOString().split('T')[0]
      break
    case 'thisYear':
      startDate = `${new Date().getFullYear()}-01-01`
      break
    case 'all':
    default:
      startDate = ''
      endDate = ''
  }

  const params = new URLSearchParams(searchParams)
  if (startDate) {
    params.set('startDate', startDate)
    params.set('endDate', endDate)
  } else {
    params.delete('startDate')
    params.delete('endDate')
  }

  router.push(`/payroll?${params.toString()}`)
}
```

### Step 4: Replace filter grid with role-based rendering

Replace lines 113-228 with:

```typescript
{/* Employee-only Quick Filters */}
{!userContext?.isAdmin && !userContext?.isManager ? (
  <div className="space-y-4">
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">
        Time Period
      </Label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={quickFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('all')}
        >
          All Time
        </Button>
        <Button
          variant={quickFilter === 'last30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('last30')}
        >
          Last 30 Days
        </Button>
        <Button
          variant={quickFilter === 'last90' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('last90')}
        >
          Last 90 Days
        </Button>
        <Button
          variant={quickFilter === 'thisYear' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('thisYear')}
        >
          This Year
        </Button>
      </div>
    </div>
  </div>
) : (
  /* Manager/Admin Full Filters */
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Employee Filter */}
      <div>
        <Label htmlFor="employee" className="text-sm font-medium text-gray-700">
          Employee
        </Label>
        <TypeaheadSelect
          options={[
            { key: '', value: 'All Employees' },
            ...agents.map(agent => ({
              key: String(agent.id),
              value: `${agent.name} (${agent.sales_id1})`
            }))
          ]}
          value={String(filters.employeeId || '')}
          onValueChange={(value) => handleFilterChange('employeeId', String(value || ''))}
          placeholder="All Employees"
          className="mt-1"
        />
      </div>

      {/* Vendor Filter */}
      <div>
        <Label htmlFor="vendor" className="text-sm font-medium text-gray-700">
          Vendor
        </Label>
        <Select
          value={String(filters.vendorId || 'all')}
          onValueChange={(value) => handleFilterChange('vendorId', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={String(vendor.id)}>
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Issue Date Filter */}
      <div>
        <Label htmlFor="issueDate" className="text-sm font-medium text-gray-700">
          Issue Date
        </Label>
        <Select
          value={filters.issueDate || 'all'}
          onValueChange={(value) => handleFilterChange('issueDate', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All Dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            {issueDates.map((date) => (
              <SelectItem key={date} value={date}>
                {formatDate(date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div>
        <Label htmlFor="status" className="text-sm font-medium text-gray-700">
          Status
        </Label>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Date Range Filters */}
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
          Start Date
        </Label>
        <Input
          type="date"
          id="startDate"
          value={filters.startDate || ''}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
          End Date
        </Label>
        <Input
          type="date"
          id="endDate"
          value={filters.endDate || ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  </>
)}
```

### Step 5: Pass userContext from payroll page

File: `src/app/(portal)/payroll/page.tsx`

Replace line 125-128:

```typescript
<PayrollFilters
  initialFilters={filters}
  userContext={{ isAdmin: session.user.isAdmin, isManager: session.user.isManager }}
/>
```

### Step 6: Test in browser

```bash
bun dev
```

- Login as employee@test.com
- Navigate to /payroll
- Expected: See only 4 quick filter buttons (All Time, Last 30 Days, Last 90 Days, This Year)
- Click "Last 30 Days": URL should update with startDate/endDate params
- Data should filter to last 30 days
- Login as manager@test.com
- Expected: See full filter grid with all dropdowns and date inputs

### Step 7: Commit

```bash
git add src/components/payroll/PayrollFilters.tsx src/app/(portal)/payroll/page.tsx
git commit -m "feat: add quick filter presets for employee payroll filtering"
```

---

## Task 4: Create Mobile Card Layout for Employee Payroll List

**Files:**
- Modify: `src/components/payroll/PayrollList.tsx`

### Step 1: Add cn utility import

Line 7, add cn import:

```typescript
import { cn } from '@/lib/utils'
```

### Step 2: Wrap existing table in desktop-only div

Replace line 159 `<div className="overflow-x-auto">` with:

```typescript
{/* Desktop Table View */}
<div className="hidden md:block overflow-x-auto">
```

Close the div after the table ends (before pagination section, around line 320).

### Step 3: Add mobile card view for employees

After the desktop table closing div, add:

```typescript
{/* Mobile Card View (Employees Only) */}
{!userContext.isAdmin && !userContext.isManager && (
  <div className="md:hidden space-y-3 p-4">
    {sortedData.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-gray-500">No payroll data found</p>
      </div>
    ) : (
      sortedData.map((item) => (
        <Link
          key={`${item.employeeId}-${item.vendorId}-${item.issueDate}`}
          href={`/payroll/${item.employeeId}/${item.vendorId}/${item.issueDate}?returnUrl=${encodeURIComponent(buildReturnUrl())}`}
          className="block"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50">
            {/* Vendor Name - Primary */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {item.vendorName}
              </h3>
              <svg
                className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Issue Date */}
            <div className="text-sm text-gray-600 mb-3">
              {formatDate(item.issueDate)}
            </div>

            {/* Net Pay - Highlighted */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">Net Pay</span>
              <span className={`text-xl font-bold ${item.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.netPay)}
              </span>
            </div>
          </div>
        </Link>
      ))
    )}
  </div>
)}

{/* Mobile Table Fallback (Managers/Admins on Mobile) */}
{(userContext.isAdmin || userContext.isManager) && (
  <div className="md:hidden overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-sm">Employee</TableHead>
          <TableHead className="text-sm">Vendor</TableHead>
          <TableHead className="text-right text-sm">Net Pay</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((item) => (
          <TableRow key={`${item.employeeId}-${item.vendorId}-${item.issueDate}`}>
            <TableCell className="font-medium text-sm">
              {item.employeeName}
            </TableCell>
            <TableCell className="text-sm">{item.vendorName}</TableCell>
            <TableCell className="text-right">
              <Link
                href={`/payroll/${item.employeeId}/${item.vendorId}/${item.issueDate}?returnUrl=${encodeURIComponent(buildReturnUrl())}`}
                className="text-sm font-medium text-blue-600"
              >
                {formatCurrency(item.netPay)}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)}
```

### Step 4: Update footer for mobile

Replace lines 382-402:

```typescript
{/* Summary - Responsive */}
<div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
  {/* Mobile Summary (Employees) */}
  {!userContext.isAdmin && !userContext.isManager && (
    <div className="md:hidden flex justify-between items-center text-sm text-gray-600">
      <span>Total Entries: {data.length}</span>
      <span className="font-medium">
        Page Net Pay: {formatCurrency(data.reduce((sum, item) => sum + item.netPay, 0))}
      </span>
    </div>
  )}

  {/* Desktop Summary (All) & Mobile Summary (Managers/Admins) */}
  <div className={cn(
    "justify-between items-center text-sm text-gray-600",
    !userContext.isAdmin && !userContext.isManager ? "hidden md:flex" : "flex"
  )}>
    <span>
      Page Entries: {data.length}
    </span>
    <div className="flex flex-wrap gap-4">
      <span className="hidden lg:inline">
        Page Sales: {formatCurrency(data.reduce((sum, item) => sum + item.totalSales, 0))}
      </span>
      <span className="hidden lg:inline">
        Page Overrides: {formatCurrency(data.reduce((sum, item) => sum + item.totalOverrides, 0))}
      </span>
      <span className="hidden lg:inline">
        Page Expenses: {formatCurrency(data.reduce((sum, item) => sum + item.totalExpenses, 0))}
      </span>
      <span className="font-medium">
        Page Net Pay: {formatCurrency(data.reduce((sum, item) => sum + item.netPay, 0))}
      </span>
    </div>
  </div>
</div>
```

### Step 5: Test in browser

```bash
bun dev
```

- Login as employee@test.com
- Navigate to /payroll
- Resize to mobile (< 768px)
- Expected: Card-based layout with vendor name, date, net pay
- Cards should be easily tappable
- Footer shows only "Total Entries" and "Page Net Pay"
- Resize to desktop (≥ 768px)
- Expected: Full table view appears
- Login as manager@test.com on mobile
- Expected: Simplified table (not cards)

### Step 6: Commit

```bash
git add src/components/payroll/PayrollList.tsx
git commit -m "feat: add mobile card layout for employee payroll list"
```

---

## Task 5: Optimize Paystub Detail View for Mobile

**Files:**
- Modify: `src/components/payroll/PaystubDetailView.tsx`

### Step 1: Add cn utility import

Line 6, add after existing imports:

```typescript
import { cn } from '@/lib/utils'
```

### Step 2: Add collapsible state

Line 85 (after formatCurrency function):

```typescript
const [isSalesExpanded, setIsSalesExpanded] = useState(true)
const [isOverridesExpanded, setIsOverridesExpanded] = useState(false)
const [isExpensesExpanded, setIsExpensesExpanded] = useState(false)
```

### Step 3: Add CollapsibleSection component

After formatDateForInvoiceRoute function (around line 103):

```typescript
interface CollapsibleSectionProps {
  title: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

const CollapsibleSection = ({ title, count, isExpanded, onToggle, children }: CollapsibleSectionProps) => (
  <Card>
    <CardHeader
      className="cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex justify-between items-center">
        <CardTitle className="flex items-center text-base md:text-lg">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-500">({count})</span>
        </CardTitle>
        <svg
          className={cn(
            "h-5 w-5 text-gray-400 transition-transform",
            isExpanded ? "rotate-180" : ""
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </CardHeader>
    {isExpanded && (
      <CardContent>
        {children}
      </CardContent>
    )}
  </Card>
)
```

### Step 4: Add sticky mobile header

Replace lines 167-255 with:

```typescript
{/* Sticky Mobile Header */}
<div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 p-4 shadow-sm mb-4">
  <Link href={returnUrl || "/payroll"}>
    <Button variant="ghost" size="sm" className="mb-2 -ml-2">
      <ArrowLeft className="h-4 w-4 mr-1" />
      Back
    </Button>
  </Link>
  <div className="flex justify-between items-start">
    <div>
      <h2 className="font-semibold text-gray-900">{paystub.vendor.name}</h2>
      <p className="text-sm text-gray-600">{formatDate(paystub.issueDate)}</p>
    </div>
    <div className="text-right">
      <div className={`text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatCurrency(paystub.totals.netPay)}
      </div>
      <Badge variant={paystub.isPaid ? 'default' : 'secondary'} className="text-xs mt-1">
        {paystub.isPaid ? 'Paid' : 'Unpaid'}
      </Badge>
    </div>
  </div>
</div>

{/* Desktop Header */}
<div className="hidden md:block">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <Link href={returnUrl || "/payroll"}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payroll
        </Button>
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Paystub Details
        </h1>
        <p className="text-sm text-gray-500">
          {paystub.employee.name} - {paystub.vendor.name} - {formatDate(paystub.issueDate)}
        </p>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGeneratePDF}
        disabled={isGeneratingPDF}
      >
        <Download className="h-4 w-4 mr-2" />
        {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
      </Button>
      {(userContext.isAdmin || userContext.isManager) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendEmail}
          disabled={isSendingEmail}
        >
          <Mail className="h-4 w-4 mr-2" />
          {isSendingEmail ? 'Sending...' : 'Send Email'}
        </Button>
      )}
      {userContext.isAdmin && !paystub.isPaid && (
        <Link
          href={`/invoices/detail/${paystub.employee.id}/${paystub.vendor.id}/${formatDateForInvoiceRoute(paystub.issueDate)}${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
        >
          <Button
            variant="outline"
            size="sm"
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Invoice
          </Button>
        </Link>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
        className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
      >
        <Printer className="h-4 w-4 mr-2" />
        Print Version
      </Button>

      {userContext.isAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
              console.log('Delete invoice:', {
                employeeId: paystub.employee.id,
                vendorId: paystub.vendor.id,
                issueDate: paystub.issueDate
              })
            }
          }}
          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Invoice
        </Button>
      )}
    </div>
  </div>
</div>

{/* Mobile Action Buttons */}
<div className="md:hidden grid grid-cols-2 gap-2 px-4 mb-4">
  <Button
    variant="outline"
    onClick={handleGeneratePDF}
    disabled={isGeneratingPDF}
    className="w-full"
  >
    <Download className="h-4 w-4 mr-2" />
    {isGeneratingPDF ? 'Loading...' : 'Download'}
  </Button>
  <Button
    variant="outline"
    onClick={() => window.print()}
    className="w-full"
  >
    <Printer className="h-4 w-4 mr-2" />
    Print
  </Button>
</div>
```

### Step 5: Update summary cards for mobile

Replace lines 257-316:

```typescript
{/* Summary Cards - Responsive Grid */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
  <Card>
    <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
      <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Sales</CardTitle>
    </CardHeader>
    <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
      <div className="text-lg md:text-2xl font-bold text-green-600">
        {formatCurrency(paystub.totals.sales)}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {paystub.sales.length} transaction(s)
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
      <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Overrides</CardTitle>
    </CardHeader>
    <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
      <div className="text-lg md:text-2xl font-bold text-blue-600">
        {formatCurrency(paystub.totals.overrides)}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {paystub.overrides.length} override(s)
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
      <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Expenses</CardTitle>
    </CardHeader>
    <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
      <div className="text-lg md:text-2xl font-bold text-red-600">
        {formatCurrency(paystub.totals.expenses)}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {paystub.expenses.length} expense(s)
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
      <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Net Pay</CardTitle>
    </CardHeader>
    <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
      <div className={`text-lg md:text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatCurrency(paystub.totals.netPay)}
      </div>
      <div className="flex items-center mt-1">
        <Badge variant={paystub.isPaid ? 'default' : 'secondary'} className="text-xs">
          {paystub.isPaid ? 'Paid' : 'Unpaid'}
        </Badge>
      </div>
    </CardContent>
  </Card>
</div>
```

### Step 6: Hide employee/vendor cards on mobile

Replace lines 318-377 with:

```typescript
{/* Employee and Vendor Info - Desktop Only */}
<div className="hidden md:grid md:grid-cols-2 gap-6">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <FileText className="h-5 w-5 mr-2" />
        Employee Information
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Name:</span>
        <span className="text-sm">{paystub.employee.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Email:</span>
        <span className="text-sm">{paystub.employee.email}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Agent ID:</span>
        <span className="text-sm">{paystub.employee.sales_id1}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Status:</span>
        <Badge variant={paystub.employee.is_active ? 'default' : 'secondary'}>
          {paystub.employee.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <FileText className="h-5 w-5 mr-2" />
        Vendor Information
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Name:</span>
        <span className="text-sm">{paystub.vendor.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Vendor ID:</span>
        <span className="text-sm">{paystub.vendor.id}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Issue Date:</span>
        <span className="text-sm">{formatDate(paystub.issueDate)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">Status:</span>
        <Badge variant={paystub.vendor.is_active ? 'default' : 'secondary'}>
          {paystub.vendor.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    </CardContent>
  </Card>
</div>
```

### Step 7: Replace sales/overrides/expenses with collapsible sections

Replace lines 379-484 with:

```typescript
{/* Sales Transactions */}
{paystub.sales.length > 0 && (
  <CollapsibleSection
    title="Sales Transactions"
    count={paystub.sales.length}
    isExpanded={isSalesExpanded}
    onToggle={() => setIsSalesExpanded(!isSalesExpanded)}
  >
    <div className="overflow-x-auto -mx-2 md:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm">Invoice</TableHead>
            <TableHead className="hidden md:table-cell text-xs md:text-sm">Customer</TableHead>
            <TableHead className="hidden sm:table-cell text-xs md:text-sm">Location</TableHead>
            <TableHead className="text-xs md:text-sm">Date</TableHead>
            <TableHead className="text-right text-xs md:text-sm">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paystub.sales.map((sale) => (
            <TableRow key={sale.invoice_id}>
              <TableCell className="font-medium text-xs md:text-sm">#{sale.invoice_id}</TableCell>
              <TableCell className="hidden md:table-cell text-xs md:text-sm">
                {sale.first_name} {sale.last_name}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs md:text-sm">
                {sale.address && `${sale.address}, `}{sale.city}
              </TableCell>
              <TableCell className="text-xs md:text-sm">{formatDate(sale.sale_date.toISOString().split('T')[0])}</TableCell>
              <TableCell className="text-right font-medium text-xs md:text-sm">
                {formatCurrency(sale.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CollapsibleSection>
)}

{/* Overrides */}
{paystub.overrides.length > 0 && (
  <CollapsibleSection
    title="Override Commissions"
    count={paystub.overrides.length}
    isExpanded={isOverridesExpanded}
    onToggle={() => setIsOverridesExpanded(!isOverridesExpanded)}
  >
    <div className="overflow-x-auto -mx-2 md:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm">ID</TableHead>
            <TableHead className="text-xs md:text-sm">Name</TableHead>
            <TableHead className="text-right text-xs md:text-sm">Sales</TableHead>
            <TableHead className="text-right hidden sm:table-cell text-xs md:text-sm">Commission</TableHead>
            <TableHead className="text-right text-xs md:text-sm">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paystub.overrides.map((override) => (
            <TableRow key={override.ovrid}>
              <TableCell className="font-medium text-xs md:text-sm">#{override.ovrid}</TableCell>
              <TableCell className="text-xs md:text-sm">{override.name}</TableCell>
              <TableCell className="text-right text-xs md:text-sm">{formatCurrency(override.sales)}</TableCell>
              <TableCell className="text-right hidden sm:table-cell text-xs md:text-sm">{override.commission}</TableCell>
              <TableCell className="text-right font-medium text-xs md:text-sm">
                {formatCurrency(override.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CollapsibleSection>
)}

{/* Expenses */}
{paystub.expenses.length > 0 && (
  <CollapsibleSection
    title="Expenses"
    count={paystub.expenses.length}
    isExpanded={isExpensesExpanded}
    onToggle={() => setIsExpensesExpanded(!isExpensesExpanded)}
  >
    <div className="overflow-x-auto -mx-2 md:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm">ID</TableHead>
            <TableHead className="text-xs md:text-sm">Type</TableHead>
            <TableHead className="hidden md:table-cell text-xs md:text-sm">Notes</TableHead>
            <TableHead className="text-right text-xs md:text-sm">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paystub.expenses.map((expense) => (
            <TableRow key={expense.expid}>
              <TableCell className="font-medium text-xs md:text-sm">#{expense.expid}</TableCell>
              <TableCell className="text-xs md:text-sm">{expense.type}</TableCell>
              <TableCell className="hidden md:table-cell text-xs md:text-sm">{expense.notes}</TableCell>
              <TableCell className="text-right font-medium text-green-600 text-xs md:text-sm">
                {formatCurrency(expense.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CollapsibleSection>
)}
```

### Step 8: Test in browser

```bash
bun dev
```

- Login as employee@test.com
- Navigate to /payroll and click a paystub
- On mobile (< 768px):
  - Expected: Sticky header with vendor, date, net pay at top
  - 2-column summary cards
  - Download and Print buttons (full width, 2 columns)
  - Sales section expanded by default
  - Overrides/Expenses collapsed
  - Tap to expand/collapse
  - Employee/Vendor info cards hidden
- On desktop (≥ 768px):
  - Expected: Full desktop layout unchanged

### Step 9: Commit

```bash
git add src/components/payroll/PaystubDetailView.tsx
git commit -m "feat: add mobile-optimized paystub detail view with collapsible sections"
```

---

## Final Testing & Verification

### Step 1: Run full test suite

```bash
bun test
```

Expected: All existing tests should pass (no breaking changes)

### Step 2: Run E2E tests

```bash
bun test:e2e
```

Expected: All E2E tests should pass

### Step 3: Manual cross-browser testing

Test in Chrome, Safari (iOS), Firefox:
- Hamburger menu toggle
- Quick filters functionality
- Card navigation
- Collapsible sections
- Touch target sizes (min 44x44px)

### Step 4: Performance check

```bash
bun build
bun start
```

Open Chrome DevTools:
- Lighthouse mobile score should be > 90
- No layout shift (CLS < 0.1)
- Fast load time (< 2s on 3G)

### Step 5: Final commit

If all tests pass:

```bash
git add .
git commit -m "test: verify mobile UX improvements across all browsers"
```

---

## Success Criteria

✅ Hamburger menu toggles correctly on mobile
✅ Employee ID hidden from employee users
✅ Employees see only quick filter presets
✅ Employees see card layout on mobile (< 768px)
✅ Paystub detail has sticky header on mobile
✅ Collapsible sections work smoothly
✅ All touch targets ≥ 44x44px
✅ No breaking changes to existing functionality
✅ Managers/admins retain full feature access
✅ All tests passing

---

**Plan complete and saved to `docs/plans/2025-10-29-mobile-employee-ux.md`.**

## Execution Options

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
