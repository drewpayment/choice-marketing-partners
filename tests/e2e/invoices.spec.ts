import { test, expect } from '../fixtures/auth';

test.describe('Invoice Management', () => {
  test('admin should create and edit invoices', async ({ adminPage }) => {
    await adminPage.goto('/invoices');
    
    // Verify invoice management page
    await expect(adminPage.locator('h1')).toContainText('Invoice Management');
    
    // Click edit button on first invoice
    await adminPage.click('[data-testid="edit-invoice-button"]:first-child');
    
    // Verify invoice editor loads
    await expect(adminPage.locator('[data-testid="invoice-editor"]')).toBeVisible();
    
    // Test adding a sales record
    await adminPage.click('[data-testid="add-sales-record"]');
    await adminPage.fill('[data-testid="sales-amount"]', '1000.00');
    await adminPage.fill('[data-testid="sales-description"]', 'Test Sale');
    
    // Test adding an override
    await adminPage.click('[data-testid="add-override"]');
    await adminPage.fill('[data-testid="override-amount"]', '100.00');
    await adminPage.fill('[data-testid="override-description"]', 'Test Override');
    
    // Test adding an expense
    await adminPage.click('[data-testid="add-expense"]');
    await adminPage.fill('[data-testid="expense-amount"]', '50.00');
    await adminPage.fill('[data-testid="expense-description"]', 'Test Expense');
    
    // Verify total calculation
    await expect(adminPage.locator('[data-testid="total-amount"]')).toContainText('1150.00');
    
    // Save changes
    await adminPage.click('[data-testid="save-invoice"]');
    
    // Verify success message
    await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('manager should edit invoices for managed employees', async ({ managerPage }) => {
    await managerPage.goto('/invoices');
    
    // Verify page access
    await expect(managerPage.locator('h1')).toContainText('Invoice Management');
    
    // Should see edit buttons for managed employees
    await expect(managerPage.locator('[data-testid="edit-invoice-button"]')).toBeVisible();
    
    // Should not see admin-only functions
    await expect(managerPage.locator('[data-testid="delete-paystub"]')).not.toBeVisible();
  });

  test('should validate form inputs', async ({ adminPage }) => {
    await adminPage.goto('/invoices');
    await adminPage.click('[data-testid="edit-invoice-button"]:first-child');
    
    // Try to add invalid sales amount
    await adminPage.click('[data-testid="add-sales-record"]');
    await adminPage.fill('[data-testid="sales-amount"]', 'invalid');
    
    // Verify validation error
    await expect(adminPage.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Fix the amount
    await adminPage.fill('[data-testid="sales-amount"]', '100.00');
    
    // Error should disappear
    await expect(adminPage.locator('[data-testid="validation-error"]')).not.toBeVisible();
  });

  test('should handle delete operations', async ({ adminPage }) => {
    await adminPage.goto('/invoices');
    await adminPage.click('[data-testid="edit-invoice-button"]:first-child');
    
    // Add a sales record first
    await adminPage.click('[data-testid="add-sales-record"]');
    await adminPage.fill('[data-testid="sales-amount"]', '100.00');
    
    // Delete the record
    await adminPage.click('[data-testid="delete-sales-record"]');
    
    // Verify confirmation dialog
    await expect(adminPage.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    
    // Confirm deletion
    await adminPage.click('[data-testid="confirm-delete"]');
    
    // Verify record is removed
    await expect(adminPage.locator('[data-testid="sales-record"]')).not.toBeVisible();
  });

  test('should filter invoices by criteria', async ({ adminPage }) => {
    await adminPage.goto('/invoices');
    
    // Test agent filter
    await adminPage.selectOption('[data-testid="agent-filter"]', 'John Doe');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify filtered results
    await expect(adminPage.locator('[data-testid="invoice-table"] tbody tr')).toContainText('John Doe');
    
    // Test date filter
    await adminPage.fill('[data-testid="issue-date-filter"]', '2024-01-01');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Wait for results
    await adminPage.waitForLoadState('networkidle');
  });

  test('should export invoice data', async ({ adminPage }) => {
    await adminPage.goto('/invoices');
    
    // Start download
    const downloadPromise = adminPage.waitForEvent('download');
    await adminPage.click('[data-testid="export-csv"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/invoices.*\.csv$/);
  });
});

test.describe('Invoice Mobile Interface', () => {
  test('should handle invoice editing on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    const authHelper = new (await import('../utils/auth-helper')).AuthHelper(page);
    await authHelper.loginAsAdmin();
    
    await page.goto('/invoices');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-invoice-card"]')).toBeVisible();
    
    // Test mobile editing interface
    await page.click('[data-testid="mobile-edit-button"]:first-child');
    
    // Verify mobile editor
    await expect(page.locator('[data-testid="mobile-invoice-editor"]')).toBeVisible();
  });
});