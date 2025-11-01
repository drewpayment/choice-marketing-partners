import { Page, expect } from '@playwright/test';

export class PerformanceHelper {
  constructor(private page: Page) {}

  /**
   * Measure page load performance
   */
  async measurePageLoad(url: string) {
    const startTime = Date.now();
    
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Assert load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    return loadTime;
  }

  /**
   * Measure API response times
   */
  async measureApiResponse(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    const startTime = Date.now();
    
    const response = await this.page.evaluate(async ({ endpoint, method, data }) => {
      const options: RequestInit = { method };
      
      if (data) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(data);
      }
      
      const res = await fetch(endpoint, options);
      return {
        status: res.status,
        ok: res.ok
      };
    }, { endpoint, method, data });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Assert response time is under 500ms
    expect(responseTime).toBeLessThan(500);
    expect(response.ok).toBeTruthy();
    
    return responseTime;
  }

  /**
   * Measure database query performance
   */
  async measureDatabaseQuery(queryName: string) {
    const response = await this.page.evaluate(async (query) => {
      const res = await fetch(`/api/test/performance/${query}`);
      return res.json();
    }, queryName);
    
    // Assert query time is under 100ms
    expect(response.queryTime).toBeLessThan(100);
    
    return response.queryTime;
  }

  /**
   * Test concurrent user simulation
   */
  async simulateConcurrentUsers(userCount: number, testFunction: () => Promise<void>) {
    const promises = [];
    
    for (let i = 0; i < userCount; i++) {
      promises.push(testFunction());
    }
    
    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    
    // Assert concurrent operations complete within reasonable time
    expect(totalTime).toBeLessThan(10000); // 10 seconds max
    
    return totalTime;
  }

  /**
   * Measure memory usage
   */
  async measureMemoryUsage(): Promise<number> {
    const metrics = await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    return metrics;
  }

  /**
   * Test file upload performance
   */
  async measureFileUpload(filePath: string, expectedSizeKB: number) {
    const startTime = Date.now();
    
    await this.page.setInputFiles('[data-testid="file-upload"]', filePath);
    await this.page.waitForSelector('[data-testid="upload-complete"]');
    
    const endTime = Date.now();
    const uploadTime = endTime - startTime;
    
    // Assert upload time is reasonable (max 10 seconds per MB)
    const maxTime = (expectedSizeKB / 1024) * 10000;
    expect(uploadTime).toBeLessThan(maxTime);
    
    return uploadTime;
  }

  /**
   * Measure PDF generation performance
   */
  async measurePdfGeneration() {
    const startTime = Date.now();
    
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="generate-pdf"]');
    await downloadPromise;
    
    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    // Assert PDF generation is under 5 seconds
    expect(generationTime).toBeLessThan(5000);
    
    return generationTime;
  }

  /**
   * Check Core Web Vitals
   */
  async getCoreWebVitals() {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = (entry as any).processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              vitals.cls = (vitals.cls || 0) + (entry as any).value;
            }
          });
          
          setTimeout(() => resolve(vitals), 1000);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      });
    });
  }
}