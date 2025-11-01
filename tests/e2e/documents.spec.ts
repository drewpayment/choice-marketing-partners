import { test, expect } from '../fixtures/auth';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Document Management', () => {
  test('should upload documents to cloud storage', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Verify documents page
    await expect(adminPage.locator('h1')).toContainText('Documents');
    
    // Create a test file
    const testFile = path.join(__dirname, '../fixtures/test-document.pdf');
    await fs.writeFile(testFile, 'test content');
    
    // Upload file
    await adminPage.setInputFiles('[data-testid="file-upload"]', testFile);
    
    // Verify upload progress
    await expect(adminPage.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Wait for upload completion
    await expect(adminPage.locator('[data-testid="upload-success"]')).toBeVisible();
    
    // Verify file appears in list
    await expect(adminPage.locator('[data-testid="document-list"]')).toContainText('test-document.pdf');
    
    // Clean up
    await fs.unlink(testFile);
  });

  test('should filter documents by type and storage', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Test file type filter
    await adminPage.selectOption('[data-testid="file-type-filter"]', 'pdf');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify filtered results show only PDFs
    const fileItems = adminPage.locator('[data-testid="file-item"]');
    const count = await fileItems.count();
    
    for (let i = 0; i < count; i++) {
      await expect(fileItems.nth(i)).toContainText('.pdf');
    }
    
    // Test storage type filter
    await adminPage.selectOption('[data-testid="storage-filter"]', 'cloud');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify cloud storage indicator
    await expect(adminPage.locator('[data-testid="cloud-storage-badge"]')).toBeVisible();
  });

  test('should search documents', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Search for specific document
    await adminPage.fill('[data-testid="search-input"]', 'contract');
    await adminPage.click('[data-testid="search-button"]');
    
    // Verify search results
    await expect(adminPage.locator('[data-testid="document-list"]')).toContainText('contract');
  });

  test('should download documents', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Start download
    const downloadPromise = adminPage.waitForEvent('download');
    await adminPage.click('[data-testid="download-button"]:first-child');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should display legacy documents as read-only', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Filter to show legacy documents
    await adminPage.selectOption('[data-testid="storage-filter"]', 'legacy');
    await adminPage.click('[data-testid="apply-filters"]');
    
    // Verify legacy badge
    await expect(adminPage.locator('[data-testid="legacy-badge"]')).toBeVisible();
    
    // Verify no delete option for legacy documents
    await expect(adminPage.locator('[data-testid="delete-legacy-button"]')).not.toBeVisible();
  });

  test('should handle multiple file uploads', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Create multiple test files
    const testFiles = [
      path.join(__dirname, '../fixtures/test1.pdf'),
      path.join(__dirname, '../fixtures/test2.pdf'),
    ];
    
    for (const file of testFiles) {
      await fs.writeFile(file, 'test content');
    }
    
    // Upload multiple files
    await adminPage.setInputFiles('[data-testid="file-upload"]', testFiles);
    
    // Verify upload progress for each file
    await expect(adminPage.locator('[data-testid="upload-item"]')).toHaveCount(2);
    
    // Wait for all uploads to complete
    await expect(adminPage.locator('[data-testid="upload-complete"]')).toHaveCount(2);
    
    // Clean up
    for (const file of testFiles) {
      await fs.unlink(file);
    }
  });

  test('should validate file types and sizes', async ({ adminPage }) => {
    await adminPage.goto('/documents');
    
    // Create an invalid file type
    const invalidFile = path.join(__dirname, '../fixtures/test.exe');
    await fs.writeFile(invalidFile, 'test content');
    
    // Try to upload invalid file
    await adminPage.setInputFiles('[data-testid="file-upload"]', invalidFile);
    
    // Verify error message
    await expect(adminPage.locator('[data-testid="file-type-error"]')).toBeVisible();
    
    // Clean up
    await fs.unlink(invalidFile);
  });

  test('employee should have limited document access', async ({ employeePage }) => {
    await employeePage.goto('/documents');
    
    // Verify basic access
    await expect(employeePage.locator('h1')).toContainText('Documents');
    
    // Should not see admin controls
    await expect(employeePage.locator('[data-testid="admin-document-controls"]')).not.toBeVisible();
    
    // Should be able to upload
    await expect(employeePage.locator('[data-testid="file-upload"]')).toBeVisible();
    
    // Should be able to download own documents
    await expect(employeePage.locator('[data-testid="download-button"]')).toBeVisible();
  });
});

test.describe('Document Mobile Interface', () => {
  test('should handle document management on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    const authHelper = new (await import('../utils/auth-helper')).AuthHelper(page);
    await authHelper.loginAsAdmin();
    
    await page.goto('/documents');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-document-grid"]')).toBeVisible();
    
    // Test mobile filters toggle
    await page.click('[data-testid="mobile-filters-toggle"]');
    await expect(page.locator('[data-testid="document-filters"]')).toBeVisible();
    
    // Test mobile upload
    await expect(page.locator('[data-testid="mobile-upload-button"]')).toBeVisible();
  });
});