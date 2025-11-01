import { test as base, expect, Page } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helper';

export interface TestFixtures {
  authHelper: AuthHelper;
  adminPage: Page;
  managerPage: Page;
  employeePage: Page;
}

export const test = base.extend<TestFixtures>({
  authHelper: async ({ page }, use) => {
    const authHelper = new AuthHelper(page);
    await use(authHelper);
  },

  adminPage: async ({ page, authHelper }, use) => {
    await authHelper.loginAsAdmin();
    await use(page);
  },

  managerPage: async ({ page, authHelper }, use) => {
    await authHelper.loginAsManager();
    await use(page);
  },

  employeePage: async ({ page, authHelper }, use) => {
    await authHelper.loginAsEmployee();
    await use(page);
  },
});

export { expect };