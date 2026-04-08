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

  test('preview endpoint returns valid response for non-existent record', async ({ page }) => {
    // Use page.request to share the authenticated session from beforeEach
    const response = await page.request.get('/api/admin/payroll/99999/99999/2026-01-01/preview')
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.canDelete).toBe(false)
  })

  test('delete endpoint requires reason', async ({ page }) => {
    const response = await page.request.delete('/api/admin/payroll/1/1/2026-01-01', {
      data: { reason: '' },
    })
    // Should return 400 (missing reason)
    expect(response.status()).toBe(400)
  })

  test('non-admin cannot access preview endpoint', async ({ page }) => {
    // Logout and login as employee
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'employee@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)/)

    const response = await page.request.get('/api/admin/payroll/1/1/2026-01-01/preview')
    expect([401, 403]).toContain(response.status())
  })

  test('delete button only visible on unpaid rows', async ({ page }) => {
    await page.goto('/admin/payroll-monitoring')
    await page.waitForLoadState('networkidle')

    // Use exact text match to avoid "Unpaid" matching "Paid"
    const paidBadges = page.locator('tr').filter({ has: page.getByText('Paid', { exact: true }) })
    const paidDeleteButtons = paidBadges.locator('button:has(svg.lucide-trash-2)')

    if (await paidBadges.count() > 0) {
      expect(await paidDeleteButtons.count()).toBe(0)
    }
  })
})
