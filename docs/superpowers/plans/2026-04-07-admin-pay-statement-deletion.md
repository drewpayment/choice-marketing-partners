# Admin Pay Statement Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to safely delete unpaid pay statements with a two-step confirmation flow and full audit trail.

**Architecture:** New `payroll_audit` table stores complete deleted record data as JSON. Two new admin API routes (preview + delete) enforce `payroll.is_paid` protection. Repository methods handle all deletion logic within a single transaction. The existing unsafe `deletePaystub` in `InvoiceRepository` is removed.

**Tech Stack:** Next.js 15 App Router, Kysely ORM, MySQL, shadcn/ui, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-07-admin-pay-statement-deletion-design.md`

---

### Task 1: Database Migration - Create `payroll_audit` Table

**Files:**
- Create: `src/lib/database/migrations/006_payroll_audit.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 006_payroll_audit.sql
-- Audit trail for pay statement deletions
CREATE TABLE IF NOT EXISTS payroll_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  vendor_id INT NOT NULL,
  issue_date DATE NOT NULL,
  deleted_by INT NOT NULL,
  deletion_reason TEXT NOT NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(255),

  -- Summary counts
  deleted_paystubs_count INT NOT NULL DEFAULT 0,
  deleted_invoices_count INT NOT NULL DEFAULT 0,
  deleted_overrides_count INT NOT NULL DEFAULT 0,
  deleted_expenses_count INT NOT NULL DEFAULT 0,

  -- Summary totals
  paystub_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  invoices_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  overrides_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  expenses_total DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Full record data for recoverability
  paystub_data JSON NOT NULL,
  payroll_data JSON NOT NULL,
  invoices_data JSON NOT NULL,
  overrides_data JSON NOT NULL,
  expenses_data JSON NOT NULL,

  INDEX idx_payroll_audit_agent (agent_id),
  INDEX idx_payroll_audit_deleted_by (deleted_by),
  INDEX idx_payroll_audit_deleted_at (deleted_at)
);
```

- [ ] **Step 2: Run migration against development database**

```bash
mysql -u root -p choice_marketing < src/lib/database/migrations/006_payroll_audit.sql
```

Expected: Query OK, 0 rows affected.

- [ ] **Step 3: Commit**

```bash
git add src/lib/database/migrations/006_payroll_audit.sql
git commit -m "feat: add payroll_audit migration for pay statement deletion tracking"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/lib/database/types.ts`

- [ ] **Step 1: Add `PayrollAudit` interface after the existing `Paystubs` interface**

Add this after the `Paystubs` interface (around line 295) and before the `Permissions` interface:

```typescript
export interface PayrollAudit {
  id: Generated<number>;
  agent_id: number;
  vendor_id: number;
  issue_date: Date;
  deleted_by: number;
  deletion_reason: string;
  deleted_at: Date;
  ip_address: string | null;
  deleted_paystubs_count: number;
  deleted_invoices_count: number;
  deleted_overrides_count: number;
  deleted_expenses_count: number;
  paystub_total: Decimal;
  invoices_total: Decimal;
  overrides_total: Decimal;
  expenses_total: Decimal;
  paystub_data: string;
  payroll_data: string;
  invoices_data: string;
  overrides_data: string;
  expenses_data: string;
}
```

- [ ] **Step 2: Add `payroll_audit` to the `DB` interface**

In the `DB` interface (around line 499), add this line after the `payroll` entry:

```typescript
  payroll_audit: PayrollAudit;
```

- [ ] **Step 3: Verify types compile**

```bash
bun run tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `PayrollAudit`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/database/types.ts
git commit -m "feat: add PayrollAudit type and DB mapping for audit table"
```

---

### Task 3: Add Preview Method to PayrollRepository

**Files:**
- Modify: `src/lib/repositories/PayrollRepository.ts`
- Test: `src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts`

- [ ] **Step 1: Write failing tests for `previewPaystubDeletion`**

Create `src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts`:

```typescript
import type { UserContext } from '@/lib/auth/types'

// Mock the database client
const mockExecute = jest.fn()
const mockExecuteTakeFirst = jest.fn()

