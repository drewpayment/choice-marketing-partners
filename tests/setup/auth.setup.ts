import { test as setup } from '@playwright/test';
import { TestDataSeeder } from '../utils/test-data-seeder';

const authFile = 'tests/.auth/user.json';
const adminAuthFile = 'tests/.auth/admin.json';
const managerAuthFile = 'tests/.auth/manager.json';

// Setup test data once before all tests
setup('setup test database', async () => {
  console.log('Setting up test database...');
  await TestDataSeeder.resetDatabase();
  console.log('Test database setup complete');
});

// Setup authentication for regular employee
setup('authenticate as employee', async ({ page }) => {
  const testUser = TestDataSeeder.getTestUser('employee');
  
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', testUser.email);
  await page.fill('[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login redirect
  await page.waitForURL('/dashboard');
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

// Setup authentication for admin
setup('authenticate as admin', async ({ page }) => {
  const testUser = TestDataSeeder.getTestUser('admin');
  
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', testUser.email);
  await page.fill('[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login redirect
  await page.waitForURL('/dashboard');
  
  // Save authentication state
  await page.context().storageState({ path: adminAuthFile });
});

// Setup authentication for manager
setup('authenticate as manager', async ({ page }) => {
  const testUser = TestDataSeeder.getTestUser('manager');
  
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', testUser.email);
  await page.fill('[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login redirect
  await page.waitForURL('/dashboard');
  
  // Save authentication state
  await page.context().storageState({ path: managerAuthFile });
});