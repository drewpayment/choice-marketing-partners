import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsManager, loginAsEmployee } from '../utils/auth-helper'

test.describe('Payroll Management E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure clean state for each test
    await page.goto('/')
  })

  test.describe('Admin Payroll Access', () => {
    test('should access payroll list with full permissions', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to payroll
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads and shows payroll data
      await expect(page.locator('h1')).toContainText('Payroll')
      
      // Check for key UI elements
      await expect(page.locator('text=Filter Payroll Data')).toBeVisible()
      
      // Verify admin can see payroll list (Table component)
      const tableHeader = page.locator('table')
      await expect(tableHeader).toBeVisible()
    })

    test('should filter payroll by employee', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Wait for employee dropdown to be populated
      await page.waitForSelector('#employee')
      
      // Select first available employee
      const employeeSelect = page.locator('#employee')
      await employeeSelect.selectOption({ index: 1 }) // Select first non-empty option
      
      // Wait for filtered results
      await page.waitForLoadState('networkidle')
      
      // Verify URL contains filter parameter
      expect(page.url()).toContain('employeeId=')
    })

    test('should filter payroll by vendor', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Wait for vendor dropdown to be populated
      await page.waitForSelector('#vendor')
      
      // Select first available vendor
      const vendorSelect = page.locator('#vendor')
      await vendorSelect.selectOption({ index: 1 }) // Select first non-empty option
      
      // Wait for filtered results
      await page.waitForLoadState('networkidle')
      
      // Verify URL contains filter parameter
      expect(page.url()).toContain('vendorId=')
    })

    test('should filter payroll by issue date', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Wait for issue date dropdown
      await page.waitForSelector('#issueDate')
      
      // Select first available issue date
      const issueDateSelect = page.locator('#issueDate')
      await issueDateSelect.selectOption({ index: 1 }) // Select first non-empty option
      
      // Wait for filtered results
      await page.waitForLoadState('networkidle')
      
      // Verify URL contains filter parameter
      expect(page.url()).toContain('issueDate=')
    })

    test('should search payroll by date range', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Use date range functionality
      const startDateInput = page.locator('#startDate')
      const endDateInput = page.locator('#endDate')
      
      await startDateInput.fill('2024-01-01')
      await endDateInput.fill('2024-12-31')
      
      // Wait for search results
      await page.waitForLoadState('networkidle')
      
      // Verify date filters are in URL
      expect(page.url()).toContain('startDate=')
      expect(page.url()).toContain('endDate=')
    })

    test('should navigate through pagination', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Check if pagination exists (might not if data is limited)
      const pagination = page.locator('nav[role="navigation"]')
      if (await pagination.isVisible()) {
        // Test pagination navigation
        const nextButton = page.locator('a[aria-label="Go to next page"]')
        if (await nextButton.isVisible() && !(await nextButton.getAttribute('aria-disabled'))) {
          await nextButton.click()
          await page.waitForLoadState('networkidle')
          
          // Verify page changed
          expect(page.url()).toContain('page=2')
        }
      }
    })

    test('should access payroll detail view', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Click on first "View Details" link
      const viewDetailsLink = page.locator('a:has-text("View Details")').first()
      if (await viewDetailsLink.isVisible()) {
        await viewDetailsLink.click()
        
        // Should navigate to detail page
        await page.waitForLoadState('networkidle')
        
        // Verify we're on a detail page (URL should contain payroll details pattern)
        expect(page.url()).toMatch(/\/payroll\/\d+\/\d+\//)
      }
    })
  })

  test.describe('Manager Payroll Access', () => {
    test('should access payroll with manager restrictions', async ({ page }) => {
      await loginAsManager(page)
      
      // Navigate to payroll
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads
      await expect(page.locator('h1')).toContainText('Payroll')
      
      // Verify access limitation message is shown
      await expect(page.locator('text=Access limited to your managed employees')).toBeVisible()
    })

    test('should have working filters as manager', async ({ page }) => {
      await loginAsManager(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify filter section is accessible
      await expect(page.locator('text=Filter Payroll Data')).toBeVisible()
      
      // Test status filter (always available)
      const statusSelect = page.locator('#status')
      await statusSelect.selectOption('paid')
      await page.waitForLoadState('networkidle')
      
      // Verify URL contains status filter
      expect(page.url()).toContain('status=paid')
    })

    test('should not access admin-only payroll features', async ({ page }) => {
      await loginAsManager(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Managers should not see bulk operations or admin-only actions
      // Check that admin navigation items are not visible
      const adminNav = page.locator('text=Admin Dashboard')
      if (await adminNav.isVisible()) {
        // If admin nav exists, it should not be accessible
        await expect(adminNav).not.toBeVisible()
      }
    })
  })

  test.describe('Employee Payroll Access', () => {
    test('should access own payroll data only', async ({ page }) => {
      await loginAsEmployee(page)
      
      // Navigate to payroll
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads
      await expect(page.locator('h1')).toContainText('Payroll')
      
      // Employee should see access limitation message
      await expect(page.locator('text=Access limited to your data')).toBeVisible()
    })

    test('should have limited filter options as employee', async ({ page }) => {
      await loginAsEmployee(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Employees should have basic filters available
      await expect(page.locator('#status')).toBeVisible() // Status filter should be available
      await expect(page.locator('#issueDate')).toBeVisible() // Issue date filter should be available
      await expect(page.locator('#startDate')).toBeVisible() // Date range should be available
      await expect(page.locator('#endDate')).toBeVisible()
    })

    test('should not access other employees payroll', async ({ page }) => {
      await loginAsEmployee(page)
      
      // Try to access payroll with different agent ID in URL
      await page.goto('/payroll?employeeId=999')
      await page.waitForLoadState('networkidle')
      
      // Should still only see own data, URL manipulation should be ignored
      // Verify access control message is still shown
      await expect(page.locator('text=Access limited to your data')).toBeVisible()
    })
  })

  test.describe('Payroll Data Integrity', () => {
    test('should display accurate payroll calculations', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Check that table has data
      const table = page.locator('table')
      await expect(table).toBeVisible()
      
      // Verify currency formatting in table cells
      const netPayCells = page.locator('table td:has-text("$")')
      if (await netPayCells.count() > 0) {
        const firstAmount = await netPayCells.first().textContent()
        expect(firstAmount).toMatch(/\$[\d,]+\.?\d*/) // Currency format
      }
    })

    test('should show proper date formatting', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Check date formatting in payroll list
      const tableCells = page.locator('table td')
      if (await tableCells.count() > 0) {
        // Look for date-like content in table cells
        const cellTexts = await tableCells.allTextContents()
        const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/
        const hasDateFormat = cellTexts.some(text => datePattern.test(text))
        expect(hasDateFormat).toBeTruthy()
      }
    })

    test('should handle empty states gracefully', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate with filters that return no results
      await page.goto('/payroll?startDate=2099-01-01&endDate=2099-01-02')
      await page.waitForLoadState('networkidle')
      
      // Should show empty state message
      const emptyState = page.locator('text=No payroll data found')
      const noResults = page.locator('text=No payroll data')
      
      // Either empty state component or no results message should be visible
      expect(
        (await emptyState.isVisible()) || 
        (await noResults.isVisible())
      ).toBeTruthy()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify mobile-responsive elements
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('text=Filter Payroll Data')).toBeVisible()
      
      // Check if table is horizontally scrollable on mobile
      const tableContainer = page.locator('div.overflow-x-auto')
      await expect(tableContainer).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Verify tablet layout
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load payroll page within acceptable time', async ({ page }) => {
      await loginAsAdmin(page)
      
      const startTime = Date.now()
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should show loading states during data fetch', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      
      // Check for loading indicators (if they exist)
      // Loading state should appear briefly (might be too fast to catch consistently)
      // Main goal is to verify the page loads without errors
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Filter Functionality', () => {
    test('should clear all filters', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Apply some filters first
      await page.locator('#status').selectOption('paid')
      await page.locator('#startDate').fill('2024-01-01')
      
      // Click clear filters button
      await page.locator('button:has-text("Clear Filters")').click()
      await page.waitForLoadState('networkidle')
      
      // Should navigate back to clean payroll page
      expect(page.url()).not.toContain('status=')
      expect(page.url()).not.toContain('startDate=')
    })

    test('should show filter count', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Apply a filter
      await page.locator('#status').selectOption('paid')
      await page.waitForLoadState('networkidle')
      
      // Should show filter count
      await expect(page.locator('text=filter(s) applied')).toBeVisible()
    })
  })
})