import { test, expect } from '@playwright/test'

test.describe('Website Services Marketing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as a subscriber/employee user
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'employee@test.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|subscriber)/)
  })

  test('renders hero section and navigation', async ({ page }) => {
    await page.goto('/services')
    await expect(page.getByText('Your Brand. Your Website.')).toBeVisible()
    await expect(page.getByText('See Pricing')).toBeVisible()
    await expect(page.getByText('Learn More')).toBeVisible()
  })

  test('renders pain points section', async ({ page }) => {
    await page.goto('/services')
    await expect(page.getByText('No Online Credibility')).toBeVisible()
    await expect(page.getByText('Manual Document Sharing')).toBeVisible()
    await expect(page.getByText('No Lead Capture')).toBeVisible()
  })

  test('renders services section', async ({ page }) => {
    await page.goto('/services')
    await expect(page.getByText('Landing Pages')).toBeVisible()
    await expect(page.getByText('Business Websites')).toBeVisible()
    await expect(page.getByText('Web Applications')).toBeVisible()
    await expect(page.getByText('Enterprise Solutions')).toBeVisible()
  })

  test('renders how it works section', async ({ page }) => {
    await page.goto('/services')
    await expect(page.getByText('Choose Your Package')).toBeVisible()
    await expect(page.getByText('We Build It')).toBeVisible()
    await expect(page.getByText('Launch & Grow')).toBeVisible()
  })

  test('shows pricing section', async ({ page }) => {
    await page.goto('/services')
    const pricingSection = page.locator('#pricing')
    await expect(pricingSection).toBeVisible()
  })
})
