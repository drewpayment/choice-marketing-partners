/**
 * Test file to verify PayrollRepository fix
 * This tests that the batch totals methods correctly use employee ID instead of sales_id1
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { db } from '../../lib/database/client'
import { payrollRepository } from '../../lib/repositories/PayrollRepository'

describe('PayrollRepository - Agent ID Mapping Fix', () => {
  let testEmployeeId: number
  let testVendorId: number
  let testIssueDate: string

  beforeAll(async () => {
    // Setup test data
    testIssueDate = '2025-10-15'
    
    // Find Payment Ventures LLC or Phil Reznik in test/production
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name', 'sales_id1'])
      .where('name', 'like', '%Payment Ventures%')
      .executeTakeFirst()

    if (!employee) {
      // Try Phil Reznik
      const employee2 = await db
        .selectFrom('employees')
        .select(['id', 'name', 'sales_id1'])
        .where('name', 'like', '%Phil Reznik%')
        .executeTakeFirst()
      
      if (!employee2) {
        throw new Error('Test employee not found')
      }
      
      testEmployeeId = employee2.id
    } else {
      testEmployeeId = employee.id
    }

    // Get a vendor they have paystubs for
    const paystub = await db
      .selectFrom('paystubs')
      .select(['vendor_id'])
      .where('agent_id', '=', testEmployeeId)
      .limit(1)
      .executeTakeFirst()

    if (!paystub) {
      throw new Error('No paystub found for test employee')
    }

    testVendorId = paystub.vendor_id
  })

  it('should correctly fetch sales totals using employee ID', async () => {
    // Get sales total using repository's batch method
    const combinations = [{
      agentId: testEmployeeId.toString(),
      vendorId: testVendorId,
      issueDate: testIssueDate,
      originalAgentId: testEmployeeId.toString()
    }]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repository = payrollRepository as any // Access private method for testing
    const salesTotals = await repository.getBatchSalesTotals(combinations)

    const key = `${testEmployeeId}-${testVendorId}-${testIssueDate}`
    const total = salesTotals.get(key)

    // Get expected total directly from database
    const expected = await db
      .selectFrom('invoices')
      .select(db.fn.sum('amount').as('total'))
      .where('agentid', '=', testEmployeeId)
      .where(db.fn('DATE', ['issue_date']), '=', testIssueDate)
      .executeTakeFirst()

    const expectedTotal = parseFloat(expected?.total?.toString() || '0')

    expect(total).toBe(expectedTotal)
    expect(total).toBeGreaterThan(0) // Should have actual sales data
  })

  it('should return correct payroll summary with non-zero totals', async () => {
    const userContext = {
      isAdmin: true,
      isManager: false,
      employeeId: undefined,
      managedEmployeeIds: []
    }

    const filters = {
      employeeId: testEmployeeId,
      issueDate: testIssueDate,
      page: 1,
      limit: 10
    }

    const result = await payrollRepository.getPayrollSummary(filters, userContext)

    expect(result.data.length).toBeGreaterThan(0)
    
    const summary = result.data[0]
    expect(summary.employeeId).toBe(testEmployeeId)
    expect(summary.netPay).toBeGreaterThan(0) // Should not be $0.00
    
    // Log for verification
    console.log('Payroll Summary:', {
      employeeName: summary.employeeName,
      totalSales: summary.totalSales,
      totalOverrides: summary.totalOverrides,
      totalExpenses: summary.totalExpenses,
      netPay: summary.netPay
    })
  })

  it('should match detail view totals with summary view totals', async () => {
    const userContext = {
      isAdmin: true,
      isManager: false,
      employeeId: undefined,
      managedEmployeeIds: []
    }

    // Get summary
    const summaryResult = await payrollRepository.getPayrollSummary(
      { employeeId: testEmployeeId, issueDate: testIssueDate },
      userContext
    )

    if (summaryResult.data.length === 0) {
      throw new Error('No summary data found')
    }

    const summary = summaryResult.data[0]

    // Get detail
    const detail = await payrollRepository.getPaystubDetail(
      testEmployeeId,
      summary.vendorId,
      testIssueDate,
      userContext
    )

    if (!detail) {
      throw new Error('No detail data found')
    }

    // Calculate totals from detail
    const detailSalesTotal = detail.sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0)
    const detailOverridesTotal = detail.overrides.reduce((sum, override) => sum + parseFloat(override.total), 0)
    const detailExpensesTotal = detail.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
    const detailNetPay = detailSalesTotal + detailOverridesTotal + detailExpensesTotal

    // Totals should match
    expect(summary.totalSales).toBeCloseTo(detailSalesTotal, 2)
    expect(summary.totalOverrides).toBeCloseTo(detailOverridesTotal, 2)
    expect(summary.totalExpenses).toBeCloseTo(detailExpensesTotal, 2)
    expect(summary.netPay).toBeCloseTo(detailNetPay, 2)
  })
})