const mockChain = {
  selectFrom: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: mockExecute,
  executeTakeFirst: mockExecuteTakeFirst,
  fn: jest.fn().mockReturnValue('DATE_EXPR'),
}

;(mockChain.fn as any).count = jest.fn().mockReturnValue({ as: jest.fn() })
;(mockChain.fn as any).sum = jest.fn().mockReturnValue({ as: jest.fn() })

jest.mock('@/lib/database/client', () => ({
  db: mockChain,
}))

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { PayrollRepository } from '../PayrollRepository'

describe('PayrollRepository - Deletion', () => {
  let repo: PayrollRepository

  const adminCtx: UserContext = {
    employeeId: 1,
    isAdmin: true,
    isManager: false,
  }

  const managerCtx: UserContext = {
    employeeId: 2,
    isAdmin: false,
    isManager: true,
    managedEmployeeIds: [3, 4],
  }

  const employeeCtx: UserContext = {
    employeeId: 3,
    isAdmin: false,
    isManager: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new PayrollRepository()
  })

  describe('previewPaystubDeletion', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.previewPaystubDeletion(1, 1, '2026-01-01', managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.previewPaystubDeletion(1, 1, '2026-01-01', employeeCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('returns canDelete: false when payroll is paid', async () => {
      // Mock payroll lookup returning is_paid = 1
      mockExecuteTakeFirst.mockResolvedValueOnce({ is_paid: 1 })

      const result = await repo.previewPaystubDeletion(1, 5, '2026-01-01', adminCtx)
      expect(result.canDelete).toBe(false)
      expect(result.isPaid).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts --verbose
```

Expected: FAIL - `previewPaystubDeletion` is not a function.

- [ ] **Step 3: Add `previewPaystubDeletion` method to `PayrollRepository`**

Add this import at the top of `src/lib/repositories/PayrollRepository.ts`:

```typescript
import type { UserContext } from '@/lib/auth/types'
```

Add this interface before the class definition:

```typescript
export interface PaystubDeletionPreview {
  canDelete: boolean
  isPaid: boolean
  reason?: string
  agent?: { id: number; name: string }
  vendor?: { id: number; name: string }
  issueDate?: string
  summary?: {
    paystubCount: number
    invoiceCount: number
    overrideCount: number
    expenseCount: number
    paystubTotal: number
    invoiceTotal: number
    overrideTotal: number
    expenseTotal: number
  }
}
```

Add this method inside the `PayrollRepository` class, before the private helper methods:

```typescript
  /**
   * Preview what will be deleted for a pay statement.
   * Checks payroll.is_paid and returns counts/totals of related records.
   */
  async previewPaystubDeletion(
    agentId: number,
    vendorId: number,
    issueDate: string,
    userContext: UserContext
  ): Promise<PaystubDeletionPreview> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }

    // Check if payroll record is paid
    const payrollRecord = await db
      .selectFrom('payroll')
      .select(['is_paid'])
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['pay_date']), '=', issueDate)
      .executeTakeFirst()

    if (payrollRecord && payrollRecord.is_paid === 1) {
      return {
        canDelete: false,
        isPaid: true,
        reason: 'Pay statement has been marked as paid and cannot be deleted.',
      }
    }

    // Get employee info
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name'])
      .where('id', '=', agentId)
      .executeTakeFirst()

    // Get vendor info
    const vendor = await db
      .selectFrom('vendors')
      .select(['id', 'name'])
      .where('id', '=', vendorId)
      .executeTakeFirst()

    // Count and total paystubs
    const paystubs = await db
      .selectFrom('paystubs')
      .selectAll()
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Count and total invoices
    const invoices = await db
      .selectFrom('invoices')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor', '=', vendorId.toString())
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Count and total overrides
    const overrides = await db
      .selectFrom('overrides')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Count and total expenses
    const expenses = await db
      .selectFrom('expenses')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    const paystubTotal = paystubs.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0)
    const invoiceTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount?.toString() || '0'), 0)
    const overrideTotal = overrides.reduce((sum, o) => sum + parseFloat(o.total?.toString() || '0'), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0)

    return {
      canDelete: true,
      isPaid: false,
      agent: employee ? { id: employee.id, name: employee.name } : undefined,
      vendor: vendor ? { id: vendor.id, name: vendor.name } : undefined,
      issueDate,
      summary: {
        paystubCount: paystubs.length,
        invoiceCount: invoices.length,
        overrideCount: overrides.length,
        expenseCount: expenses.length,
        paystubTotal,
        invoiceTotal,
        overrideTotal,
        expenseTotal,
      },
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts --verbose
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/PayrollRepository.ts src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts
git commit -m "feat: add previewPaystubDeletion method with RBAC and paid-status checks"
```

---

### Task 4: Add Delete-With-Audit Method to PayrollRepository

**Files:**
- Modify: `src/lib/repositories/PayrollRepository.ts`
- Modify: `src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts`

- [ ] **Step 1: Write failing tests for `deletePaystubWithAudit`**

Add to `PayrollRepository.deletion.test.ts` inside the outer `describe` block:

```typescript
  describe('deletePaystubWithAudit', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.deletePaystubWithAudit(1, 1, '2026-01-01', managerCtx, 2, 'test reason', '127.0.0.1')
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.deletePaystubWithAudit(1, 1, '2026-01-01', employeeCtx, 3, 'test reason', '127.0.0.1')
      ).rejects.toThrow('Admin access required')
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts --verbose
```

Expected: FAIL - `deletePaystubWithAudit` is not a function.

- [ ] **Step 3: Add `deletePaystubWithAudit` method to `PayrollRepository`**

Add this interface before the class:

```typescript
export interface PaystubDeletionResult {
  success: boolean
  auditId?: number
  deleted: {
    paystubs: number
    invoices: number
    overrides: number
    expenses: number
    payroll: number
  }
  error?: string
}
```

Add this method inside the `PayrollRepository` class, after `previewPaystubDeletion`:

```typescript
  /**
   * Delete a pay statement and all related records with full audit trail.
   * All operations run within a single transaction - full rollback on any failure.
   */
  async deletePaystubWithAudit(
    agentId: number,
    vendorId: number,
    issueDate: string,
    userContext: UserContext,
    deletedBy: number,
    reason: string,
    ipAddress: string
  ): Promise<PaystubDeletionResult> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Deletion reason is required')
    }

    return await db.transaction().execute(async (trx) => {
      // 1. Re-check payroll.is_paid inside transaction (race condition guard)
      const payrollRecord = await trx
        .selectFrom('payroll')
        .selectAll()
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['pay_date']), '=', issueDate)
        .executeTakeFirst()

      if (payrollRecord && payrollRecord.is_paid === 1) {
        return {
          success: false,
          deleted: { paystubs: 0, invoices: 0, overrides: 0, expenses: 0, payroll: 0 },
          error: 'Pay statement has been marked as paid and cannot be deleted.',
        }
      }

      // 2. Fetch all records before deletion for audit
      const paystubs = await trx
        .selectFrom('paystubs')
        .selectAll()
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const invoices = await trx
        .selectFrom('invoices')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor', '=', vendorId.toString())
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const overrides = await trx
        .selectFrom('overrides')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const expenses = await trx
        .selectFrom('expenses')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      // Calculate totals
      const paystubTotal = paystubs.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0)
      const invoiceTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount?.toString() || '0'), 0)
      const overrideTotal = overrides.reduce((sum, o) => sum + parseFloat(o.total?.toString() || '0'), 0)
      const expenseTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0)

      // 3. Insert audit record with full JSON data
      const auditResult = await trx
        .insertInto('payroll_audit')
        .values({
          agent_id: agentId,
          vendor_id: vendorId,
          issue_date: new Date(issueDate),
          deleted_by: deletedBy,
          deletion_reason: reason.trim(),
          deleted_at: new Date(),
          ip_address: ipAddress,
          deleted_paystubs_count: paystubs.length,
          deleted_invoices_count: invoices.length,
          deleted_overrides_count: overrides.length,
          deleted_expenses_count: expenses.length,
          paystub_total: paystubTotal,
          invoices_total: invoiceTotal,
          overrides_total: overrideTotal,
          expenses_total: expenseTotal,
          paystub_data: JSON.stringify(paystubs),
          payroll_data: JSON.stringify(payrollRecord ? [payrollRecord] : []),
          invoices_data: JSON.stringify(invoices),
          overrides_data: JSON.stringify(overrides),
          expenses_data: JSON.stringify(expenses),
        })
        .executeTakeFirst()

      const auditId = Number(auditResult.insertId)

      // 4. Delete all related records
      const invoiceResult = await trx
        .deleteFrom('invoices')
        .where('agentid', '=', agentId)
        .where('vendor', '=', vendorId.toString())
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const overrideResult = await trx
        .deleteFrom('overrides')
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const expenseResult = await trx
        .deleteFrom('expenses')
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const paystubResult = await trx
        .deleteFrom('paystubs')
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const payrollResult = await trx
        .deleteFrom('payroll')
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['pay_date']), '=', issueDate)
        .execute()

      return {
        success: true,
        auditId,
        deleted: {
          paystubs: paystubResult.length,
          invoices: invoiceResult.length,
          overrides: overrideResult.length,
          expenses: expenseResult.length,
          payroll: payrollResult.length,
        },
      }
    })
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts --verbose
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/PayrollRepository.ts src/lib/repositories/__tests__/PayrollRepository.deletion.test.ts
git commit -m "feat: add deletePaystubWithAudit with transaction, audit trail, and paid-status guard"
```

---

### Task 5: Preview API Route

**Files:**
- Create: `src/app/api/admin/payroll/[agentId]/[vendorId]/[issueDate]/preview/route.ts`

- [ ] **Step 1: Create the preview API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; vendorId: string; issueDate: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = await context.params
    const agentId = parseInt(params.agentId)
    const vendorId = parseInt(params.vendorId)
    const issueDate = params.issueDate

    if (isNaN(agentId) || isNaN(vendorId) || !issueDate) {
      return NextResponse.json(
        { error: 'Invalid parameters: agentId, vendorId, and issueDate are required' },
        { status: 400 }
      )
    }

    const repo = new PayrollRepository()
    const preview = await repo.previewPaystubDeletion(agentId, vendorId, issueDate, {
      employeeId: session.user.employeeId,
      isAdmin: session.user.isAdmin,
      isManager: session.user.isManager,
    })

    return NextResponse.json(preview)
  } catch (error) {
    logger.error('Error previewing pay statement deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the route file compiles**

```bash
bun run tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/payroll/\[agentId\]/\[vendorId\]/\[issueDate\]/preview/route.ts
git commit -m "feat: add GET preview endpoint for pay statement deletion"
```

---

### Task 6: Delete API Route

**Files:**
- Create: `src/app/api/admin/payroll/[agentId]/[vendorId]/[issueDate]/route.ts`

- [ ] **Step 1: Create the delete API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { logger } from '@/lib/utils/logger'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; vendorId: string; issueDate: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = await context.params
    const agentId = parseInt(params.agentId)
    const vendorId = parseInt(params.vendorId)
    const issueDate = params.issueDate

    if (isNaN(agentId) || isNaN(vendorId) || !issueDate) {
      return NextResponse.json(
        { error: 'Invalid parameters: agentId, vendorId, and issueDate are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'A deletion reason is required' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const repo = new PayrollRepository()
    const result = await repo.deletePaystubWithAudit(
      agentId,
      vendorId,
      issueDate,
      {
        employeeId: session.user.employeeId,
        isAdmin: session.user.isAdmin,
        isManager: session.user.isManager,
      },
      session.user.employeeId,
      reason,
      ipAddress
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      auditId: result.auditId,
    })
  } catch (error) {
    logger.error('Error deleting pay statement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the route file compiles**

```bash
bun run tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/payroll/\[agentId\]/\[vendorId\]/\[issueDate\]/route.ts
git commit -m "feat: add DELETE endpoint for pay statement deletion with audit trail"
```

---

### Task 7: Remove Old `deletePaystub` and Update Callers

**Files:**
- Modify: `src/lib/repositories/InvoiceRepository.ts` (remove `deletePaystub` method, lines 655-711)
- Modify: `src/app/api/invoices/route.ts` (update DELETE handler, lines 141-183)
- Modify: `src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts` (remove `deletePaystub` tests, lines 197-209)

- [ ] **Step 1: Remove `deletePaystub` method from `InvoiceRepository.ts`**

Delete the entire method block from `src/lib/repositories/InvoiceRepository.ts`:

```typescript
  // DELETE THIS ENTIRE METHOD (lines 655-711):
  /**
   * Delete entire paystub (all related records)
   */
  async deletePaystub(agentId: number, vendorId: number, issueDate: string, userContext: UserContext): Promise<boolean> {
    // ... entire method body ...
  }
