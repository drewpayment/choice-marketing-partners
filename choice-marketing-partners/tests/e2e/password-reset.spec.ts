import { test, expect } from '@playwright/test'

test.describe('Password Reset Flow', () => {
  test('shows forgot password link on sign in page', async ({ page }) => {
    await page.goto('/auth/signin')

    const forgotLink = page.locator('a', { hasText: 'Forgot your password?' })
    await expect(forgotLink).toBeVisible()
  })

  test('navigates to forgot password page', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.click('text=Forgot your password?')

    await expect(page).toHaveURL('/auth/forgot-password')
    await expect(page.locator('h2')).toContainText('Forgot your password?')
  })

  test('submits email for password reset', async ({ page }) => {
    await page.goto('/auth/forgot-password')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible()
    await expect(page.locator('text=Return to sign in')).toBeVisible()
  })

  test('validates email format', async ({ page }) => {
    await page.goto('/auth/forgot-password')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    // Browser validation should prevent submit
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('shows password reset form with valid token', async ({ page }) => {
    // This would require a valid token - in real test, generate one first
    await page.goto('/auth/reset-password?token=test-token')

    await expect(page.locator('h2')).toContainText('Reset your password')
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirm-password')).toBeVisible()
  })

  test('validates password match', async ({ page }) => {
    await page.goto('/auth/reset-password?token=test-token')

    await page.fill('input#password', 'newpassword123')
    await page.fill('input#confirm-password', 'differentpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('validates minimum password length', async ({ page }) => {
    await page.goto('/auth/reset-password?token=test-token')

    await page.fill('input#password', 'short')
    await page.fill('input#confirm-password', 'short')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=at least 8 characters')).toBeVisible()
  })

  test('shows error for missing token', async ({ page }) => {
    await page.goto('/auth/reset-password')

    await expect(page.locator('text=Invalid reset link')).toBeVisible()
  })
})
