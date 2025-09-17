import { test, expect } from '../fixtures/auth';

test.describe('Employee Management', () => {
  test('admin should create new employees', async ({ adminPage }) => {
    await adminPage.goto('/admin/employees');
    
    // Verify employee list page
    await expect(adminPage.locator('h1')).toContainText('Employees');
    
    // Click create new employee
    await adminPage.click('[data-testid="create-employee-button"]');
    
    // Verify create form
    await expect(adminPage.locator('[data-testid="employee-form"]')).toBeVisible();
    
    // Fill in employee details
    await adminPage.fill('[data-testid="first-name"]', 'John');
    await adminPage.fill('[data-testid="last-name"]', 'Doe');
    await adminPage.fill('[data-testid="email"]', 'john.doe@example.com');
    await adminPage.fill('[data-testid="phone"]', '555-1234');
    
    // Fill in address
    await adminPage.fill('[data-testid="address"]', '123 Main St');
    await adminPage.fill('[data-testid="city"]', 'Anytown');
    await adminPage.fill('[data-testid="state"]', 'CA');
    await adminPage.fill('[data-testid="zip"]', '12345');
    
    // Set sales IDs
    await adminPage.fill('[data-testid="sales-id1"]', 'EMP001');
    
    // Create user account
    await adminPage.check('[data-testid="create-user-account"]');
    await adminPage.fill('[data-testid="user-email"]', 'john.doe@company.com');
    await adminPage.selectOption('[data-testid="user-role"]', 'employee');
    
    // Save employee
    await adminPage.click('[data-testid="save-employee"]');
    
    // Verify success
    await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify redirect to employee list
    await expect(adminPage).toHaveURL('/admin/employees');
    
    // Verify new employee appears in list
    await expect(adminPage.locator('[data-testid="employee-list"]')).toContainText('John Doe');
  });

  test('admin should edit existing employees', async ({ adminPage }) => {
    await adminPage.goto('/admin/employees');
    
    // Click on first employee
    await adminPage.click('[data-testid="employee-card"]:first-child [data-testid="employee-name"]');
    
    // Verify detail page
    await expect(adminPage.locator('[data-testid="employee-detail"]')).toBeVisible();
    
    // Click edit button
    await adminPage.click('[data-testid="edit-employee-button"]');
    
    // Verify edit form
    await expect(adminPage.locator('[data-testid="employee-form"]')).toBeVisible();
    
    // Update phone number
    await adminPage.fill('[data-testid="phone"]', '555-5678');
    
    // Save changes
    await adminPage.click('[data-testid="save-employee"]');
    
    // Verify success
    await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('admin should manage manager assignments', async ({ adminPage }) => {
    await adminPage.goto('/admin/overrides');
    
    // Verify manager assignment page
    await expect(adminPage.locator('h1')).toContainText('Manager Assignments');
    
    // Verify assignment interface
    await expect(adminPage.locator('[data-testid="manager-assignment-interface"]')).toBeVisible();
    
    // Test drag and drop assignment (simulate)
    const employee = adminPage.locator('[data-testid="unassigned-employee"]:first-child');
    const manager = adminPage.locator('[data-testid="manager-group"]:first-child');
    
    // Simulate assignment
    await employee.click();
    await manager.click();
    
    // Save assignments
    await adminPage.click('[data-testid="save-assignments"]');
    
    // Verify success
    await expect(adminPage.locator('[data-testid="assignment-success"]')).toBeVisible();
  });

  test('admin should reset employee passwords', async ({ adminPage }) => {
    await adminPage.goto('/admin/employees');
    
    // Find employee with user account
    await adminPage.click('[data-testid="employee-card"]:first-child [data-testid="reset-password"]');
    
    // Verify password reset dialog
    await expect(adminPage.locator('[data-testid="password-reset-dialog"]')).toBeVisible();
    
    // Enter new password
    await adminPage.fill('[data-testid="new-password"]', 'newpassword123');
    
    // Confirm reset
    await adminPage.click('[data-testid="confirm-reset"]');
    
    // Verify success
    await expect(adminPage.locator('[data-testid="reset-success"]')).toBeVisible();
  });

  test('should filter employees by criteria', async ({ adminPage }) => {
    await adminPage.goto('/admin/employees');
    
    // Test search filter
    await adminPage.fill('[data-testid="employee-search"]', 'John');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify filtered results
    await expect(adminPage.locator('[data-testid="employee-list"]')).toContainText('John');
    
    // Test status filter
    await adminPage.selectOption('[data-testid="status-filter"]', 'active');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify active employees shown
    await expect(adminPage.locator('[data-testid="status-badge"]')).toContainText('Active');
    
    // Test role filter
    await adminPage.selectOption('[data-testid="role-filter"]', 'manager');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify manager role filter
    await expect(adminPage.locator('[data-testid="role-badge"]')).toContainText('Manager');
  });

  test('should validate employee form inputs', async ({ adminPage }) => {
    await adminPage.goto('/admin/employees/create');
    
    // Try to save without required fields
    await adminPage.click('[data-testid="save-employee"]');
    
    // Verify validation errors
    await expect(adminPage.locator('[data-testid="first-name-error"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="last-name-error"]')).toBeVisible();
    
    // Fill required fields
    await adminPage.fill('[data-testid="first-name"]', 'Test');
    await adminPage.fill('[data-testid="last-name"]', 'User');
    
    // Errors should disappear
    await expect(adminPage.locator('[data-testid="first-name-error"]')).not.toBeVisible();
    await expect(adminPage.locator('[data-testid="last-name-error"]')).not.toBeVisible();
  });

  test('should handle employee deletion', async ({ adminPage }) => {
    await adminPage.goto('/admin/employees');
    
    // Click on employee detail
    await adminPage.click('[data-testid="employee-card"]:first-child [data-testid="employee-name"]');
    
    // Click delete button
    await adminPage.click('[data-testid="delete-employee-button"]');
    
    // Verify confirmation dialog
    await expect(adminPage.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    
    // Confirm deletion
    await adminPage.click('[data-testid="confirm-delete"]');
    
    // Verify success
    await expect(adminPage.locator('[data-testid="delete-success"]')).toBeVisible();
    
    // Verify redirect
    await expect(adminPage).toHaveURL('/admin/employees');
  });

  test('manager should not access employee management', async ({ managerPage }) => {
    // Try to access employee management
    await managerPage.goto('/admin/employees');
    
    // Should be redirected to forbidden page
    await expect(managerPage).toHaveURL('/forbidden');
    
    // Verify forbidden message
    await expect(managerPage.locator('[data-testid="forbidden-message"]')).toBeVisible();
  });

  test('employee should not access employee management', async ({ employeePage }) => {
    // Try to access employee management
    await employeePage.goto('/admin/employees');
    
    // Should be redirected to forbidden page
    await expect(employeePage).toHaveURL('/forbidden');
    
    // Verify forbidden message
    await expect(employeePage.locator('[data-testid="forbidden-message"]')).toBeVisible();
  });
});

test.describe('Employee Mobile Interface', () => {
  test('should handle employee management on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    const authHelper = new (await import('../utils/auth-helper')).AuthHelper(page);
    await authHelper.loginAsAdmin();
    
    await page.goto('/admin/employees');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-employee-grid"]')).toBeVisible();
    
    // Test mobile filters
    await page.click('[data-testid="mobile-filters-toggle"]');
    await expect(page.locator('[data-testid="employee-filters"]')).toBeVisible();
    
    // Test mobile create button
    await expect(page.locator('[data-testid="mobile-create-button"]')).toBeVisible();
  });
});