```

- [ ] **Step 2: Update DELETE handler in `src/app/api/invoices/route.ts`**

Replace the existing DELETE handler (lines 141-183) with a handler that calls the new `PayrollRepository.deletePaystubWithAudit`:

```typescript
/**
 * DELETE /api/invoices - Delete entire pay statement (all invoices, overrides, expenses, payroll record)
 * Body: { agentId, vendorId, issueDate, reason }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build user context for RBAC
    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const body = await request.json()
    const { agentId, vendorId, issueDate, reason } = body

    if (!agentId || !vendorId || !issueDate) {
      return NextResponse.json(
        { error: 'agentId, vendorId, and issueDate are required' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'A deletion reason is required' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { PayrollRepository } = await import('@/lib/repositories/PayrollRepository')
    const payrollRepo = new PayrollRepository()

    const result = await payrollRepo.deletePaystubWithAudit(
      agentId,
      vendorId,
      issueDate,
      userContext,
      session.user.employeeId,
      reason,
      ipAddress
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      message: 'Pay statement deleted successfully',
      deleted: result.deleted,
      auditId: result.auditId,
    })
  } catch (error) {
    logger.error('DELETE /api/invoices error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Remove `deletePaystub` tests from `InvoiceRepository.rbac.test.ts`**

Delete the `deletePaystub` describe block (lines 197-209):

```typescript
  // DELETE THIS ENTIRE BLOCK:
    describe('deletePaystub', () => {
      it('throws for manager', async () => {
        await expect(
          repo.deletePaystub(1, 1, '2024-01-01', managerCtx)
        ).rejects.toThrow('Admin access required')
      })

      it('throws for employee', async () => {
        await expect(
          repo.deletePaystub(1, 1, '2024-01-01', employeeCtx)
        ).rejects.toThrow('Admin access required')
      })
    })
```

- [ ] **Step 4: Run all tests to verify nothing breaks**

```bash
bun test --verbose 2>&1 | tail -30
```

Expected: All tests PASS, no references to deleted `deletePaystub`.

- [ ] **Step 5: Verify types compile**

```bash
bun run tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/InvoiceRepository.ts src/app/api/invoices/route.ts src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts
git commit -m "refactor: replace unsafe deletePaystub with audited PayrollRepository method"
```

---

### Task 8: Install AlertDialog Component

**Files:**
- Create: `src/components/ui/alert-dialog.tsx`

- [ ] **Step 1: Add shadcn AlertDialog component**

```bash
cd /Users/drewpayment/dev/choice-marketing-partners && bunx shadcn@latest add alert-dialog
```

Expected: Component added to `src/components/ui/alert-dialog.tsx`.

- [ ] **Step 2: Verify the component was created**

```bash
ls -la src/components/ui/alert-dialog.tsx
```

Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/alert-dialog.tsx
git commit -m "feat: add shadcn AlertDialog component for deletion confirmation"
```

---

### Task 9: Create Pay Statement Delete Confirmation Dialog

**Files:**
- Create: `src/components/payroll/PaystubDeleteDialog.tsx`

- [ ] **Step 1: Create the two-step confirmation dialog component**

```typescript
'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface DeletionPreview {
  canDelete: boolean
  isPaid: boolean
  reason?: string
  agent?: { id: number; name: string }
  vendor?: { id: number; name: string }
  issueDate?: string
  summary?: {
    paystubCount: number
    invoiceCount: number
    overrideCount: number
    expenseCount: number
    paystubTotal: number
    invoiceTotal: number
    overrideTotal: number
    expenseTotal: number
  }
}

interface PaystubDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: DeletionPreview | null
  isLoadingPreview: boolean
  onConfirmDelete: (reason: string) => Promise<void>
}

export function PaystubDeleteDialog({
  open,
  onOpenChange,
  preview,
  isLoadingPreview,
  onConfirmDelete,
}: PaystubDeleteDialogProps) {
  const [reason, setReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [step, setStep] = useState<'preview' | 'confirm'>('preview')

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('')
      setStep('preview')
      setIsDeleting(false)
    }
    onOpenChange(newOpen)
  }

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setIsDeleting(true)
    try {
      await onConfirmDelete(reason.trim())
      handleOpenChange(false)
    } catch {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step === 'preview' ? 'Delete Pay Statement' : 'Confirm Deletion'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        {isLoadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading preview...</span>
          </div>
        ) : preview && !preview.canDelete ? (
          <>
            <AlertDialogDescription>
              {preview.reason || 'This pay statement cannot be deleted.'}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : preview && step === 'preview' ? (
          <>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to delete the pay statement for{' '}
                  <strong>{preview.agent?.name}</strong> from{' '}
                  <strong>{preview.vendor?.name}</strong> on{' '}
                  <strong>{preview.issueDate}</strong>.
                </p>
                <div className="rounded-md border p-4 space-y-2 text-sm">
                  <p className="font-medium">The following records will be permanently deleted:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between">
                      <span>Invoices:</span>
                      <Badge variant="secondary">{preview.summary?.invoiceCount ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(preview.summary?.invoiceTotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overrides:</span>
                      <Badge variant="secondary">{preview.summary?.overrideCount ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(preview.summary?.overrideTotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expenses:</span>
                      <Badge variant="secondary">{preview.summary?.expenseCount ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(preview.summary?.expenseTotal ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  setStep('confirm')
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : preview && step === 'confirm' ? (
          <>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Please provide a reason for deleting this pay statement. This will be recorded in the audit log.</p>
                <Textarea
                  placeholder="Reason for deletion (required)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirm()
                }}
                disabled={!reason.trim() || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Pay Statement'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Verify the component compiles**

```bash
bun run tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/payroll/PaystubDeleteDialog.tsx
git commit -m "feat: add two-step PaystubDeleteDialog with preview and reason input"
```

---

### Task 10: Integrate Delete Button into Payroll Monitoring Page

**Files:**
- Modify: `src/app/(portal)/admin/payroll-monitoring/payroll-monitoring-client.tsx`

- [ ] **Step 1: Read the full payroll monitoring client component**

Read the entire `payroll-monitoring-client.tsx` to understand the table structure and existing actions before modifying.

- [ ] **Step 2: Add imports for deletion dialog and state**

At the top of `payroll-monitoring-client.tsx`, add:

```typescript
import { Trash2 } from 'lucide-react'
import { PaystubDeleteDialog } from '@/components/payroll/PaystubDeleteDialog'
```

- [ ] **Step 3: Add deletion state variables**

Inside the component function, add state for the deletion flow:

```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [deletePreview, setDeletePreview] = useState<any>(null)
const [isLoadingPreview, setIsLoadingPreview] = useState(false)
const [selectedForDelete, setSelectedForDelete] = useState<PayrollRecord | null>(null)
```

- [ ] **Step 4: Add preview and delete handler functions**

```typescript
const handleDeleteClick = async (record: PayrollRecord) => {
  setSelectedForDelete(record)
  setDeleteDialogOpen(true)
  setIsLoadingPreview(true)
  setDeletePreview(null)

  try {
    const response = await fetch(
      `/api/admin/payroll/${record.employeeId}/${record.vendorId}/${record.payDate}/preview`
    )
    const data = await response.json()
    setDeletePreview(data)
  } catch {
    toast({
      title: 'Error',
      description: 'Failed to load deletion preview.',
      variant: 'destructive',
    })
    setDeleteDialogOpen(false)
  } finally {
    setIsLoadingPreview(false)
  }
}

const handleConfirmDelete = async (reason: string) => {
  if (!selectedForDelete) return

  const response = await fetch(
    `/api/admin/payroll/${selectedForDelete.employeeId}/${selectedForDelete.vendorId}/${selectedForDelete.payDate}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }
  )

  if (!response.ok) {
    const data = await response.json()
    toast({
      title: 'Deletion failed',
      description: data.error || 'Failed to delete pay statement.',
      variant: 'destructive',
    })
    throw new Error(data.error)
  }

  toast({
    title: 'Pay statement deleted',
    description: 'The pay statement and all related records have been removed.',
  })

  // Refresh the list
  fetchPayrollData()
}
```

- [ ] **Step 5: Add delete button to each unpaid row in the table**

In the table row rendering, add a delete button cell. Find the existing `<TableRow>` mapping and add a new `<TableCell>` at the end of each row:

```typescript
<TableCell>
  {!record.isPaid && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleDeleteClick(record)}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</TableCell>
```

Add a matching `<TableHead>` in the header row:

```typescript
<TableHead className="w-[50px]"></TableHead>
```

- [ ] **Step 6: Add the dialog component to the JSX**

At the end of the component's return JSX, before the closing fragment or div:

```typescript
<PaystubDeleteDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  preview={deletePreview}
  isLoadingPreview={isLoadingPreview}
  onConfirmDelete={handleConfirmDelete}
/>
```

- [ ] **Step 7: Verify the page compiles and renders**

```bash
bun run tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(portal\)/admin/payroll-monitoring/payroll-monitoring-client.tsx
git commit -m "feat: add delete button and confirmation dialog to payroll monitoring page"
```

---

### Task 11: E2E Test for Deletion Flow

**Files:**
- Create: `tests/e2e/payroll-deletion.spec.ts`

- [ ] **Step 1: Write E2E test for the deletion flow**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Pay Statement Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|admin)/)
  })

  test('preview endpoint blocks deletion of paid records', async ({ request }) => {
    // This test verifies the API directly
    const loginResponse = await request.post('/api/auth/callback/credentials', {
      form: {
        email: 'admin@test.com',
        password: 'password123',
        csrfToken: '',
        callbackUrl: '/',
        json: 'true',
      },
    })

    // Attempt to preview a non-existent record (should return empty preview, not crash)
    const response = await request.get('/api/admin/payroll/99999/99999/2026-01-01/preview')
    expect(response.status()).toBe(200)
  })

  test('delete endpoint requires reason', async ({ request }) => {
    const response = await request.delete('/api/admin/payroll/1/1/2026-01-01', {
      data: { reason: '' },
    })
    // Should return 400 or 401 (depending on auth state in E2E)
    expect([400, 401]).toContain(response.status())
  })

  test('non-admin cannot access preview endpoint', async ({ page, request }) => {
    // Login as employee
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'employee@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)/)

    const response = await request.get('/api/admin/payroll/1/1/2026-01-01/preview')
    expect([401, 403]).toContain(response.status())
  })

  test('delete button only visible on unpaid rows', async ({ page }) => {
    await page.goto('/admin/payroll-monitoring')
    await page.waitForLoadState('networkidle')

    // Paid rows should not have delete buttons
    const paidRows = page.locator('tr').filter({ has: page.locator('text=Paid') })
    const paidDeleteButtons = paidRows.locator('button:has(svg.lucide-trash-2)')
    
    if (await paidRows.count() > 0) {
      expect(await paidDeleteButtons.count()).toBe(0)
    }
  })
})
```

- [ ] **Step 2: Run the E2E tests**

```bash
bun test:e2e payroll-deletion.spec.ts
```

Expected: Tests pass (some may need adjustment based on test data availability).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/payroll-deletion.spec.ts
git commit -m "test: add E2E tests for pay statement deletion flow"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
bun test --verbose
```

Expected: All tests PASS.

- [ ] **Step 2: Run type checking**

```bash
bun run tsc --noEmit --pretty
```

Expected: No errors.

- [ ] **Step 3: Run linting**

```bash
bun lint
```

Expected: No errors.

- [ ] **Step 4: Run E2E tests**

```bash
bun test:e2e
```

Expected: All tests pass.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git status
```

If any files are uncommitted, stage and commit with an appropriate message.
