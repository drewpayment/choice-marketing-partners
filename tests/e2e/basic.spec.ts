import { test, expect } from '@playwright/test';

test.describe('Basic Site Functionality', () => {
  test('should load homepage without authentication', async ({ page }) => {
    // Visit the homepage
    await page.goto('/');
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/Choice Marketing Partners/);
    
    // Check for basic content
    await expect(page.locator('body')).toBeVisible();
    
    // Take a screenshot for visual validation
    await page.screenshot({ path: 'test-results/homepage.png' });
  });

  test('should handle public navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check if we can navigate to public pages
    const aboutLink = page.locator('a[href*="about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/about/);
    }
    
    // Check blog link if available
    await page.goto('/');
    const blogLink = page.locator('a[href*="blog"]').first();
    if (await blogLink.isVisible()) {
      await blogLink.click();
      await expect(page).toHaveURL(/blog/);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check that the page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/homepage-mobile.png' });
  });

  test('should redirect to signin for protected routes', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard');
    
    // Should redirect to signin page
    await expect(page).toHaveURL(/auth\/signin/);
    
    // Check that signin form is present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});