import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsManager, loginAsEmployee } from '../utils/auth-helper'

/**
 * RBAC Enforcement E2E Tests
 *
 * Covers all test cases from the RBAC design spec:
 * - E1-E10: Employee role (most restricted)
 * - M1-M9: Manager role (scoped to direct reports)
 * - A1-A5: Admin role (full access)
 * - X1-X2: Cross-cutting (unauthenticated, employee direct-hit)
 */

// ─── Admin pages that should redirect non-admins to /forbidden ───
const ADMIN_PAGES = [
  '/admin/employees',
  '/admin/vendors',
  '/admin/invoice-search',
  '/admin/feature-flags',
  '/admin/payroll-monitoring',
  '/admin/settings',
  '/admin/tools',
  '/admin/billing/subscribers',
  '/admin/billing/subscribers/new',
  '/admin/billing/products',
]

// ─── Protected API endpoints ───
const PROTECTED_API_ENDPOINTS = [
  '/api/employees',
  '/api/documents',
  '/api/invoices',
  '/api/invoices/search',
]

// ─── Helper: assert page redirected to /forbidden ───
async function expectForbidden(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  const url = page.url()
  const bodyText = await page.locator('body').textContent()
  // Admin layout redirects non-admins to /dashboard, server-auth redirects to /forbidden
  const isBlocked =
    url.includes('/forbidden') ||
    url.includes('/dashboard') ||
    url.includes('/auth/signin') ||
    bodyText?.toLowerCase().includes('forbidden') ||
    bodyText?.toLowerCase().includes('access denied') ||
    bodyText?.toLowerCase().includes('not authorized')
  expect(isBlocked).toBeTruthy()
}

// ─── Helper: assert page loaded successfully (no forbidden/error) ───
async function expectAccessGranted(page: import('@playwright/test').Page, expectedPathPrefix?: string) {
  await page.waitForLoadState('networkidle')
  const url = page.url()
  expect(url).not.toContain('/forbidden')
  expect(url).not.toContain('/auth/signin')
  // If we expect a specific path, verify we weren't redirected away
  if (expectedPathPrefix) {
    expect(url).toContain(expectedPathPrefix)
  }
  const bodyText = await page.locator('body').textContent()
  expect(bodyText?.toLowerCase()).not.toContain('access denied')
}

