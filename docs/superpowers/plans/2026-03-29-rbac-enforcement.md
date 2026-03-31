# RBAC Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce role-based access control across all repositories, API routes, and admin pages so that employees see only their own data, managers see their direct reports, and admins see everything.

**Architecture:** Dual-layer enforcement — repository layer (hard gate) filters/rejects at the data level, API route/page layer (fast gate) rejects unauthorized requests early. Follows the existing PayrollRepository + `payroll-access.ts` pattern.

**Tech Stack:** Next.js 15 App Router, TypeScript, Kysely ORM, NextAuth.js, Jest, Playwright

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/auth/types.ts` | Shared `UserContext` type |
| Modify | `src/lib/auth/payroll-access.ts` | Import `UserContext` from types.ts instead of inline types |
| Modify | `src/lib/repositories/EmployeeRepository.ts` | Add `UserContext` param to read/write methods |
| Modify | `src/lib/repositories/InvoiceRepository.ts` | Add `UserContext` param to all methods |
| Modify | `src/lib/repositories/DocumentRepository.ts` | Add `UserContext` param to write methods |
| Modify | `src/lib/repositories/InvoiceAuditRepository.ts` | Add `UserContext` param, admin-only gate |
| Modify | `src/lib/repositories/VendorRepository.ts` | Add `UserContext` param, admin-only gate |
| Modify | `src/lib/repositories/VendorFieldRepository.ts` | Add `UserContext` param, admin-only gate |
| Modify | `src/lib/repositories/ManagerEmployeeRepository.ts` | Add `UserContext` param, admin-only gate |
| Modify | `src/lib/repositories/BillingRepository.ts` | Migrate to `UserContext` type (already has access control) |
| Modify | `src/app/api/documents/route.ts` | Add admin check for POST/DELETE |
| Modify | `src/app/api/documents/[id]/route.ts` | Add admin check for PATCH/DELETE |
| Modify | `src/app/api/invoices/route.ts` | Add manager/admin check for POST, pass `userContext` |
| Modify | `src/app/api/invoices/search/route.ts` | Add manager-employee filtering |
| Modify | `src/app/api/invoices/audit/[invoiceId]/route.ts` | Change to admin-only |
| Modify | `src/app/api/debug/env/route.ts` | Add admin auth check |
| Create | `src/app/(portal)/admin/feature-flags/page.server.tsx` | Server-side auth wrapper (rename existing to client component) |
| Create | `src/app/(portal)/admin/invoice-search/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/payroll-monitoring/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/settings/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/tools/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/vendors/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/billing/subscribers/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/billing/subscribers/new/page.server.tsx` | Server-side auth wrapper |
| Create | `src/app/(portal)/admin/billing/products/page.server.tsx` | Server-side auth wrapper |
| Create | `src/lib/auth/__tests__/types.test.ts` | Unit tests for UserContext |
| Create | `src/lib/repositories/__tests__/EmployeeRepository.rbac.test.ts` | RBAC unit tests |
| Create | `src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts` | RBAC unit tests |
| Create | `src/lib/repositories/__tests__/DocumentRepository.rbac.test.ts` | RBAC unit tests |
| Create | `src/lib/repositories/__tests__/InvoiceAuditRepository.rbac.test.ts` | RBAC unit tests |
| Create | `src/lib/repositories/__tests__/VendorRepository.rbac.test.ts` | RBAC unit tests |
| Create | `src/lib/repositories/__tests__/ManagerEmployeeRepository.rbac.test.ts` | RBAC unit tests |
| Create | `tests/e2e/rbac-enforcement.spec.ts` | E2E browser tests for all roles |

---

## Task 1: Create Shared UserContext Type

**Files:**
- Create: `src/lib/auth/types.ts`
- Modify: `src/lib/auth/payroll-access.ts`
- Test: `src/lib/auth/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/__tests__/types.test.ts`:

```typescript
import type { UserContext } from '@/lib/auth/types'
import { buildUserContext } from '@/lib/auth/types'

