import { Page } from '@playwright/test';

// Standalone functions for easy import
export async function loginAsAdmin(page: Page) {
  await page.goto('/auth/signin');
  
  // Wait for the form to be hydrated and visible (not the loading skeleton)
  await page.waitForSelector('form', { state: 'visible' });
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  // Fill in admin credentials (from our test database)
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for redirect to admin dashboard
  await page.waitForURL('/admin/dashboard');
}

export async function loginAsManager(page: Page) {
  await page.goto('/auth/signin');
  
  // Wait for the form to be hydrated and visible
  await page.waitForSelector('form', { state: 'visible' });
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  // Fill in manager credentials (from our test database)
  await page.fill('input[name="email"]', 'manager@test.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for redirect to manager dashboard
  await page.waitForURL('/manager/dashboard');
}

export async function loginAsEmployee(page: Page) {
  await page.goto('/auth/signin');
  
  // Wait for the form to be hydrated and visible
  await page.waitForSelector('form', { state: 'visible' });
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  // Fill in employee credentials (from our test database)
  await page.fill('input[name="email"]', 'employee@test.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');
}

export async function logout(page: Page) {
  await page.click('[data-testid="sign-out-button"]');
  await page.waitForURL('/auth/signin');
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.locator('[data-testid="user-info"]').waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Class-based helper for backward compatibility
export class AuthHelper {
  constructor(private page: Page) {}

  async loginAsAdmin() {
    return loginAsAdmin(this.page);
  }

  async loginAsManager() {
    return loginAsManager(this.page);
  }

  async loginAsEmployee() {
    return loginAsEmployee(this.page);
  }

  async logout() {
    return logout(this.page);
  }

  async isLoggedIn(): Promise<boolean> {
    return isLoggedIn(this.page);
  }
}