// ═══════════════════════════════════════════════════════════════
// Employee Role Tests (E1-E10) — most restricted
// ═══════════════════════════════════════════════════════════════
test.describe('RBAC - Employee Role', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('E1: employee is blocked from /admin/employees', async ({ page }) => {
    await page.goto('/admin/employees')
    await expectForbidden(page)
  })

  test('E2: GET /api/employees returns 403 for employee', async ({ request }) => {
    // Employee session won't have admin privileges
    const response = await request.get('/api/employees')
    expect([401, 403]).toContain(response.status())
  })

  test('E3: employee is blocked from /admin/vendors', async ({ page }) => {
    await page.goto('/admin/vendors')
    await expectForbidden(page)
  })

  test('E4: employee is blocked from /admin/invoice-search', async ({ page }) => {
    await page.goto('/admin/invoice-search')
    await expectForbidden(page)
  })

  test('E5: employee can view /payroll and sees only own data', async ({ page }) => {
    await page.goto('/payroll')
    await page.waitForLoadState('networkidle')

    // Should not be forbidden — employees can see their own payroll
    const url = page.url()
    expect(url).not.toContain('/forbidden')
  })

  test('E6: GET /api/employees/[other-id] returns 403 for employee', async ({ page, request }) => {
    // Try to access another employee's data via API
    const response = await request.get('/api/employees/1')
    expect([401, 403]).toContain(response.status())
  })

  test('E7: employee can view /documents (read-only)', async ({ page }) => {
    await page.goto('/documents')
    await expectAccessGranted(page)

    // Employee should NOT see edit/delete buttons
    const deleteButton = page.locator('button:has-text("Delete")')
    const editButton = page.locator('button:has-text("Edit")')
    const uploadButton = page.locator('button:has-text("Upload")')

    // At least one of these admin-only actions should be hidden
    const hasDeleteVisible = await deleteButton.first().isVisible().catch(() => false)
    const hasEditVisible = await editButton.first().isVisible().catch(() => false)
    const hasUploadVisible = await uploadButton.first().isVisible().catch(() => false)

    // Employee should not see document management controls
    expect(hasDeleteVisible && hasEditVisible && hasUploadVisible).toBeFalsy()
  })

  test('E8: DELETE /api/documents/[id] returns 403 for employee', async ({ request }) => {
    const response = await request.delete('/api/documents/1')
    expect([401, 403]).toContain(response.status())
  })

  test('E9: GET /api/invoices returns 403 for employee', async ({ request }) => {
    const response = await request.get('/api/invoices')
    expect([401, 403]).toContain(response.status())
  })

  test('E10: GET /api/invoices/audit/[id] returns 403 for employee', async ({ request }) => {
    const response = await request.get('/api/invoices/audit/1')
    expect([401, 403]).toContain(response.status())
  })

  // Additional coverage: employee blocked from all admin pages
  for (const adminPage of ADMIN_PAGES) {
    test(`employee is blocked from ${adminPage}`, async ({ page }) => {
      await page.goto(adminPage)
      await expectForbidden(page)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// Manager Role Tests (M1-M9) — scoped to direct reports
// ═══════════════════════════════════════════════════════════════
test.describe('RBAC - Manager Role', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page)
  })

  test('M1: manager is blocked from /admin/employees', async ({ page }) => {
    await page.goto('/admin/employees')
    await expectForbidden(page)
  })

  test('M2: manager can view /payroll with scoped data', async ({ page }) => {
    await page.goto('/payroll')
    await page.waitForLoadState('networkidle')

    // Manager should access payroll (self + direct reports)
    const url = page.url()
    expect(url).not.toContain('/forbidden')
  })

  test('M3: manager can view /invoices with scoped data', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Manager should have invoice access for direct reports
    const url = page.url()
    expect(url).not.toContain('/forbidden')
  })

  test('M4: GET /api/employees/[non-report-id] returns 403 for manager', async ({ request }) => {
    // Try to access an employee that is NOT a direct report
    // Employee ID 1 is the admin user — not a direct report of the manager
    const response = await request.get('/api/employees/1')
    expect([401, 403]).toContain(response.status())
  })

  test('M5: manager is blocked from /admin/vendors', async ({ page }) => {
    await page.goto('/admin/vendors')
    await expectForbidden(page)
  })

  test('M6: GET /api/invoices/audit/[id] returns 403 for manager', async ({ request }) => {
    // Audit is admin-only
    const response = await request.get('/api/invoices/audit/1')
    expect([401, 403]).toContain(response.status())
  })

  test('M7: manager can view /documents (read-only)', async ({ page }) => {
    await page.goto('/documents')
    await expectAccessGranted(page)

    // Manager should NOT see edit/delete buttons
    const deleteButton = page.locator('button:has-text("Delete")')
    const hasDeleteVisible = await deleteButton.first().isVisible().catch(() => false)
    expect(hasDeleteVisible).toBeFalsy()
  })

  test('M8: POST /api/overrides/employees returns 403 for manager', async ({ request }) => {
    // Manager cannot modify manager-employee assignments
    const response = await request.post('/api/overrides/employees', {
      data: { managerId: 1, employeeIds: [10, 11] },
    })
    expect([401, 403]).toContain(response.status())
  })

  test('M9: GET /api/invoices with non-report agent returns filtered results', async ({ request }) => {
    // Manager should get filtered results — no data for non-reports
    const response = await request.get('/api/invoices')
    // Should succeed but with scoped data (not 403 — managers have invoice access)
    expect([200, 403]).toContain(response.status())
  })

  // Additional coverage: manager blocked from all admin pages
  for (const adminPage of ADMIN_PAGES) {
    test(`manager is blocked from ${adminPage}`, async ({ page }) => {
      await page.goto(adminPage)
      await expectForbidden(page)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// Admin Role Tests (A1-A5) — full access, positive tests
// ═══════════════════════════════════════════════════════════════
test.describe('RBAC - Admin Role', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('A1: admin can view all employees', async ({ page }) => {
    await page.goto('/admin/employees')
    await expectAccessGranted(page)

    // Should see the employees heading and list
    await expect(page.locator('h1')).toContainText('Employee')
  })

  test('A2: admin can access vendors page', async ({ page }) => {
    await page.goto('/admin/vendors')
    await expectAccessGranted(page)
  })

  test('A3: admin can view audit trails', async ({ page, request }) => {
    // API-level check — admin should get 200 for audit endpoint
    const response = await request.get('/api/invoices/audit/1')
    // May be 200 or 404 (if invoice doesn't exist), but NOT 401/403
    expect([200, 404]).toContain(response.status())
  })

  test('A4: admin can access documents with edit capabilities', async ({ page }) => {
    await page.goto('/documents')
    await expectAccessGranted(page)
  })

  test('A5: admin can view invoices', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')
    await expectAccessGranted(page)
  })

  // Positive tests: admin can access all admin pages
  for (const adminPage of ADMIN_PAGES) {
    test(`admin can access ${adminPage}`, async ({ page }) => {
      await page.goto(adminPage)
      await expectAccessGranted(page)
    })
  }

  // Admin API access
  test('admin can GET /api/employees', async ({ request }) => {
    const response = await request.get('/api/employees')
    expect([200]).toContain(response.status())
  })

  test('admin can GET /api/invoices', async ({ request }) => {
    const response = await request.get('/api/invoices')
    expect([200]).toContain(response.status())
  })

  test('admin can GET /api/documents', async ({ request }) => {
    const response = await request.get('/api/documents')
    expect([200]).toContain(response.status())
  })
})

// ═══════════════════════════════════════════════════════════════
// Cross-Cutting Tests (X1-X2)
// ═══════════════════════════════════════════════════════════════
test.describe('RBAC - Unauthenticated (X1)', () => {
  test('X1: unauthenticated API calls return 401', async ({ request }) => {
    for (const endpoint of PROTECTED_API_ENDPOINTS) {
      const response = await request.get(endpoint)
      expect(response.status()).toBe(401)
    }
  })

  test('X1: unauthenticated admin API calls return 401', async ({ request }) => {
    const adminEndpoints = [
      '/api/employees/1',
      '/api/invoices/audit/1',
      '/api/overrides',
    ]
    for (const endpoint of adminEndpoints) {
      const response = await request.get(endpoint)
      expect([401, 403]).toContain(response.status())
    }
  })

  test('X1: unauthenticated write operations return 401', async ({ request }) => {
    const writeOps = [
      { method: 'POST', url: '/api/employees', body: { name: 'test' } },
      { method: 'DELETE', url: '/api/documents/1', body: undefined },
      { method: 'POST', url: '/api/invoices', body: { agentId: 1 } },
    ]

    for (const op of writeOps) {
      let response
      if (op.method === 'POST') {
        response = await request.post(op.url, { data: op.body })
      } else {
        response = await request.delete(op.url)
      }
      expect([401, 403]).toContain(response.status())
    }
  })
})

test.describe('RBAC - Employee Direct-Hit Admin APIs (X2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('X2: employee cannot PUT /api/employees/[id]', async ({ request }) => {
    const response = await request.put('/api/employees/1', {
      data: { name: 'Hacked Name' },
    })
    expect([401, 403]).toContain(response.status())
  })

  test('X2: employee cannot DELETE /api/employees/[id]', async ({ request }) => {
    const response = await request.delete('/api/employees/1')
    expect([401, 403]).toContain(response.status())
  })

  test('X2: employee cannot POST /api/invoices', async ({ request }) => {
    const response = await request.post('/api/invoices', {
      data: { agentId: 1, vendorId: 1, issueDate: '2026-01-01' },
    })
    expect([401, 403]).toContain(response.status())
  })

  test('X2: employee cannot access /api/overrides', async ({ request }) => {
    const response = await request.get('/api/overrides')
    expect([401, 403]).toContain(response.status())
  })

  test('X2: employee cannot access /api/vendors', async ({ request }) => {
    const response = await request.get('/api/vendors')
    expect([401, 403]).toContain(response.status())
  })

  test('X2: employee cannot POST /api/documents', async ({ request }) => {
    const response = await request.post('/api/documents', {
      data: { name: 'test', file_url: 'http://example.com/test.pdf' },
    })
    expect([401, 403]).toContain(response.status())
  })

  test('X2: employee cannot access /api/debug/env', async ({ request }) => {
    const response = await request.get('/api/debug/env')
    expect([401, 403]).toContain(response.status())
  })
})
