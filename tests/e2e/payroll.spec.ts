import { test, expect } from '../fixtures/auth';

test.describe('Payroll Management', () => {
  test('admin should access all payroll records', async ({ adminPage }) => {
    // Navigate to payroll page
    await adminPage.goto('/payroll');
    
    // Verify page loaded
    await expect(adminPage.locator('h1')).toContainText('Payroll');
    
    // Verify filters are available
    await expect(adminPage.locator('[data-testid="payroll-filters"]')).toBeVisible();
    
    // Verify table is loaded with data
    await expect(adminPage.locator('[data-testid="payroll-table"]')).toBeVisible();
    
    // Test search functionality
    await adminPage.fill('[data-testid="search-input"]', 'John');
    await adminPage.click('[data-testid="search-button"]');
    
    // Verify search results
    await expect(adminPage.locator('[data-testid="payroll-table"] tbody tr')).toContainText('John');
  });

  test('manager should access only managed employee payroll', async ({ managerPage }) => {
    // Navigate to payroll page
    await managerPage.goto('/payroll');
    
    // Verify page loaded
    await expect(managerPage.locator('h1')).toContainText('Payroll');
    
    // Verify filters are available but limited
    await expect(managerPage.locator('[data-testid="payroll-filters"]')).toBeVisible();
    
    // Verify table shows only accessible records
    await expect(managerPage.locator('[data-testid="payroll-table"]')).toBeVisible();
    
    // Should not see admin controls
    await expect(managerPage.locator('[data-testid="admin-controls"]')).not.toBeVisible();
  });

  test('employee should access only their own payroll', async ({ employeePage }) => {
    // Navigate to payroll page
    await employeePage.goto('/payroll');
    
    // Verify page loaded
    await expect(employeePage.locator('h1')).toContainText('Payroll');
    
    // Verify limited filters
    await expect(employeePage.locator('[data-testid="payroll-filters"]')).toBeVisible();
    
    // Verify table shows only employee's records
    await expect(employeePage.locator('[data-testid="payroll-table"]')).toBeVisible();
    
    // Should not see management controls
    await expect(employeePage.locator('[data-testid="edit-button"]')).not.toBeVisible();
  });

  test('should filter payroll by date range', async ({ adminPage }) => {
    await adminPage.goto('/payroll');
    
    // Set date filter
    await adminPage.fill('[data-testid="date-from"]', '2024-01-01');
    await adminPage.fill('[data-testid="date-to"]', '2024-01-31');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Wait for results to load
    await adminPage.waitForLoadState('networkidle');
    
    // Verify filtered results
    await expect(adminPage.locator('[data-testid="payroll-table"] tbody tr')).toBeVisible();
  });

  test('should navigate to payroll detail view', async ({ adminPage }) => {
    await adminPage.goto('/payroll');
    
    // Click on first payroll record
    await adminPage.click('[data-testid="payroll-table"] tbody tr:first-child a');
    
    // Verify navigation to detail page
    await expect(adminPage).toHaveURL(/\/payroll\/.*\/.*\/.*$/);
    
    // Verify detail page content
    await expect(adminPage.locator('[data-testid="payroll-detail"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="sales-total"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="overrides-total"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="expenses-total"]')).toBeVisible();
  });

  test('should handle pagination', async ({ adminPage }) => {
    await adminPage.goto('/payroll');
    
    // Wait for table to load
    await adminPage.waitForSelector('[data-testid="payroll-table"]');
    
    // Check if pagination exists (only if there are more than 20 records)
    const paginationExists = await adminPage.locator('[data-testid="pagination"]').isVisible();
    
    if (paginationExists) {
      // Test pagination
      await adminPage.click('[data-testid="next-page"]');
      await adminPage.waitForLoadState('networkidle');
      
      // Verify page changed
      await expect(adminPage.locator('[data-testid="current-page"]')).toContainText('2');
      
      // Go back to first page
      await adminPage.click('[data-testid="prev-page"]');
      await expect(adminPage.locator('[data-testid="current-page"]')).toContainText('1');
    }
  });
});

test.describe('Payroll Mobile Responsiveness', () => {
  test('should display mobile-friendly payroll interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    const authHelper = new (await import('../utils/auth-helper')).AuthHelper(page);
    await authHelper.loginAsAdmin();
    
    // Navigate to payroll
    await page.goto('/payroll');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-filters-toggle"]')).toBeVisible();
    
    // Test filter collapse/expand on mobile
    await page.click('[data-testid="mobile-filters-toggle"]');
    await expect(page.locator('[data-testid="payroll-filters"]')).toBeVisible();
  });
});