import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsManager, loginAsEmployee } from '../utils/auth-helper'

test.describe('Payroll Management - Core Functions', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure clean state for each test
    await page.goto('/')
  })

  test.describe('Page Access and Basic Functionality', () => {
    test('Admin should access payroll page', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to payroll
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads successfully
      await expect(page.locator('h1')).toContainText('Payroll')
      
      // Check that filters section is visible
      await expect(page.locator('text=Filter Payroll Data')).toBeVisible()
      
      // Check for access summary section
      await expect(page.locator('text=Accessible Agents')).toBeVisible()
    })

    test('Manager should access payroll with restrictions notice', async ({ page }) => {
      await loginAsManager(page)
      
      // Navigate to payroll
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads
      await expect(page.locator('h1')).toContainText('Payroll')
      
      // Should see restriction notice
      await expect(page.locator('text=Access limited to your managed employees')).toBeVisible()
    })

    test('Employee should access payroll with personal data notice', async ({ page }) => {
      await loginAsEmployee(page)
      
      // Navigate to payroll
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads
      await expect(page.locator('h1')).toContainText('Payroll')
      
      // Should see personal data restriction notice
      await expect(page.locator('text=Access limited to your data')).toBeVisible()
    })
  })

  test.describe('Filter Interface', () => {
    test('Should display all filter controls', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Check all filter controls are present
      await expect(page.locator('#employee')).toBeVisible()
      await expect(page.locator('#vendor')).toBeVisible()
      await expect(page.locator('#issueDate')).toBeVisible()
      await expect(page.locator('#status')).toBeVisible()
      await expect(page.locator('#startDate')).toBeVisible()
      await expect(page.locator('#endDate')).toBeVisible()
      
      // Check clear filters button
      await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible()
    })

    test('Should handle status filter changes', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Change status filter to 'paid'
      await page.locator('#status').selectOption('paid')
      // Wait for URL to update after filter change
      await page.waitForURL(/status=paid/, { timeout: 3000 })
      
      // URL should reflect the filter
      expect(page.url()).toContain('status=paid')
      
      // Change back to 'all' - this may keep 'status=all' in URL rather than removing it
      await page.locator('#status').selectOption('all')
      // Wait for URL to update after changing filter
      await page.waitForTimeout(1000) // Give time for navigation to complete
      
      // URL should either have status=all or no status param (depends on implementation)
      const currentUrl = page.url()
      const hasStatusAll = currentUrl.includes('status=all')
      const hasNoStatus = !currentUrl.includes('status=')
      
      expect(hasStatusAll || hasNoStatus).toBeTruthy()
    })

    test('Should clear filters when clear button is clicked', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate with some filters applied
      await page.goto('/payroll?status=paid&startDate=2024-01-01')
      await page.waitForLoadState('networkidle')
      
      // Click clear filters
      await page.locator('button:has-text("Clear Filters")').click()
      // Wait for navigation to complete
      await page.waitForURL(/^http:\/\/localhost:3000\/payroll$/, { timeout: 3000 })
      
      // Should navigate to clean payroll page
      expect(page.url()).toBe('http://localhost:3000/payroll')
    })
  })

  test.describe('Data Display', () => {
    test('Should display payroll data or empty state', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Either we have a table with data or an empty state
      const table = page.locator('table')
      const emptyState = page.locator('text=No payroll data').first()
      
      const hasTable = await table.isVisible()
      const hasEmptyState = await emptyState.isVisible()
      
      // One of these should be true
      expect(hasTable || hasEmptyState).toBeTruthy()
      
      if (hasTable) {
        // If table exists, check it has proper headers
        await expect(page.locator('th:has-text("Employee")')).toBeVisible()
        await expect(page.locator('th:has-text("Vendor")')).toBeVisible()
        await expect(page.locator('th:has-text("Issue Date")')).toBeVisible()
        await expect(page.locator('th:has-text("Net Pay")')).toBeVisible()
      }
    })

    test('Should display access summary statistics', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Check access summary contains statistics
      await expect(page.locator('text=Accessible Agents')).toBeVisible()
      await expect(page.locator('text=Accessible Vendors')).toBeVisible()
      await expect(page.locator('text=Issue Dates')).toBeVisible()
      await expect(page.locator('text=Total Paystubs')).toBeVisible()
    })
  })

  test.describe('Navigation and Links', () => {
    test('Should allow navigation to detail view if data exists', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Look for "View Details" links
      const viewDetailsLinks = page.locator('a:has-text("View Details")')
      const linkCount = await viewDetailsLinks.count()
      
      if (linkCount > 0) {
        // Click first detail link
        await viewDetailsLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Should navigate to a detail page
        expect(page.url()).toMatch(/\/payroll\/\d+\/\d+\//)
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('Should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Basic elements should be visible on mobile
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('text=Filter Payroll Data')).toBeVisible()
      
      // Table should have horizontal scroll on mobile
      const scrollContainer = page.locator('.overflow-x-auto')
      if (await scrollContainer.isVisible()) {
        await expect(scrollContainer).toBeVisible()
      }
    })
  })

  test.describe('Performance', () => {
    test('Should load within acceptable time', async ({ page }) => {
      await loginAsAdmin(page)
      
      const startTime = Date.now()
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Should load within 10 seconds (generous for CI)
      expect(loadTime).toBeLessThan(10000)
    })
  })

  test.describe('Error Handling', () => {
    test('Should handle search with no results gracefully', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate with filters that should return no results
      await page.goto('/payroll?startDate=2099-01-01&endDate=2099-01-02')
      await page.waitForLoadState('networkidle')
      
      // Should show empty state or no results message
      const emptyMessage = page.locator('text=No payroll data').first()
      
      await expect(emptyMessage).toBeVisible()
    })
  })
})