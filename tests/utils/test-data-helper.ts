import { Page } from '@playwright/test';

export class TestDataHelper {
  constructor(private page: Page) {}

  /**
   * Seed test database with sample data
   */
  async seedTestData() {
    // Create test users
    await this.createTestUsers();
    
    // Create test employees
    await this.createTestEmployees();
    
    // Create test payroll data
    await this.createTestPayroll();
    
    // Create test documents
    await this.createTestDocuments();
  }

  private async createTestUsers() {
    const users = [
      {
        email: 'admin@example.com',
        password: 'password',
        role: 'admin'
      },
      {
        email: 'manager@example.com',
        password: 'password',
        role: 'manager'
      },
      {
        email: 'employee@example.com',
        password: 'password',
        role: 'employee'
      }
    ];

    for (const user of users) {
      await this.page.evaluate(async (userData) => {
        await fetch('/api/test/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      }, user);
    }
  }

  private async createTestEmployees() {
    const employees = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        salesId1: 'EMP001',
        isActive: true
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        salesId1: 'EMP002',
        isActive: true
      }
    ];

    for (const employee of employees) {
      await this.page.evaluate(async (empData) => {
        await fetch('/api/test/create-employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empData)
        });
      }, employee);
    }
  }

  private async createTestPayroll() {
    const payrollData = [
      {
        salesId1: 'EMP001',
        vendorId: 'V001',
        issueDate: '2024-01-15',
        salesTotal: 1000.00,
        overridesTotal: 100.00,
        expensesTotal: 50.00
      }
    ];

    for (const payroll of payrollData) {
      await this.page.evaluate(async (data) => {
        await fetch('/api/test/create-payroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }, payroll);
    }
  }

  private async createTestDocuments() {
    const documents = [
      {
        fileName: 'test-contract.pdf',
        fileType: 'pdf',
        storageType: 'cloud',
        employeeId: 1
      },
      {
        fileName: 'legacy-document.pdf',
        fileType: 'pdf',
        storageType: 'legacy',
        employeeId: 1
      }
    ];

    for (const doc of documents) {
      await this.page.evaluate(async (docData) => {
        await fetch('/api/test/create-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(docData)
        });
      }, doc);
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    await this.page.evaluate(async () => {
      await fetch('/api/test/cleanup', {
        method: 'DELETE'
      });
    });
  }
}

export class DatabaseHelper {
  constructor(private page: Page) {}

  /**
   * Create isolated test database transaction
   */
  async startTransaction() {
    await this.page.evaluate(async () => {
      await fetch('/api/test/start-transaction', {
        method: 'POST'
      });
    });
  }

  /**
   * Rollback test database transaction
   */
  async rollbackTransaction() {
    await this.page.evaluate(async () => {
      await fetch('/api/test/rollback-transaction', {
        method: 'POST'
      });
    });
  }

  /**
   * Check database connection
   */
  async checkConnection(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      const response = await fetch('/api/test/db-health');
      return response.ok;
    });
  }
}