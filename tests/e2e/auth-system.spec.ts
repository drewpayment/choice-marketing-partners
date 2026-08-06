import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';

test.describe('Authentication System', () => {
  test('should login as admin and access admin dashboard', async ({ page }) => {
    const auth = new AuthHelper(page);
    
    // Test admin login
    await auth.loginAsAdmin();
    
    // Verify we're on admin dashboard
    await expect(page).toHaveURL('/admin');
    
    // Check for admin-specific content
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });

  test('should login as manager and land on the shared dashboard', async ({ page }) => {
    const auth = new AuthHelper(page);

    // Test manager login
    await auth.loginAsManager();

    // Managers land on /dashboard alongside reps — that is where their own pay
    // section and the link into their team's pay live.
    await expect(page).toHaveURL('/dashboard');

    // Check for the dashboard's welcome heading (seeded manager: 'Manager User')
    await expect(page.locator('h1')).toContainText('Welcome, Manager User!');
  });

  test('should login as employee and access regular dashboard', async ({ page }) => {
    const auth = new AuthHelper(page);
    
    // Test employee login
    await auth.loginAsEmployee();
    
    // Verify we're on regular dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Check for dashboard content
    await expect(page.locator('h1')).toContainText('Welcome, Employee User!');
  });
});