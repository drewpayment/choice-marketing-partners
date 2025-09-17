import { test, expect } from '../fixtures/auth';

test.describe('Authentication Flow', () => {
  test('should login as admin and access admin dashboard', async ({ adminPage }) => {
    // Verify we're on the dashboard
    await expect(adminPage).toHaveURL('/dashboard');
    
    // Verify admin-specific navigation items are visible
    await expect(adminPage.locator('nav')).toContainText('Admin Settings');
    await expect(adminPage.locator('nav')).toContainText('Agents & Overrides');
    
    // Verify user info shows admin role
    await expect(adminPage.locator('[data-testid="user-role"]')).toContainText('Admin');
  });

  test('should login as manager and access manager dashboard', async ({ managerPage }) => {
    // Verify we're on the dashboard
    await expect(managerPage).toHaveURL('/dashboard');
    
    // Verify manager-specific navigation items are visible
    await expect(managerPage.locator('nav')).toContainText('Payroll');
    
    // Verify user info shows manager role
    await expect(managerPage.locator('[data-testid="user-role"]')).toContainText('Manager');
    
    // Verify admin-only items are NOT visible
    await expect(managerPage.locator('nav')).not.toContainText('Admin Settings');
  });

  test('should login as employee and access employee dashboard', async ({ employeePage }) => {
    // Verify we're on the dashboard
    await expect(employeePage).toHaveURL('/dashboard');
    
    // Verify basic navigation items are visible
    await expect(employeePage.locator('nav')).toContainText('Dashboard');
    
    // Verify user info shows employee role
    await expect(employeePage.locator('[data-testid="user-role"]')).toContainText('Employee');
    
    // Verify admin/manager-only items are NOT visible
    await expect(employeePage.locator('nav')).not.toContainText('Admin Settings');
    await expect(employeePage.locator('nav')).not.toContainText('Agents & Overrides');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ adminPage, authHelper }) => {
    // Verify we're logged in
    await expect(adminPage).toHaveURL('/dashboard');
    
    // Logout
    await authHelper.logout();
    
    // Verify we're redirected to login
    await expect(adminPage).toHaveURL('/login');
    
    // Verify we can't access protected routes
    await adminPage.goto('/dashboard');
    await expect(adminPage).toHaveURL('/login');
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Try invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });
});