describe('UserContext', () => {
  describe('buildUserContext', () => {
    it('returns admin context with no managedEmployeeIds', () => {
      const ctx: UserContext = buildUserContext({
        employeeId: 1,
        isAdmin: true,
        isManager: false,
      })
      expect(ctx.isAdmin).toBe(true)
      expect(ctx.isManager).toBe(false)
      expect(ctx.employeeId).toBe(1)
      expect(ctx.managedEmployeeIds).toBeUndefined()
    })

    it('returns manager context with managedEmployeeIds', () => {
      const ctx: UserContext = buildUserContext({
        employeeId: 2,
        isAdmin: false,
        isManager: true,
        managedEmployeeIds: [10, 11, 12],
      })
      expect(ctx.isManager).toBe(true)
      expect(ctx.managedEmployeeIds).toEqual([10, 11, 12])
    })

    it('returns employee context with minimal fields', () => {
      const ctx: UserContext = buildUserContext({
        employeeId: 3,
        isAdmin: false,
        isManager: false,
      })
      expect(ctx.isAdmin).toBe(false)
      expect(ctx.isManager).toBe(false)
      expect(ctx.employeeId).toBe(3)
    })

    it('handles missing employeeId', () => {
      const ctx: UserContext = buildUserContext({
        isAdmin: false,
        isManager: false,
      })
      expect(ctx.employeeId).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/lib/auth/__tests__/types.test.ts`
Expected: FAIL — module `@/lib/auth/types` does not exist

- [ ] **Step 3: Create `src/lib/auth/types.ts`**

```typescript
/**
 * Shared user context type for role-based access control.
 * Used by all repositories and access-check functions.
 */
export interface UserContext {
  employeeId?: number
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin?: boolean
  isSubscriber?: boolean
  subscriberId?: number
  managedEmployeeIds?: number[]
}

/**
 * Build a UserContext from partial input.
 * This is the canonical way to construct a UserContext from session data.
 */
export function buildUserContext(input: {
  employeeId?: number | null
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin?: boolean
  isSubscriber?: boolean
  subscriberId?: number | null
  managedEmployeeIds?: number[]
}): UserContext {
  return {
    employeeId: input.employeeId ?? undefined,
    isAdmin: input.isAdmin,
    isManager: input.isManager,
    isSuperAdmin: input.isSuperAdmin,
    isSubscriber: input.isSubscriber,
    subscriberId: input.subscriberId ?? undefined,
    managedEmployeeIds: input.managedEmployeeIds,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/lib/auth/__tests__/types.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Update `payroll-access.ts` to use `UserContext`**

In `src/lib/auth/payroll-access.ts`, add an import at line 1 and update `getEmployeeContext` return type:

```typescript
import type { UserContext } from '@/lib/auth/types'
```

Change the `getEmployeeContext` return type from the inline object type to `Promise<UserContext>`.

Replace all inline `userContext: { employeeId?: number; isAdmin: boolean; isManager: boolean; managedEmployeeIds?: number[] }` parameter types across the file with `userContext: UserContext`.

This is a type-only refactor — no logic changes.

- [ ] **Step 6: Run existing tests to verify no regressions**

Run: `bun test`
Expected: All existing tests pass

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/types.ts src/lib/auth/__tests__/types.test.ts src/lib/auth/payroll-access.ts
git commit -m "feat: add shared UserContext type for RBAC enforcement"
```

---

## Task 2: Add RBAC to EmployeeRepository

**Files:**
- Modify: `src/lib/repositories/EmployeeRepository.ts`
- Create: `src/lib/repositories/__tests__/EmployeeRepository.rbac.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/repositories/__tests__/EmployeeRepository.rbac.test.ts`:

```typescript
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import type { UserContext } from '@/lib/auth/types'

// Mock the database client
jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue({ count: 0 }),
    case: jest.fn().mockReturnValue({
      when: jest.fn().mockReturnValue({
        then: jest.fn().mockReturnValue({
          else: jest.fn().mockReturnValue({
            end: jest.fn().mockReturnValue({ as: jest.fn() }),
          }),
        }),
      }),
    }),
    fn: { count: jest.fn().mockReturnValue({ as: jest.fn() }) },
  },
}))

describe('EmployeeRepository RBAC', () => {
  let repo: EmployeeRepository

  const adminCtx: UserContext = {
    employeeId: 1,
    isAdmin: true,
    isManager: false,
  }

  const managerCtx: UserContext = {
    employeeId: 2,
    isAdmin: false,
    isManager: true,
    managedEmployeeIds: [10, 11, 12],
  }

  const employeeCtx: UserContext = {
    employeeId: 3,
    isAdmin: false,
    isManager: false,
  }

  beforeEach(() => {
    repo = new EmployeeRepository()
  })

  describe('getEmployees', () => {
    it('does not throw for admin', async () => {
      await expect(repo.getEmployees({}, adminCtx)).resolves.toBeDefined()
    })

    it('does not throw for manager', async () => {
      await expect(repo.getEmployees({}, managerCtx)).resolves.toBeDefined()
    })

    it('does not throw for employee (returns self only)', async () => {
      await expect(repo.getEmployees({}, employeeCtx)).resolves.toBeDefined()
    })
  })

  describe('createEmployee', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(
        repo.createEmployee({ name: 'X', email: 'x@x.com', address: '1 Main' }, managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(
        repo.createEmployee({ name: 'X', email: 'x@x.com', address: '1 Main' }, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('updateEmployee', () => {
    it('throws for non-admin', async () => {
      await expect(
        repo.updateEmployee(10, { name: 'Y' }, managerCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('softDeleteEmployee', () => {
    it('throws for non-admin', async () => {
      await expect(
        repo.softDeleteEmployee(10, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/EmployeeRepository.rbac.test.ts`
Expected: FAIL — `getEmployees` doesn't accept a `UserContext` param; `createEmployee` etc. don't accept `UserContext`

- [ ] **Step 3: Add `UserContext` parameter to EmployeeRepository methods**

In `src/lib/repositories/EmployeeRepository.ts`:

1. Add import at top:
```typescript
import type { UserContext } from '@/lib/auth/types'
```

2. Update `getEmployees` signature to:
```typescript
async getEmployees(filters: EmployeeFilters = {}, userContext: UserContext): Promise<EmployeePage>
```

Inside `getEmployees`, after building the base query and applying existing filters, add role-based filtering before the count query:

```typescript
    // Role-based filtering
    if (!userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        // Manager sees self + direct reports
        const accessibleIds = [userContext.employeeId!, ...userContext.managedEmployeeIds]
        query = query.where('employees.id', 'in', accessibleIds)
      } else if (userContext.employeeId) {
        // Employee sees self only
        query = query.where('employees.id', '=', userContext.employeeId)
      } else {
        // No employeeId, no access — return empty
        return { employees: [], total: 0, page, limit, totalPages: 0 }
      }
    }
```

3. Update `getEmployeeById` signature to:
```typescript
async getEmployeeById(id: number, userContext?: UserContext): Promise<EmployeeDetail | null>
```

Add access check after fetching the record:
```typescript
    // If userContext provided, enforce access
    if (userContext && !userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        const accessibleIds = [userContext.employeeId!, ...userContext.managedEmployeeIds]
        if (!accessibleIds.includes(id)) return null
      } else if (userContext.employeeId !== id) {
        return null
      }
    }
```

4. Update `searchEmployees` to accept and apply the same filtering as `getEmployees`.

5. Add admin-only gate to write methods:
```typescript
async createEmployee(data: CreateEmployeeData, userContext: UserContext): Promise<number> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}

async updateEmployee(id: number, data: Partial<CreateEmployeeData>, userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}

async softDeleteEmployee(id: number, userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}
```

- [ ] **Step 4: Update all callers of EmployeeRepository**

Search the codebase for all files that call `EmployeeRepository` methods and pass `userContext` where available. Key callers:
- `src/app/api/employees/route.ts` — already admin-only, pass admin context
- `src/app/api/employees/[id]/route.ts` — already admin-only, pass admin context
- `src/app/(portal)/admin/employees/page.tsx` — server component, build context from session
- `src/app/(portal)/admin/employees/[id]/page.tsx` — server component, build context from session
- `src/app/(portal)/admin/employees/[id]/edit/page.tsx` — server component, build context from session

For each caller, add:
```typescript
import { getEmployeeContext } from '@/lib/auth/payroll-access'

const userContext = await getEmployeeContext(
  session.user.employeeId,
  session.user.isAdmin,
  session.user.isManager
)
```

Then pass `userContext` to the repository method.

- [ ] **Step 5: Run all tests**

Run: `bun test`
Expected: All tests pass including new RBAC tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/EmployeeRepository.ts src/lib/repositories/__tests__/EmployeeRepository.rbac.test.ts
git add -A src/app/api/employees/ src/app/\(portal\)/admin/employees/
git commit -m "feat: add RBAC enforcement to EmployeeRepository"
```

---

## Task 3: Add RBAC to InvoiceRepository

**Files:**
- Modify: `src/lib/repositories/InvoiceRepository.ts`
- Create: `src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts`:

```typescript
import { InvoiceRepository } from '@/lib/repositories/InvoiceRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    fn: {
      count: jest.fn().mockReturnValue({ as: jest.fn() }),
    },
  },
}))

jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs')
  return actual
})

describe('InvoiceRepository RBAC', () => {
  let repo: InvoiceRepository

  const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
  const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10, 11] }
  const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

  beforeEach(() => {
    repo = new InvoiceRepository()
  })

  describe('getInvoicePageResources', () => {
    it('throws for employee role', async () => {
      await expect(repo.getInvoicePageResources(employeeCtx)).rejects.toThrow('Insufficient permissions')
    })

    it('does not throw for manager', async () => {
      await expect(repo.getInvoicePageResources(managerCtx)).resolves.toBeDefined()
    })
  })

  describe('deleteInvoice', () => {
    it('throws for non-admin (manager)', async () => {
      await expect(repo.deleteInvoice(1, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('throws for non-admin (employee)', async () => {
      await expect(repo.deleteInvoice(1, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts`
Expected: FAIL — methods don't accept `UserContext`

- [ ] **Step 3: Add `UserContext` to InvoiceRepository methods**

In `src/lib/repositories/InvoiceRepository.ts`:

1. Add import:
```typescript
import type { UserContext } from '@/lib/auth/types'
```

2. Update `getInvoicePageResources`:
```typescript
async getInvoicePageResources(userContext: UserContext): Promise<InvoicePageResources> {
    if (!userContext.isAdmin && !userContext.isManager) {
      throw new Error('Insufficient permissions')
    }

    // Existing agent query — add filtering for managers
    let agentQuery = db
      .selectFrom('employees')
      .select(['id', 'name', 'sales_id1'])
      .where('is_active', '=', 1)
      .where('hidden_payroll', '=', 0)

    if (!userContext.isAdmin && userContext.isManager && userContext.managedEmployeeIds?.length) {
      agentQuery = agentQuery.where('id', 'in', userContext.managedEmployeeIds)
    }

    const agents = await agentQuery.orderBy('name', 'asc').execute()
    // ... rest unchanged
}
```

3. Update `getInvoiceDetail` to accept `UserContext` and validate agent access:
```typescript
async getInvoiceDetail(params: InvoiceSearchParams, userContext: UserContext): Promise<InvoiceDetail | null> {
    if (!userContext.isAdmin && !userContext.isManager) {
      throw new Error('Insufficient permissions')
    }
    // For managers, validate the agent belongs to their direct reports
    // ... existing logic
}
```

4. Update `saveInvoiceData` similarly — manager+admin only, with agent access validation for managers.

5. Update `deleteInvoice`:
```typescript
async deleteInvoice(invoiceId: number, userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}
```

- [ ] **Step 4: Update all callers of InvoiceRepository**

Key callers:
- `src/app/api/invoices/route.ts` — build `userContext` from session, pass to repo methods
- `src/app/api/invoices/search/route.ts` — pass `userContext` for filtering

- [ ] **Step 5: Run all tests**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/InvoiceRepository.ts src/lib/repositories/__tests__/InvoiceRepository.rbac.test.ts
git add src/app/api/invoices/
git commit -m "feat: add RBAC enforcement to InvoiceRepository"
```

---

## Task 4: Add RBAC to DocumentRepository

**Files:**
- Modify: `src/lib/repositories/DocumentRepository.ts`
- Create: `src/lib/repositories/__tests__/DocumentRepository.rbac.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/repositories/__tests__/DocumentRepository.rbac.test.ts`:

```typescript
import { DocumentRepository } from '@/lib/repositories/DocumentRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue({ count: 0 }),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    fn: { count: jest.fn().mockReturnValue({ as: jest.fn() }) },
  },
}))

describe('DocumentRepository RBAC', () => {
  let repo: DocumentRepository

  const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
  const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }
  const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

  beforeEach(() => {
    repo = new DocumentRepository()
  })

  describe('getDocuments (read)', () => {
    it('allows all authenticated roles', async () => {
      await expect(repo.getDocuments()).resolves.toBeDefined()
    })
  })

  describe('createDocument', () => {
    it('throws for manager', async () => {
      await expect(
        repo.createDocument({ name: 'test', description: '', file_url: '', mime_type: '' }, managerCtx)
      ).rejects.toThrow('Admin access required')
    })

    it('throws for employee', async () => {
      await expect(
        repo.createDocument({ name: 'test', description: '', file_url: '', mime_type: '' }, employeeCtx)
      ).rejects.toThrow('Admin access required')
    })
  })

  describe('deleteDocuments', () => {
    it('throws for non-admin', async () => {
      await expect(
        repo.deleteDocuments([1, 2], managerCtx)
      ).rejects.toThrow('Admin access required')
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/lib/repositories/__tests__/DocumentRepository.rbac.test.ts`
Expected: FAIL — write methods don't accept `UserContext`

- [ ] **Step 3: Add `UserContext` to DocumentRepository write methods**

In `src/lib/repositories/DocumentRepository.ts`:

1. Add import:
```typescript
import type { UserContext } from '@/lib/auth/types'
```

2. Read methods (`getDocuments`, `getDocumentById`) remain unchanged — all authenticated users can read.

3. Add admin-only gate to write methods. For each write method (`createDocument`, `updateDocument`, `deleteDocuments`), add `userContext: UserContext` as the last parameter:

```typescript
async createDocument(data: CreateDocumentData, userContext: UserContext): Promise<number> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}

async updateDocument(id: number, data: UpdateDocumentData, userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}

async deleteDocuments(ids: number[], userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    // ... existing logic
}
```

- [ ] **Step 4: Update API route callers**

In `src/app/api/documents/route.ts`:
- POST handler: Add `isAdmin` check (return 403 if not admin), pass `userContext` to `createDocument`
- DELETE handler: Add `isAdmin` check (return 403 if not admin), pass `userContext` to `deleteDocuments`

In `src/app/api/documents/[id]/route.ts`:
- PATCH handler: Add `isAdmin` check (return 403 if not admin), pass `userContext` to `updateDocument`
- DELETE handler: Add `isAdmin` check (return 403 if not admin), pass `userContext` to `deleteDocuments`

- [ ] **Step 5: Run all tests**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/DocumentRepository.ts src/lib/repositories/__tests__/DocumentRepository.rbac.test.ts
git add src/app/api/documents/
git commit -m "feat: add RBAC enforcement to DocumentRepository"
```

---

## Task 5: Add RBAC to Admin-Only Repositories

**Files:**
- Modify: `src/lib/repositories/InvoiceAuditRepository.ts`
- Modify: `src/lib/repositories/VendorRepository.ts`
- Modify: `src/lib/repositories/VendorFieldRepository.ts`
- Modify: `src/lib/repositories/ManagerEmployeeRepository.ts`
- Create: `src/lib/repositories/__tests__/InvoiceAuditRepository.rbac.test.ts`
- Create: `src/lib/repositories/__tests__/VendorRepository.rbac.test.ts`
- Create: `src/lib/repositories/__tests__/ManagerEmployeeRepository.rbac.test.ts`

These four repositories follow the same pattern: all methods are admin-only. Apply the pattern consistently.

- [ ] **Step 1: Write failing tests for InvoiceAuditRepository**

Create `src/lib/repositories/__tests__/InvoiceAuditRepository.rbac.test.ts`:

```typescript
import { InvoiceAuditRepository } from '@/lib/repositories/InvoiceAuditRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue({ count: 0 }),
    fn: { count: jest.fn().mockReturnValue({ as: jest.fn() }) },
  },
}))

describe('InvoiceAuditRepository RBAC', () => {
  let repo: InvoiceAuditRepository

  const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
  const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }
  const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

  beforeEach(() => {
    repo = new InvoiceAuditRepository()
  })

  describe('searchAuditRecords', () => {
    it('throws for manager', async () => {
      await expect(repo.searchAuditRecords({}, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('throws for employee', async () => {
      await expect(repo.searchAuditRecords({}, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getInvoiceAuditHistory', () => {
    it('throws for non-admin', async () => {
      await expect(repo.getInvoiceAuditHistory(1, managerCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('getAuditSummary', () => {
    it('throws for non-admin', async () => {
      await expect(repo.getAuditSummary(undefined, undefined, undefined, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })
})
```

- [ ] **Step 2: Write failing tests for VendorRepository**

Create `src/lib/repositories/__tests__/VendorRepository.rbac.test.ts`:

```typescript
import { VendorRepository } from '@/lib/repositories/VendorRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    fn: { count: jest.fn().mockReturnValue({ as: jest.fn() }) },
  },
}))

describe('VendorRepository RBAC', () => {
  let repo: VendorRepository

  const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
  const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }
  const employeeCtx: UserContext = { employeeId: 3, isAdmin: false, isManager: false }

  beforeEach(() => {
    repo = new VendorRepository()
  })

  describe('getVendors', () => {
    it('throws for manager', async () => {
      await expect(repo.getVendors({}, managerCtx)).rejects.toThrow('Admin access required')
    })

    it('throws for employee', async () => {
      await expect(repo.getVendors({}, employeeCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('createVendor', () => {
    it('throws for non-admin', async () => {
      await expect(repo.createVendor({ name: 'Test' }, managerCtx)).rejects.toThrow('Admin access required')
    })
  })
})
```

- [ ] **Step 3: Write failing tests for ManagerEmployeeRepository**

Create `src/lib/repositories/__tests__/ManagerEmployeeRepository.rbac.test.ts`:

```typescript
import { ManagerEmployeeRepository } from '@/lib/repositories/ManagerEmployeeRepository'
import type { UserContext } from '@/lib/auth/types'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    executeTakeFirst: jest.fn().mockResolvedValue(null),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    fn: { count: jest.fn().mockReturnValue({ as: jest.fn() }) },
  },
}))

describe('ManagerEmployeeRepository RBAC', () => {
  let repo: ManagerEmployeeRepository

  const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }
  const managerCtx: UserContext = { employeeId: 2, isAdmin: false, isManager: true, managedEmployeeIds: [10] }

  beforeEach(() => {
    repo = new ManagerEmployeeRepository()
  })

  describe('getManagers', () => {
    it('throws for non-admin', async () => {
      await expect(repo.getManagers(managerCtx)).rejects.toThrow('Admin access required')
    })
  })

  describe('assignEmployees', () => {
    it('throws for non-admin', async () => {
      await expect(
        repo.assignEmployees(1, [10, 11], managerCtx)
      ).rejects.toThrow('Admin access required')
    })
  })
})
```

- [ ] **Step 4: Run all three test files to verify they fail**

Run: `bun test src/lib/repositories/__tests__/InvoiceAuditRepository.rbac.test.ts src/lib/repositories/__tests__/VendorRepository.rbac.test.ts src/lib/repositories/__tests__/ManagerEmployeeRepository.rbac.test.ts`
Expected: FAIL — methods don't accept `UserContext`

- [ ] **Step 5: Add admin-only gates to all four repositories**

For each repository (`InvoiceAuditRepository`, `VendorRepository`, `VendorFieldRepository`, `ManagerEmployeeRepository`):

1. Add import:
```typescript
import type { UserContext } from '@/lib/auth/types'
```

2. Add `userContext: UserContext` as the last parameter to every public method.

3. Add admin-only gate as the first line of every method:
```typescript
if (!userContext.isAdmin) {
  throw new Error('Admin access required')
}
```

**Exception**: `InvoiceAuditRepository.createAuditRecord` is called internally by `InvoiceRepository.saveInvoiceData` — it should NOT require `UserContext` because the caller has already been authorized. Only add `UserContext` to the read/search methods.

- [ ] **Step 6: Update callers**

Key callers to update:
- `src/app/api/invoices/audit/[invoiceId]/route.ts` — change from manager|admin to admin-only, pass `userContext`
- `src/app/api/overrides/route.ts` and `src/app/api/overrides/[id]/route.ts` — already admin-only, pass `userContext`
- `src/app/api/vendors/route.ts` — already admin-only, pass `userContext`
- Any server components that call these repositories

- [ ] **Step 7: Run all tests**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/lib/repositories/InvoiceAuditRepository.ts src/lib/repositories/VendorRepository.ts
git add src/lib/repositories/VendorFieldRepository.ts src/lib/repositories/ManagerEmployeeRepository.ts
git add src/lib/repositories/__tests__/InvoiceAuditRepository.rbac.test.ts
git add src/lib/repositories/__tests__/VendorRepository.rbac.test.ts
git add src/lib/repositories/__tests__/ManagerEmployeeRepository.rbac.test.ts
git add src/app/api/invoices/audit/ src/app/api/overrides/ src/app/api/vendors/
git commit -m "feat: add RBAC enforcement to audit, vendor, and manager-employee repositories"
```

---

## Task 6: Update BillingRepository to Use UserContext

**Files:**
- Modify: `src/lib/repositories/BillingRepository.ts`
- Modify: `src/lib/repositories/__tests__/BillingRepository.test.ts`

BillingRepository already has access control on `getSubscriptionsBySubscriber` and `getPaymentHistory` using a `currentUser` parameter. This task migrates those to use the shared `UserContext` type.

- [ ] **Step 1: Update BillingRepository to import UserContext**

In `src/lib/repositories/BillingRepository.ts`:

1. Add import:
```typescript
import type { UserContext } from '@/lib/auth/types'
```

2. Change `getSubscriptionsBySubscriber` signature from:
```typescript
async getSubscriptionsBySubscriber(
  subscriberId: number,
  currentUser: { isAdmin: boolean; subscriberId?: number | null }
): Promise<SubscriptionDetail[]>
```
to:
```typescript
async getSubscriptionsBySubscriber(
  subscriberId: number,
  userContext: UserContext
): Promise<SubscriptionDetail[]>
```

Update the body to use `userContext.isAdmin` and `userContext.subscriberId`.

3. Apply the same change to `getPaymentHistory`.

4. Leave `getSubscriptionByStripeId` and `getPaymentByInvoiceId` unchanged (webhook methods).

- [ ] **Step 2: Update callers**

Update any API routes or pages that call these methods to pass `UserContext` instead of the old `currentUser` shape. The session already has `subscriberId` available.

- [ ] **Step 3: Run existing BillingRepository tests**

Run: `bun test src/lib/repositories/__tests__/BillingRepository.test.ts`
Expected: Tests may need minor updates to match new parameter type. Fix any failures.

- [ ] **Step 4: Run full test suite**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/BillingRepository.ts src/lib/repositories/__tests__/BillingRepository.test.ts
git commit -m "refactor: migrate BillingRepository to shared UserContext type"
```

---

## Task 7: Harden API Routes

**Files:**
- Modify: `src/app/api/documents/route.ts`
- Modify: `src/app/api/documents/[id]/route.ts`
- Modify: `src/app/api/invoices/route.ts`
- Modify: `src/app/api/invoices/search/route.ts`
- Modify: `src/app/api/invoices/audit/[invoiceId]/route.ts`
- Modify: `src/app/api/debug/env/route.ts`

Most repository-level changes in Tasks 2-6 already required updating callers. This task handles the remaining API route hardening that isn't covered by repository changes.

- [ ] **Step 1: Harden `POST /api/invoices`**

In `src/app/api/invoices/route.ts`, the POST handler currently only checks for `employeeId`. Change to require manager or admin:

```typescript
// In POST handler, after session check:
if (!session.user.isAdmin && !session.user.isManager) {
  return NextResponse.json({ error: 'Manager or admin access required' }, { status: 403 })
}
```

- [ ] **Step 2: Harden `GET /api/invoices/search`**

In `src/app/api/invoices/search/route.ts`, implement manager-employee filtering. The route already checks for manager|admin. Add `userContext` and pass to repo:

```typescript
const userContext = await getEmployeeContext(
  session.user.employeeId,
  session.user.isAdmin,
  session.user.isManager
)
```

Pass `userContext` to any repository calls so manager results are scoped to direct reports.

- [ ] **Step 3: Change audit route to admin-only**

In `src/app/api/invoices/audit/[invoiceId]/route.ts`, change the permission check from:
```typescript
if (!session.user.isManager && !session.user.isAdmin) {
```
to:
```typescript
if (!session.user.isAdmin) {
```

- [ ] **Step 4: Add auth to debug env route**

In `src/app/api/debug/env/route.ts`, add session check:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'

export async function GET(request: NextRequest) {
  // Existing NODE_ENV check
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Add admin auth check
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // ... existing logic
}
```

- [ ] **Step 5: Run full test suite**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/app/api/invoices/ src/app/api/documents/ src/app/api/debug/
git commit -m "feat: harden API routes with role-based access checks"
```

---

## Task 8: Add Server-Side Auth Wrappers to Admin Pages

**Files:**
- 10 admin page directories (see file map above)

All 10 admin pages are `'use client'` components. The fix: rename the current `page.tsx` to a client component file, and create a new server `page.tsx` that checks auth and renders the client component.

- [ ] **Step 1: Create a `requireAuth` helper**

Create `src/lib/auth/require-auth.ts`:

```typescript
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth-options'

type Role = 'ADMIN' | 'MANAGER' | 'SUPER_ADMIN'

/**
 * Server-side auth check for protected pages.
 * Redirects to /forbidden if the user lacks the required role.
 * Returns the session if authorized.
 */
export async function requireAuth(role: Role) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  switch (role) {
    case 'SUPER_ADMIN':
      if (!session.user.isSuperAdmin) redirect('/forbidden')
      break
    case 'ADMIN':
      if (!session.user.isAdmin) redirect('/forbidden')
      break
    case 'MANAGER':
      if (!session.user.isAdmin && !session.user.isManager) redirect('/forbidden')
      break
  }

  return session
}
```

- [ ] **Step 2: Apply wrapper pattern to each admin page**

For each of the 10 pages, follow this pattern. Example for `/admin/vendors`:

1. Rename `src/app/(portal)/admin/vendors/page.tsx` to `src/app/(portal)/admin/vendors/vendors-client.tsx`

2. In `vendors-client.tsx`, change the default export name to match (e.g., `VendorsClient`). Keep `'use client'` directive.

3. Create new `src/app/(portal)/admin/vendors/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth/require-auth'
import VendorsClient from './vendors-client'

export default async function VendorsPage() {
  await requireAuth('ADMIN')
  return <VendorsClient />
}
```

Repeat for all 10 pages:

| Directory | Client file name | Role |
|-----------|-----------------|------|
| `admin/feature-flags` | `feature-flags-client.tsx` | `SUPER_ADMIN` |
| `admin/invoice-search` | `invoice-search-client.tsx` | `ADMIN` |
| `admin/payroll-monitoring` | `payroll-monitoring-client.tsx` | `ADMIN` |
| `admin/settings` | `settings-client.tsx` | `ADMIN` |
| `admin/tools` | `tools-client.tsx` | `ADMIN` |
| `admin/vendors` | `vendors-client.tsx` | `ADMIN` |
| `admin/billing/subscribers` | `subscribers-client.tsx` | `ADMIN` |
| `admin/billing/subscribers/[id]` | `subscriber-detail-client.tsx` | `ADMIN` |
| `admin/billing/subscribers/new` | `new-subscriber-client.tsx` | `ADMIN` |
| `admin/billing/products` | `products-client.tsx` | `ADMIN` |

- [ ] **Step 3: Verify the app builds**

Run: `bun build`
Expected: Build succeeds with no errors in modified pages

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/require-auth.ts
git add src/app/\(portal\)/admin/
git commit -m "feat: add server-side auth wrappers to all admin pages"
```

---

## Task 9: E2E Browser Tests for RBAC

**Files:**
- Create: `tests/e2e/rbac-enforcement.spec.ts`

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/rbac-enforcement.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

// Test accounts from CLAUDE.md
const ADMIN = { email: 'admin@test.com', password: 'password123' }
const MANAGER = { email: 'manager@test.com', password: 'password123' }
const EMPLOYEE = { email: 'employee@test.com', password: 'password123' }

async function login(page, user: { email: string; password: string }) {
  await page.goto('/api/auth/signin')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/(?!.*signin)/)
}

test.describe('RBAC - Employee Role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, EMPLOYEE)
  })

  test('E1: redirected from /admin/employees to /forbidden', async ({ page }) => {
    await page.goto('/admin/employees')
    await expect(page).toHaveURL(/forbidden/)
  })

  test('E3: redirected from /admin/vendors to /forbidden', async ({ page }) => {
    await page.goto('/admin/vendors')
    await expect(page).toHaveURL(/forbidden/)
  })

  test('E4: redirected from /admin/invoice-search to /forbidden', async ({ page }) => {
    await page.goto('/admin/invoice-search')
    await expect(page).toHaveURL(/forbidden/)
  })

  test('E7: can view /documents', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.locator('body')).not.toContainText('forbidden')
  })

  test('E8: DELETE /api/documents returns 403', async ({ page, request }) => {
    const response = await request.delete('/api/documents/1')
    expect(response.status()).toBe(403)
  })

  test('E9: GET /api/invoices returns 403', async ({ page, request }) => {
    const response = await request.get('/api/invoices')
    expect(response.status()).toBe(403)
  })
})

test.describe('RBAC - Manager Role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MANAGER)
  })

  test('M1: redirected from /admin/employees to /forbidden', async ({ page }) => {
    await page.goto('/admin/employees')
    await expect(page).toHaveURL(/forbidden/)
  })

  test('M5: redirected from /admin/vendors to /forbidden', async ({ page }) => {
    await page.goto('/admin/vendors')
    await expect(page).toHaveURL(/forbidden/)
  })

  test('M6: GET /api/invoices/audit returns 403', async ({ page, request }) => {
    const response = await request.get('/api/invoices/audit/1')
    expect(response.status()).toBe(403)
  })

  test('M7: can view /documents', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.locator('body')).not.toContainText('forbidden')
  })
})

test.describe('RBAC - Admin Role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
  })

  test('A1: can view all employees', async ({ page }) => {
    await page.goto('/admin/employees')
    await expect(page.locator('body')).not.toContainText('forbidden')
  })

  test('A2: can access vendors page', async ({ page }) => {
    await page.goto('/admin/vendors')
    await expect(page.locator('body')).not.toContainText('forbidden')
  })

  test('A4: can access documents with edit capabilities', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.locator('body')).not.toContainText('forbidden')
  })
})

test.describe('RBAC - Unauthenticated', () => {
  test('X1: API calls return 401', async ({ request }) => {
    const endpoints = [
      '/api/employees',
      '/api/documents',
      '/api/invoices',
      '/api/invoices/search',
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint)
      expect(response.status()).toBe(401)
    }
  })
})
```

- [ ] **Step 2: Run E2E tests**

Run: `bun test:e2e tests/e2e/rbac-enforcement.spec.ts`
Expected: All tests pass (requires dev server running)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/rbac-enforcement.spec.ts
git commit -m "test: add E2E browser tests for RBAC enforcement"
```

---

## Task 10: Final Verification & Cleanup

- [ ] **Step 1: Run full unit test suite**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 2: Run full E2E test suite**

Run: `bun test:e2e`
Expected: All tests pass (including existing tests — no regressions)

- [ ] **Step 3: Run build**

Run: `bun build`
Expected: Build succeeds

- [ ] **Step 4: Run linter**

Run: `bun lint`
Expected: No new lint errors from changed files

- [ ] **Step 5: Final commit (if any cleanup needed)**

```bash
git commit -m "chore: RBAC enforcement cleanup and final verification"
```
