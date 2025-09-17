import { test as teardown } from '@playwright/test';
import { TestDataSeeder } from '../utils/test-data-seeder';

teardown('cleanup test database', async () => {
  console.log('Cleaning up test database...');
  await TestDataSeeder.clearTestData();
  console.log('Test database cleanup complete');
});