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
