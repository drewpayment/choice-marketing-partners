import { db } from '../../src/lib/database/client';
import bcrypt from 'bcryptjs';

export interface TestUser {
  id: number;
  email: string;
  password: string;
  isAdmin: boolean;
  isManager: boolean;
  employeeId: number;
  salesIds: string[];
}

export interface TestEmployee {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  isMgr: boolean;
  salesId1?: string;
  salesId2?: string;
  salesId3?: string;
}

export class TestDataSeeder {
  // Test users for authentication
  static readonly TEST_USERS: TestUser[] = [
    {
      id: 1,
      email: 'admin@test.com',
      password: 'password123',
      isAdmin: true,
      isManager: true,
      employeeId: 1,
      salesIds: ['ADMIN001']
    },
    {
      id: 2,
      email: 'manager@test.com',
      password: 'password123',
      isAdmin: false,
      isManager: true,
      employeeId: 2,
      salesIds: ['MGR001', 'MGR002']
    },
    {
      id: 3,
      email: 'employee@test.com',
      password: 'password123',
      isAdmin: false,
      isManager: false,
      employeeId: 3,
      salesIds: ['EMP001']
    }
  ];

  // Test employees
  static readonly TEST_EMPLOYEES: TestEmployee[] = [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@test.com',
      isActive: true,
      isAdmin: true,
      isMgr: true,
      salesId1: 'ADMIN001'
    },
    {
      id: 2,
      name: 'Manager User',
      email: 'manager@test.com',
      isActive: true,
      isAdmin: false,
      isMgr: true,
      salesId1: 'MGR001',
      salesId2: 'MGR002'
    },
    {
      id: 3,
      name: 'Employee User',
      email: 'employee@test.com',
      isActive: true,
      isAdmin: false,
      isMgr: false,
      salesId1: 'EMP001'
    }
  ];

  /**
   * Seed the test database with initial data
   */
  static async seedDatabase(): Promise<void> {
    try {
      // Clear existing test data
      await this.clearTestData();

      // Seed employees
      for (const employee of this.TEST_EMPLOYEES) {
        await db
          .insertInto('employees')
          .values({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            address: '123 Test St',
            is_active: employee.isActive ? 1 : 0,
            is_admin: employee.isAdmin ? 1 : 0,
            is_mgr: employee.isMgr ? 1 : 0,
            sales_id1: employee.salesId1 || '',
            sales_id2: employee.salesId2 || '',
            sales_id3: employee.salesId3 || '',
            created_at: new Date(),
            updated_at: new Date()
          })
          .execute();
      }

      // Seed users
      for (const user of this.TEST_USERS) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        await db
          .insertInto('users')
          .values({
            id: user.id,
            email: user.email,
            name: this.TEST_EMPLOYEES.find(e => e.id === user.employeeId)?.name || 'Test User',
            password: hashedPassword,
            created_at: new Date(),
            updated_at: new Date()
          })
          .execute();

        // Get the actual uid from the inserted user
        const insertedUser = await db
          .selectFrom('users')
          .select('uid')
          .where('id', '=', user.id)
          .executeTakeFirst();

        if (insertedUser) {
          // Create employee_user relationship using the uid
          await db
            .insertInto('employee_user')
            .values({
              employee_id: user.employeeId,
              user_id: insertedUser.uid
            })
            .execute();
        }
      }

      // Seed sample invoices
      await this.seedSampleInvoices();

      // Seed sample payroll records
      await this.seedSamplePayroll();

      console.log('Test database seeded successfully');
    } catch (error) {
      console.error('Error seeding test database:', error);
      throw error;
    }
  }

  /**
   * Clear all test data from the database
   */
  static async clearTestData(): Promise<void> {
    try {
            // Clear in order to respect foreign key constraints
      await db.deleteFrom('user_notifications').execute();
      await db.deleteFrom('employee_user').execute();
      await db.deleteFrom('manager_employees').execute();
      await db.deleteFrom('paystubs').execute();
      await db.deleteFrom('payroll').execute();
      await db.deleteFrom('invoices').execute();
      await db.deleteFrom('users').execute();
      await db.deleteFrom('employees').execute();

      console.log('Test data cleared successfully');
    } catch (error) {
      console.error('Error clearing test data:', error);
      throw error;
    }
  }

  /**
   * Seed sample invoices for testing
   */
  private static async seedSampleInvoices(): Promise<void> {
    const sampleInvoices = [
      {
        invoice_id: 1,
        agentid: 3,
        issue_date: new Date('2024-01-15'),
        sale_date: new Date('2024-01-15'),
        wkending: new Date('2024-01-21'),
        first_name: 'Test',
        last_name: 'Employee',
        address: '123 Test St',
        city: 'Test City',
        vendor: 'Test Vendor',
        amount: '2500.00',
        status: 'paid',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        invoice_id: 2,
        agentid: 2,
        issue_date: new Date('2024-01-15'),
        sale_date: new Date('2024-01-15'),
        wkending: new Date('2024-01-21'),
        first_name: 'Test',
        last_name: 'Manager',
        address: '456 Manager Ave',
        city: 'Manager City',
        vendor: 'Manager Vendor',
        amount: '3500.00',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    for (const invoice of sampleInvoices) {
      await db
        .insertInto('invoices')
        .values(invoice)
        .execute();
    }
  }

  /**
   * Seed sample payroll records for testing
   */
  private static async seedSamplePayroll(): Promise<void> {
    const samplePayrolls = [
      {
        id: 1,
        agent_id: 3,
        agent_name: 'Test Employee',
        pay_date: new Date('2024-01-15'),
        amount: '1950.00',
        is_paid: 1,
        vendor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        agent_id: 2,
        agent_name: 'Test Manager',
        pay_date: new Date('2024-01-15'),
        amount: '2750.00',
        is_paid: 0,
        vendor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    for (const payroll of samplePayrolls) {
      await db
        .insertInto('payroll')
        .values(payroll)
        .execute();
    }
  }

  /**
   * Get test user by role
   */
  static getTestUser(role: 'admin' | 'manager' | 'employee'): TestUser {
    switch (role) {
      case 'admin':
        return this.TEST_USERS[0];
      case 'manager':
        return this.TEST_USERS[1];
      case 'employee':
        return this.TEST_USERS[2];
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }

  /**
   * Reset database to clean state for tests
   */
  static async resetDatabase(): Promise<void> {
    await this.clearTestData();
    await this.seedDatabase();
  }
}