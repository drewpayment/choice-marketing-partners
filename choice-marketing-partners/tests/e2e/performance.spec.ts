import { test, expect } from '../fixtures/auth';
import { PerformanceHelper } from '../utils/performance-helper';

test.describe('Performance Testing', () => {
  test('should meet page load performance targets', async ({ page }) => {
    const performanceHelper = new PerformanceHelper(page);
    
    // Test public pages
    const homeLoadTime = await performanceHelper.measurePageLoad('/');
    console.log(`Home page load time: ${homeLoadTime}ms`);
    
    const aboutLoadTime = await performanceHelper.measurePageLoad('/about-us');
    console.log(`About page load time: ${aboutLoadTime}ms`);
    
    const blogLoadTime = await performanceHelper.measurePageLoad('/blog');
    console.log(`Blog page load time: ${blogLoadTime}ms`);
  });

  test('should meet API response time targets', async ({ adminPage }) => {
    const performanceHelper = new PerformanceHelper(adminPage);
    
    // Test critical API endpoints
    await performanceHelper.measureApiResponse('/api/account/user-info');
    await performanceHelper.measureApiResponse('/api/payroll/agents');
    await performanceHelper.measureApiResponse('/api/payroll/vendors');
    await performanceHelper.measureApiResponse('/api/payroll/issue-dates');
  });

  test('should handle database queries efficiently', async ({ adminPage }) => {
    const performanceHelper = new PerformanceHelper(adminPage);
    
    // Test database query performance
    await performanceHelper.measureDatabaseQuery('payroll-list');
    await performanceHelper.measureDatabaseQuery('employee-list');
    await performanceHelper.measureDatabaseQuery('document-list');
  });

  test('should handle concurrent payroll requests', async ({ page }) => {
    const authHelper = new (await import('../utils/auth-helper')).AuthHelper(page);
    await authHelper.loginAsAdmin();
    
    const performanceHelper = new PerformanceHelper(page);
    
    // Simulate 5 concurrent users accessing payroll
    await performanceHelper.simulateConcurrentUsers(5, async () => {
      await page.goto('/payroll');
      await page.waitForSelector('[data-testid="payroll-table"]');
    });
  });

  test('should generate PDFs within time limits', async ({ adminPage }) => {
    await adminPage.goto('/payroll');
    
    // Navigate to a payroll detail page
    await adminPage.click('[data-testid="payroll-table"] tbody tr:first-child a');
    
    const performanceHelper = new PerformanceHelper(adminPage);
    
    // Test PDF generation performance
    await performanceHelper.measurePdfGeneration();
  });

  test('should handle file uploads efficiently', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    const performanceHelper = new PerformanceHelper(adminPage);
    
    // Create a test file (100KB)
    const testFile = '/tmp/test-upload.pdf';
    await adminPage.evaluate(async (filePath) => {
      const fs = require('fs');
      const content = 'x'.repeat(100 * 1024); // 100KB file
      fs.writeFileSync(filePath, content);
    }, testFile);
    
    // Test upload performance
    await performanceHelper.measureFileUpload(testFile, 100);
  });

  test('should maintain performance under load', async ({ page }) => {
    const performanceHelper = new PerformanceHelper(page);
    
    // Measure initial memory usage
    const initialMemory = await performanceHelper.measureMemoryUsage();
    
    // Perform intensive operations
    const authHelper = new (await import('../utils/auth-helper')).AuthHelper(page);
    await authHelper.loginAsAdmin();
    
    // Navigate through multiple pages
    const pages = ['/dashboard', '/payroll', '/invoices', '/documents', '/admin/employees'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    // Check memory after operations
    const finalMemory = await performanceHelper.measureMemoryUsage();
    
    // Ensure memory usage hasn't grown excessively (max 50MB increase)
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('should meet Core Web Vitals standards', async ({ page }) => {
    const performanceHelper = new PerformanceHelper(page);
    
    // Navigate to main application pages
    await page.goto('/');
    
    // Get Core Web Vitals
    const vitals = await performanceHelper.getCoreWebVitals();
    
    // Assert Core Web Vitals meet standards
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    }
    if (vitals.fid) {
      expect(vitals.fid).toBeLessThan(100); // FID < 100ms
    }
    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(0.1); // CLS < 0.1
    }
  });

  test('should handle large dataset pagination efficiently', async ({ adminPage }) => {
    await adminPage.goto('/payroll');
    
    const performanceHelper = new PerformanceHelper(adminPage);
    
    // Test pagination performance
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      if (await adminPage.locator('[data-testid="next-page"]').isVisible()) {
        await adminPage.click('[data-testid="next-page"]');
        await adminPage.waitForLoadState('networkidle');
      }
      
      const endTime = Date.now();
      const paginationTime = endTime - startTime;
      
      // Each pagination should be under 1 second
      expect(paginationTime).toBeLessThan(1000);
    }
  });

  test('should handle search and filter operations efficiently', async ({ adminPage }) => {
    await adminPage.goto('/payroll');
    
    const performanceHelper = new PerformanceHelper(adminPage);
    
    // Test search performance
    const startTime = Date.now();
    
    await adminPage.fill('[data-testid="search-input"]', 'John');
    await adminPage.click('[data-testid="search-button"]');
    await adminPage.waitForLoadState('networkidle');
    
    const searchTime = Date.now() - startTime;
    
    // Search should complete within 2 seconds
    expect(searchTime).toBeLessThan(2000);
    
    // Test filter performance
    const filterStartTime = Date.now();
    
    await adminPage.selectOption('[data-testid="vendor-filter"]', { index: 1 });
    await adminPage.click('[data-testid="apply-filters"]');
    await adminPage.waitForLoadState('networkidle');
    
    const filterTime = Date.now() - filterStartTime;
    
    // Filter should complete within 2 seconds
    expect(filterTime).toBeLessThan(2000);
  });
});