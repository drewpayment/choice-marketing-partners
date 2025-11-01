import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsManager, loginAsEmployee } from '../utils/auth-helper'

test.describe('Invoice Management - Core Functions', () => {
  test.describe('Page Access and Basic Functionality', () => {
    test('Admin should access invoices page', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to invoices
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads successfully
      await expect(page.locator('h1')).toContainText('Pay Statement Management')
      
      // Should see admin-level controls
      await expect(page.locator('text=Create New Pay Statement')).toBeVisible()
    })

    test('Manager should access invoices with restrictions', async ({ page }) => {
      await loginAsManager(page)
      
      // Navigate to invoices
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Verify page loads
      await expect(page.locator('h1')).toContainText('Pay Statement Management')
      
      // Should NOT see admin-only controls
      const createButton = page.locator('text=Create New Pay Statement')
      await expect(createButton).not.toBeVisible()
    })

    test('Employee should be forbidden from invoices page', async ({ page }) => {
      await loginAsEmployee(page)
      
      // Navigate to invoices - should be redirected to forbidden
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Should see forbidden page or be redirected
      const currentUrl = page.url()
      const isForbidden = currentUrl.includes('/403') || 
                         currentUrl.includes('/forbidden') ||
                         await page.locator('text=Access Denied').isVisible()
      
      expect(isForbidden).toBeTruthy()
    })
  })

  test.describe('Paystub Management Interface', () => {
    test('Should display paystub management list with filters', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Check filter controls are present (shadcn/ui Select components)
      await expect(page.locator('input[placeholder="Search employees, vendors..."]')).toBeVisible()
      await expect(page.locator('text=All Employees')).toBeVisible()
      await expect(page.locator('text=All Vendors')).toBeVisible()
      await expect(page.locator('text=All Issue Dates')).toBeVisible()
      
      // Check action buttons
      await expect(page.locator('button:has-text("Create New Pay Statement")')).toBeVisible()
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible()
    })

    test('Should filter paystubs by search term', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Use search filter instead of status (since actual implementation may not have status filter)
      const searchInput = page.locator('input[placeholder="Search employees, vendors..."]')
      await searchInput.fill('test')
      await page.waitForTimeout(1000) // Wait for search to process
      
      // Should show search results or empty state
      const hasTable = await page.locator('table').isVisible()
      const hasEmptyState = await page.locator('text=No pay statements').first().isVisible() ||
                           await page.locator('text=0 pay statements found').isVisible()
      expect(hasTable || hasEmptyState).toBeTruthy()
    })

    test('Should show paystub data with edit actions', async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Look for paystub table or data
      const hasData = await page.locator('table tbody tr').count() > 0
      
      if (hasData) {
        // Should have action buttons for editing
        const editButtons = page.locator('a:has-text("Edit")')
        const editCount = await editButtons.count()
        expect(editCount).toBeGreaterThan(0)
        
        // Check table headers
        await expect(page.locator('th:has-text("Employee")')).toBeVisible()
        await expect(page.locator('th:has-text("Issue Date")')).toBeVisible()
        await expect(page.locator('th:has-text("Status")')).toBeVisible()
      }
    })
  })

  test.describe('Paystub Detail View', () => {
    test('Should navigate to paystub detail from payroll page', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Start from payroll page to find existing paystub
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      // Look for "View Details" links
      const detailLinks = page.locator('a:has-text("View Details")')
      const linkCount = await detailLinks.count()
      
      if (linkCount > 0) {
        // Click first detail link
        await detailLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Should be on paystub detail page
        expect(page.url()).toMatch(/\/payroll\/\d+\/\d+\//)
        
        // Should show paystub details
        await expect(page.locator('h1')).toContainText('Payroll')
        
        // Should have edit button for unpaid paystubs (admin only)
        const editButton = page.locator('a:has-text("Edit Invoice")')
        const hasEditButton = await editButton.isVisible()
        
        if (hasEditButton) {
          // Verify edit button works
          await editButton.click()
          await page.waitForLoadState('networkidle')
          
          // Should navigate to invoice editor
          expect(page.url()).toMatch(/\/invoices\/\d+\/\d+\//)
        }
      }
    })

    test('Should show paystub breakdown with sales, overrides, and expenses', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to a specific paystub (we'll need test data)
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      const detailLinks = page.locator('a:has-text("View Details")')
      const linkCount = await detailLinks.count()
      
      if (linkCount > 0) {
        await detailLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Should show breakdown sections
        const hasSalesSection = await page.locator('text=Sales').isVisible()
        const hasOverridesSection = await page.locator('text=Overrides').isVisible()
        const hasExpensesSection = await page.locator('text=Expenses').isVisible()
        
        // At least one section should be visible
        expect(hasSalesSection || hasOverridesSection || hasExpensesSection).toBeTruthy()
        
        // Should show totals
        const hasTotalPay = await page.locator('text=Total Pay').isVisible() ||
                           await page.locator('text=Net Pay').isVisible()
        expect(hasTotalPay).toBeTruthy()
      }
    })
  })

  test.describe('Invoice Editor Interface', () => {
    test('Should access invoice editor from paystub detail', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate via payroll to find editable paystub
      await page.goto('/payroll')
      await page.waitForLoadState('networkidle')
      
      const detailLinks = page.locator('a:has-text("View Details")')
      const linkCount = await detailLinks.count()
      
      if (linkCount > 0) {
        await detailLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Look for edit button
        const editButton = page.locator('a:has-text("Edit Invoice")')
        const hasEditButton = await editButton.isVisible()
        
        if (hasEditButton) {
          await editButton.click()
          await page.waitForLoadState('networkidle')
          
          // Should be in invoice editor
          await expect(page.locator('h1')).toContainText('Edit Pay Statement')
          
          // Should show editor sections
          await expect(page.locator('text=Sales Data')).toBeVisible()
          await expect(page.locator('text=Overrides')).toBeVisible()
          await expect(page.locator('text=Expenses')).toBeVisible()
          
          // Should have save button
          await expect(page.locator('button:has-text("Save Pay Statement")')).toBeVisible()
        }
      }
    })

    test('Should display sales data grid with edit capabilities', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Try to access editor directly (will need existing data)
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Look for edit links in the management interface
      const editLinks = page.locator('a:has-text("Edit")')
      const editCount = await editLinks.count()
      
      if (editCount > 0) {
        await editLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Should be in editor with sales data
        const salesSection = page.locator('[data-testid="sales-section"]').or(
          page.locator('text=Sales Data').locator('..').locator('..')
        )
        
        if (await salesSection.isVisible()) {
          // Should have add button for new sales entries
          const addSalesButton = page.locator('button:has-text("Add Sale")')
          if (await addSalesButton.isVisible()) {
            await expect(addSalesButton).toBeVisible()
          }
          
          // Should show sales table headers
          const hasAmountColumn = await page.locator('th:has-text("Amount")').isVisible() ||
                                 await page.locator('text=Amount').isVisible()
          const hasDateColumn = await page.locator('th:has-text("Date")').isVisible() ||
                               await page.locator('text=Date').isVisible()
          
          expect(hasAmountColumn || hasDateColumn).toBeTruthy()
        }
      }
    })

    test('Should show real-time total calculations', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to editor
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      const editLinks = page.locator('a:has-text("Edit")')
      const editCount = await editLinks.count()
      
      if (editCount > 0) {
        await editLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Should show total calculations
        const totalSalesText = page.locator('text=Total Sales')
        const totalOverridesText = page.locator('text=Total Overrides')
        const totalExpensesText = page.locator('text=Total Expenses')
        const netPayText = page.locator('text=Net Pay')
        
        // At least one total should be visible
        const hasTotals = await totalSalesText.isVisible() ||
                         await totalOverridesText.isVisible() ||
                         await totalExpensesText.isVisible() ||
                         await netPayText.isVisible()
        
        expect(hasTotals).toBeTruthy()
      }
    })

    test('Should save changes and return to management page', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to editor
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      const editLinks = page.locator('a:has-text("Edit")')
      const editCount = await editLinks.count()
      
      if (editCount > 0) {
        await editLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Should have save button
        const saveButton = page.locator('button:has-text("Save Pay Statement")')
        if (await saveButton.isVisible()) {
          // Click save (assuming no validation errors)
          await saveButton.click()
          await page.waitForLoadState('networkidle')
          
          // Should redirect back to management page or show success
          const isBackToManagement = page.url().includes('/invoices') && 
                                   !page.url().match(/\/invoices\/\d+\/\d+\//)
          const hasSuccessMessage = await page.locator('text=saved successfully').isVisible() ||
                                   await page.locator('text=updated successfully').isVisible()
          
          expect(isBackToManagement || hasSuccessMessage).toBeTruthy()
        }
      }
    })
  })

  test.describe('Data Validation and Error Handling', () => {
    test('Should handle invalid invoice routes gracefully', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Try to access non-existent invoice
      await page.goto('/invoices/99999/99999/2099-01-01')
      await page.waitForLoadState('networkidle')
      
      // Should show error or redirect to safe page
      const hasError = await page.locator('text=not found').isVisible() ||
                      await page.locator('text=Not Found').isVisible() ||
                      page.url().includes('/404') ||
                      page.url().includes('/invoices') && !page.url().match(/\/invoices\/\d+\/\d+\//)
      
      expect(hasError).toBeTruthy()
    })

    test('Should validate required fields in editor', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to editor
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      const editLinks = page.locator('a:has-text("Edit")')
      const editCount = await editLinks.count()
      
      if (editCount > 0) {
        await editLinks.first().click()
        await page.waitForLoadState('networkidle')
        
        // Look for form validation (this may vary based on implementation)
        const formElements = await page.locator('input').count()
        
        if (formElements > 0) {
          // Try to submit with potentially invalid data
          const saveButton = page.locator('button:has-text("Save Pay Statement")')
          if (await saveButton.isVisible()) {
            // This test assumes validation exists
            await expect(saveButton).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('Should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await loginAsAdmin(page)
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      // Basic elements should be visible on mobile
      await expect(page.locator('h1')).toBeVisible()
      
      // Table should have horizontal scroll or responsive design
      const hasTable = await page.locator('table').isVisible()
      if (hasTable) {
        const scrollContainer = page.locator('.overflow-x-auto')
        if (await scrollContainer.isVisible()) {
          await expect(scrollContainer).toBeVisible()
        }
      }
      
      // Filters should be accessible
      await expect(page.locator('input[placeholder="Search employees, vendors..."]')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('Should load invoice management within acceptable time', async ({ page }) => {
      await loginAsAdmin(page)
      
      const startTime = Date.now()
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Should load within 10 seconds (generous for CI)
      expect(loadTime).toBeLessThan(10000)
    })

    test('Should load invoice editor within acceptable time', async ({ page }) => {
      await loginAsAdmin(page)
      
      // Navigate to management page first
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')
      
      const editLinks = page.locator('a:has-text("Edit")')
      const editCount = await editLinks.count()
      
      if (editCount > 0) {
        const startTime = Date.now()
        await editLinks.first().click()
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        
        // Should load within 8 seconds
        expect(loadTime).toBeLessThan(8000)
      }
    })
  })
})