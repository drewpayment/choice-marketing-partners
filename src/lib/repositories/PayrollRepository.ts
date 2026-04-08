import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { VendorFieldRepository } from '@/lib/repositories/VendorFieldRepository'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { logger } from '@/lib/utils/logger'
import type { UserContext } from '@/lib/auth/types'


export interface PayrollFilters {
  employeeId?: number
  vendorId?: number
  issueDate?: string
  agentId?: string
  startDate?: string
  endDate?: string
  status?: 'paid' | 'unpaid' | 'all'
  page?: number
  limit?: number
}

export interface PayrollResponse {
  data: PayrollSummary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PayrollSummary {
  employeeId: number
  employeeName: string
  agentId: string
  vendorId: number
  vendorName: string
  issueDate: string
  totalSales: number
  totalOverrides: number
  totalExpenses: number
  netPay: number
  paystubCount: number
  lastUpdated: string // ISO timestamp of most recent update to any paystub in this group
}

export interface PaystubDetail {
  employee: {
    id: number
    name: string
    email: string
    sales_id1: string
    is_active: number
    is_admin: number
    is_mgr: number
  }
  vendor: {
    id: number
    name: string
    is_active: number
  }
  issueDate: string
  sales: Array<{
    invoice_id: number
    agentid: number
    amount: string
    first_name: string
    last_name: string
    address: string
    city: string
    vendor: string
    sale_date: Date
    issue_date: Date
    custom_fields?: Record<string, string>
  }>
  overrides: Array<{
    ovrid: number
    agentid: number
    name: string
    sales: number
    commission: string
    total: string
    issue_date: Date
  }>
  expenses: Array<{
    expid: number
    agentid: number
    type: string
    amount: string
    notes: string
    issue_date: Date
  }>
  totals: {
    sales: number
    overrides: number
    expenses: number
    netPay: number
  }
  isPaid: boolean
  generatedAt?: string
  weekending?: string
  fieldConfig?: Array<{
    field_key: string
    field_label: string
    source: 'builtin' | 'custom'
    display_order: number
  }>
}

export interface PaystubDeletionPreview {
  canDelete: boolean
  isPaid: boolean
  reason?: string
  agent?: { id: number; name: string }
  vendor?: { id: number; name: string }
  issueDate?: string
  summary?: {
    paystubCount: number
    invoiceCount: number
    overrideCount: number
    expenseCount: number
    paystubTotal: number
    invoiceTotal: number
    overrideTotal: number
    expenseTotal: number
  }
}

export interface PaystubDeletionResult {
  success: boolean
  auditId?: number
  deleted: {
    paystubs: number
    invoices: number
    overrides: number
    expenses: number
    payroll: number
  }
  error?: string
}

/**
 * Repository for payroll-related data operations
 */
export class PayrollRepository {
  
  /**
   * Get payroll summary data with role-based filtering and pagination
   */
  async getPayrollSummary(
    filters: PayrollFilters = {},
    userContext: {
      isAdmin: boolean
      isManager: boolean
      employeeId?: number
      managedEmployeeIds?: number[]
    }
  ): Promise<PayrollResponse> {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    // Get distinct agent/vendor/issue_date combinations from paystubs
    let query = db
      .selectFrom('paystubs')
      .leftJoin('employees', 'paystubs.agent_id', 'employees.id')
      .leftJoin('vendors', 'paystubs.vendor_id', 'vendors.id')
      .select([
        'employees.id as employeeId',
        'employees.name as employeeName',
        'paystubs.agent_id as agentId',
        'paystubs.vendor_id as vendorId',
        'vendors.name as vendorName',
        'paystubs.issue_date as issueDate',
        db.fn.sum('paystubs.amount').as('netPay'),
        db.fn.max('paystubs.updated_at').as('lastUpdated')
      ])
      .groupBy([
        'employees.id',
        'employees.name',
        'paystubs.agent_id',
        'paystubs.vendor_id',
        'vendors.name',
        'paystubs.issue_date'
      ])

    // Apply role-based filtering
    if (!userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        query = query.where('employees.id', 'in', userContext.managedEmployeeIds)
      } else if (userContext.employeeId) {
        query = query.where('employees.id', '=', userContext.employeeId)
      } else {
        // No access - return empty results
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    }

    // Apply additional filters
    if (filters.employeeId) {
      query = query.where('employees.id', '=', filters.employeeId)
    }
    
    if (filters.vendorId) {
      query = query.where('paystubs.vendor_id', '=', filters.vendorId)
    }
    
    if (filters.issueDate) {
      // Use direct date string comparison to avoid timezone issues
      query = query.where(db.fn('DATE', ['paystubs.issue_date']), '=', filters.issueDate)
    }
    
    if (filters.startDate) {
      // Use direct date string comparison for start date
      query = query.where(db.fn('DATE', ['paystubs.issue_date']), '>=', filters.startDate)
    }
    
    if (filters.endDate) {
      // Use direct date string comparison for end date
      query = query.where(db.fn('DATE', ['paystubs.issue_date']), '<=', filters.endDate)
    }

    // Get total count for pagination by creating a separate count query
    let countQuery = db
      .selectFrom('paystubs')
      .leftJoin('employees', 'paystubs.agent_id', 'employees.id')
      .leftJoin('vendors', 'paystubs.vendor_id', 'vendors.id')

    // Apply the same role-based filtering to count query
    if (!userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        countQuery = countQuery.where('employees.id', 'in', userContext.managedEmployeeIds)
      } else if (userContext.employeeId) {
        countQuery = countQuery.where('employees.id', '=', userContext.employeeId)
      }
    }

    // Apply the same additional filters to count query
    if (filters.employeeId) {
      countQuery = countQuery.where('employees.id', '=', filters.employeeId)
    }
    
    if (filters.vendorId) {
      countQuery = countQuery.where('paystubs.vendor_id', '=', filters.vendorId)
    }
    
    if (filters.issueDate) {
      // Use direct date string comparison to avoid timezone issues
      countQuery = countQuery.where(db.fn('DATE', ['paystubs.issue_date']), '=', filters.issueDate)
    }
    
    if (filters.startDate) {
      // Use direct date string comparison for start date
      countQuery = countQuery.where(db.fn('DATE', ['paystubs.issue_date']), '>=', filters.startDate)
    }
    
    if (filters.endDate) {
      // Use direct date string comparison for end date
      countQuery = countQuery.where(db.fn('DATE', ['paystubs.issue_date']), '<=', filters.endDate)
    }

    // Count distinct combinations using a subquery approach
    const totalResult = await countQuery
      .select([
        'employees.id as employeeId',
        'paystubs.vendor_id as vendorId',
        'paystubs.issue_date as issueDate'
      ])
      .groupBy([
        'employees.id',
        'paystubs.vendor_id',
        'paystubs.issue_date'
      ])
      .execute()
    
    const total = totalResult.length
    const totalPages = Math.ceil(total / limit)

    // Get paginated results
    const results = await query
      .orderBy('paystubs.issue_date', 'desc')
      .orderBy('employees.name', 'asc')
      .limit(limit)
      .offset(offset)
      .execute()

    if (results.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: false,
          hasPrev: page > 1
        }
      }
    }

    // Extract unique combinations for batch queries
    const combinations = results
      .filter(r => r.employeeId && r.agentId)
      .map(r => ({
        agentId: r.agentId.toString(),
        vendorId: r.vendorId,
        issueDate: r.issueDate.toISOString().split('T')[0]
      }))

    if (combinations.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    }

    // Get employee info for debugging purposes only
    const employeeIds = [...new Set(results.map(r => r.employeeId).filter(Boolean))]
    const employees = await db
      .selectFrom('employees')
      .select(['id', 'sales_id1', 'name'])
      .where('id', 'in', employeeIds)
      .execute()

    const employeeMap = new Map(employees.map(e => [e.id, { sales_id1: e.sales_id1, name: e.name }]))

    // CRITICAL: The "agentid" column in invoices, overrides, and expenses tables is a FK to employees.id
    // It is NOT related to sales_id1 - "agentid" is just a poorly named column that stores employee.id
    // We use paystubs.agent_id (which is also employees.id) directly for all batch queries
    const salesCombinations = results
      .map(r => {
        // Handle case where employeeId might be null
        if (!r.employeeId || !r.agentId) return null
        
        const employeeInfo = employeeMap.get(r.employeeId)
        
        return {
          agentId: r.agentId.toString(),  // paystubs.agent_id = employees.id
          vendorId: r.vendorId,
          issueDate: r.issueDate.toISOString().split('T')[0],
          originalAgentId: r.agentId.toString()  // Keep for key mapping
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // Batch fetch all totals in parallel to avoid race conditions
    const [salesTotals, overridesTotals, expensesTotals, paystubCounts] = await Promise.all([
      this.getBatchSalesTotals(salesCombinations),
      this.getBatchOverridesTotals(salesCombinations),
      this.getBatchExpensesTotals(salesCombinations),
      this.getBatchPaystubCounts(combinations)
    ])

    // Build summaries using the batched data
    const summaries: PayrollSummary[] = []

    for (const result of results) {
      if (!result.employeeId || !result.agentId) continue

      const key = `${result.agentId}-${result.vendorId}-${result.issueDate.toISOString().split('T')[0]}`

      const salesTotal = salesTotals.get(key) || 0
      const overridesTotal = overridesTotals.get(key) || 0
      const expensesTotal = expensesTotals.get(key) || 0
      const paystubCount = paystubCounts.get(key) || 0

      summaries.push({
        employeeId: result.employeeId,
        employeeName: result.employeeName || 'Unknown',
        agentId: result.agentId.toString(),
        vendorId: result.vendorId,
        vendorName: result.vendorName || 'Unknown',
        issueDate: result.issueDate.toISOString().split('T')[0],
        totalSales: salesTotal,
        totalOverrides: overridesTotal,
        totalExpenses: expensesTotal,
        netPay: parseFloat(result.netPay?.toString() || '0'),
        paystubCount,
        lastUpdated: result.lastUpdated?.toISOString() || new Date().toISOString()
      })
    }
    
    return {
      data: summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Get detailed paystub information
   */
  async getPaystubDetail(
    employeeId: number,
    vendorId: number,
    issueDate: string,
    userContext: {
      isAdmin: boolean
      isManager: boolean
      employeeId?: number
      managedEmployeeIds?: number[]
    }
  ): Promise<PaystubDetail | null> {
    // Validate access
    if (!this.hasEmployeeAccess(employeeId, userContext)) {
      return null
    }

    // Get employee info
    const employee = await db
      .selectFrom('employees')
      .selectAll()
      .where('id', '=', employeeId)
      .executeTakeFirst()

    if (!employee) return null

    // Get vendor info
    const vendor = await db
      .selectFrom('vendors')
      .selectAll()
      .where('id', '=', vendorId)
      .executeTakeFirst()

    if (!vendor) return null

    // Use the employee's primary ID as the agentid for database queries
    const agentIdForQueries = employee.id

    // Get sales data (from invoices table)
    const sales = await db
      .selectFrom('invoices')
      .selectAll()
      .where('agentid', '=', agentIdForQueries)
      .where('vendor', '=', vendor.id as unknown as string)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Get overrides data
    const overrides = await db
      .selectFrom('overrides')
      .selectAll()
      .where('agentid', '=', agentIdForQueries)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Get expenses data
    const expenses = await db
      .selectFrom('expenses')
      .selectAll()
      .where('agentid', '=', agentIdForQueries)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Get paystub info
    const paystub = await db
      .selectFrom('paystubs')
      .select(['created_at', 'weekend_date'])
      .where('agent_id', '=', agentIdForQueries)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    // Calculate totals
    const salesTotal = sales.reduce((sum, invoice) => sum + parseFloat(invoice.amount || '0'), 0)
    const overridesTotal = overrides.reduce((sum, override) => sum + parseFloat(override.total || '0'), 0)
    const expensesTotal = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0)

    // Parse custom_fields JSON for each sale
    const salesWithCustomFields = sales.map(sale => {
      let customFields: Record<string, string> | undefined
      try {
        if (sale.custom_fields) {
          customFields = typeof sale.custom_fields === 'string'
            ? JSON.parse(sale.custom_fields)
            : sale.custom_fields as unknown as Record<string, string>
        }
      } catch (e) {
        logger.warn('Failed to parse custom_fields for invoice', sale.invoice_id, e)
      }
      return { ...sale, custom_fields: customFields }
    })

    // Fetch vendor field configuration (only if feature flag is enabled)
    let fieldConfig: Awaited<ReturnType<VendorFieldRepository['getFieldsByVendor']>> = []
    const flagEnabled = await isFeatureEnabled('vendor_custom_fields', {
      userId: String(userContext.employeeId ?? ''),
      isAdmin: userContext.isAdmin,
      isManager: userContext.isManager,
      isSubscriber: false,
      subscriberId: null,
    })
    if (flagEnabled) {
      const vendorFieldRepo = new VendorFieldRepository()
      fieldConfig = await vendorFieldRepo.getFieldsByVendor(vendorId, false, userContext)
    }

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        sales_id1: employee.sales_id1,
        is_active: employee.is_active,
        is_admin: employee.is_admin,
        is_mgr: employee.is_mgr
      },
      vendor: {
        id: vendor.id,
        name: vendor.name,
        is_active: vendor.is_active
      },
      issueDate,
      sales: salesWithCustomFields,
      overrides,
      expenses,
      totals: {
        sales: salesTotal,
        overrides: overridesTotal,
        expenses: expensesTotal,
        netPay: salesTotal + overridesTotal + expensesTotal
      },
      isPaid: false, // Will be determined by payroll table later
      generatedAt: paystub?.created_at?.toISOString(),
      weekending: paystub?.weekend_date ? dayjs(paystub.weekend_date).format('MM-DD-YYYY') : undefined,
      fieldConfig: fieldConfig.length > 0 ? fieldConfig.map(f => ({
        field_key: f.field_key,
        field_label: f.field_label,
        source: f.source,
        display_order: f.display_order,
      })) : undefined,
    }
  }

  /**
   * Search paystubs with filters
   */
  async searchPaystubs(
    searchTerm: string,
    filters: PayrollFilters = {},
    userContext: {
      isAdmin: boolean
      isManager: boolean
      employeeId?: number
      managedEmployeeIds?: number[]
    }
  ): Promise<PayrollResponse> {
    // Build search filters
    const searchFilters: PayrollFilters = { ...filters }

    // If search term looks like a date, add it to issue date filter
    if (/^\d{4}-\d{2}-\d{2}$/.test(searchTerm)) {
      searchFilters.issueDate = searchTerm
    }

    return this.getPayrollSummary(searchFilters, userContext)
  }

  /**
   * Get available issue dates for role-based access
   */
  async getAvailableIssueDates(
    userContext: {
      isAdmin: boolean
      isManager: boolean
      employeeId?: number
      managedEmployeeIds?: number[]
    }
  ): Promise<string[]> {
    let query = db
      .selectFrom('paystubs')
      .leftJoin('employees', 'paystubs.agent_id', 'employees.id')
      .select('paystubs.issue_date')
      .distinct()

    // Apply role-based filtering
    if (!userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        query = query.where('employees.id', 'in', userContext.managedEmployeeIds)
      } else if (userContext.employeeId) {
        query = query.where('employees.id', '=', userContext.employeeId)
      } else {
        return []
      }
    }

    const results = await query
      .orderBy('paystubs.issue_date', 'desc')
      .execute()

    return results.map(r => r.issue_date.toISOString().split('T')[0]).filter(Boolean)
  }

  /**
   * Preview what will be deleted for a pay statement.
   * Checks payroll.is_paid and returns counts/totals of related records.
   */
  async previewPaystubDeletion(
    agentId: number,
    vendorId: number,
    issueDate: string,
    userContext: UserContext
  ): Promise<PaystubDeletionPreview> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }

    // Check if payroll record is paid
    const payrollRecord = await db
      .selectFrom('payroll')
      .select(['is_paid'])
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['pay_date']), '=', issueDate)
      .executeTakeFirst()

    if (payrollRecord && payrollRecord.is_paid === 1) {
      return {
        canDelete: false,
        isPaid: true,
        reason: 'Pay statement has been marked as paid and cannot be deleted.',
      }
    }

    // Get employee info
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name'])
      .where('id', '=', agentId)
      .executeTakeFirst()

    // Get vendor info
    const vendor = await db
      .selectFrom('vendors')
      .select(['id', 'name'])
      .where('id', '=', vendorId)
      .executeTakeFirst()

    // Count and total paystubs
    const paystubs = await db
      .selectFrom('paystubs')
      .selectAll()
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Count and total invoices
    const invoices = await db
      .selectFrom('invoices')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor', '=', vendorId.toString())
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Count and total overrides
    const overrides = await db
      .selectFrom('overrides')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Count and total expenses
    const expenses = await db
      .selectFrom('expenses')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    const paystubTotal = paystubs.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0)
    const invoiceTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount?.toString() || '0'), 0)
    const overrideTotal = overrides.reduce((sum, o) => sum + parseFloat(o.total?.toString() || '0'), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0)

    return {
      canDelete: true,
      isPaid: false,
      agent: employee ? { id: employee.id, name: employee.name } : undefined,
      vendor: vendor ? { id: vendor.id, name: vendor.name } : undefined,
      issueDate,
      summary: {
        paystubCount: paystubs.length,
        invoiceCount: invoices.length,
        overrideCount: overrides.length,
        expenseCount: expenses.length,
        paystubTotal,
        invoiceTotal,
        overrideTotal,
        expenseTotal,
      },
    }
  }

  /**
   * Delete a pay statement and all related records with full audit trail.
   * All operations run within a single transaction - full rollback on any failure.
   */
  async deletePaystubWithAudit(
    agentId: number,
    vendorId: number,
    issueDate: string,
    userContext: UserContext,
    deletedBy: number,
    reason: string,
    ipAddress: string
  ): Promise<PaystubDeletionResult> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Deletion reason is required')
    }

    return await db.transaction().execute(async (trx) => {
      // 1. Re-check payroll.is_paid inside transaction (race condition guard)
      const payrollRecord = await trx
        .selectFrom('payroll')
        .selectAll()
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['pay_date']), '=', issueDate)
        .executeTakeFirst()

      if (payrollRecord && payrollRecord.is_paid === 1) {
        return {
          success: false,
          deleted: { paystubs: 0, invoices: 0, overrides: 0, expenses: 0, payroll: 0 },
          error: 'Pay statement has been marked as paid and cannot be deleted.',
        }
      }

      // 2. Fetch all records before deletion for audit
      const paystubs = await trx
        .selectFrom('paystubs')
        .selectAll()
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const invoices = await trx
        .selectFrom('invoices')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor', '=', vendorId.toString())
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const overrides = await trx
        .selectFrom('overrides')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const expenses = await trx
        .selectFrom('expenses')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      // Calculate totals
      const paystubTotal = paystubs.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0)
      const invoiceTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount?.toString() || '0'), 0)
      const overrideTotal = overrides.reduce((sum, o) => sum + parseFloat(o.total?.toString() || '0'), 0)
      const expenseTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0)

      // 3. Insert audit record with full JSON data
      const auditResult = await trx
        .insertInto('payroll_audit')
        .values({
          agent_id: agentId,
          vendor_id: vendorId,
          issue_date: new Date(issueDate),
          deleted_by: deletedBy,
          deletion_reason: reason.trim(),
          deleted_at: new Date(),
          ip_address: ipAddress,
          deleted_paystubs_count: paystubs.length,
          deleted_invoices_count: invoices.length,
          deleted_overrides_count: overrides.length,
          deleted_expenses_count: expenses.length,
          paystub_total: paystubTotal,
          invoices_total: invoiceTotal,
          overrides_total: overrideTotal,
          expenses_total: expenseTotal,
          paystub_data: JSON.stringify(paystubs),
          payroll_data: JSON.stringify(payrollRecord ? [payrollRecord] : []),
          invoices_data: JSON.stringify(invoices),
          overrides_data: JSON.stringify(overrides),
          expenses_data: JSON.stringify(expenses),
        })
        .executeTakeFirst()

      const auditId = Number(auditResult.insertId)

      // 4. Delete all related records
      const invoiceResult = await trx
        .deleteFrom('invoices')
        .where('agentid', '=', agentId)
        .where('vendor', '=', vendorId.toString())
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const overrideResult = await trx
        .deleteFrom('overrides')
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const expenseResult = await trx
        .deleteFrom('expenses')
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const paystubResult = await trx
        .deleteFrom('paystubs')
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      const payrollResult = await trx
        .deleteFrom('payroll')
        .where('agent_id', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['pay_date']), '=', issueDate)
        .execute()

      return {
        success: true,
        auditId,
        deleted: {
          paystubs: paystubResult.length,
          invoices: invoiceResult.length,
          overrides: overrideResult.length,
          expenses: expenseResult.length,
          payroll: payrollResult.length,
        },
      }
    })
  }

  /**
   * Private helper methods
   */
  private async getSalesTotal(agentId: string, vendorId: number, issueDate: string): Promise<number> {
    const result = await db
      .selectFrom('invoices')
      .select(db.fn.sum('amount').as('total'))
      .where('agentid', '=', parseInt(agentId))
      .where('vendor', '=', vendorId.toString())
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    return parseFloat(result?.total?.toString() || '0')
  }

  private async getBatchSalesTotals(
    combinations: Array<{ agentId: string; vendorId: number; issueDate: string; originalAgentId: string }>
  ): Promise<Map<string, number>> {
    const totalsMap = new Map<string, number>()

    if (combinations.length === 0) return totalsMap

    // Build OR conditions for each combination
    const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
    const vendorIds = [...new Set(combinations.map(c => c.vendorId))]
    const issueDates = [...new Set(combinations.map(c => c.issueDate))]

    if (agentIds.length === 0 || vendorIds.length === 0 || issueDates.length === 0) return totalsMap

    const results = await db
      .selectFrom('invoices')
      .select([
        'agentid',
        'vendor',
        'issue_date',
        db.fn.sum('amount').as('total')
      ])
      .where('agentid', 'in', agentIds)
      .where('vendor', 'in', vendorIds.map(v => v.toString()))
      .where(db.fn('DATE', ['issue_date']), 'in', issueDates)
      .groupBy(['agentid', 'vendor', 'issue_date'])
      .execute()

    for (const result of results) {
      const issueDate = result.issue_date.toISOString().split('T')[0]
      const vendorId = parseInt(result.vendor)
      // Find matching combination to get originalAgentId
      const combination = combinations.find(c =>
        parseInt(c.agentId) === result.agentid &&
        c.vendorId === vendorId &&
        c.issueDate === issueDate
      )
      if (combination) {
        const key = `${combination.originalAgentId}-${vendorId}-${issueDate}`
        totalsMap.set(key, parseFloat(result.total?.toString() || '0'))
      }
    }

    return totalsMap
  }

  private async getOverridesTotal(agentId: string, vendorId: number, issueDate: string): Promise<number> {
    const result = await db
      .selectFrom('overrides')
      .select(db.fn.sum('total').as('total'))
      .where('agentid', '=', parseInt(agentId))
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    return parseFloat(result?.total?.toString() || '0')
  }

  private async getBatchOverridesTotals(
    combinations: Array<{ agentId: string; vendorId: number; issueDate: string; originalAgentId: string }>
  ): Promise<Map<string, number>> {
    const totalsMap = new Map<string, number>()
    
    if (combinations.length === 0) return totalsMap

    const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
    const vendorIds = [...new Set(combinations.map(c => c.vendorId))]
    const issueDates = [...new Set(combinations.map(c => c.issueDate))]
    
    if (agentIds.length === 0 || vendorIds.length === 0 || issueDates.length === 0) return totalsMap

    const results = await db
      .selectFrom('overrides')
      .select([
        'agentid',
        'vendor_id',
        'issue_date',
        db.fn.sum('total').as('total')
      ])
      .where('agentid', 'in', agentIds)
      .where('vendor_id', 'in', vendorIds)
      .where(db.fn('DATE', ['issue_date']), 'in', issueDates)
      .groupBy(['agentid', 'vendor_id', 'issue_date'])
      .execute()

    for (const result of results) {
      const issueDate = result.issue_date.toISOString().split('T')[0]
      // Find matching combination to get originalAgentId
      const combination = combinations.find(c => 
        parseInt(c.agentId) === result.agentid && 
        c.vendorId === result.vendor_id && 
        c.issueDate === issueDate
      )
      if (combination) {
        const key = `${combination.originalAgentId}-${result.vendor_id}-${issueDate}`
        totalsMap.set(key, parseFloat(result.total?.toString() || '0'))
      }
    }

    return totalsMap
  }

  private async getExpensesTotal(agentId: string, vendorId: number, issueDate: string): Promise<number> {
    const result = await db
      .selectFrom('expenses')
      .select(db.fn.sum('amount').as('total'))
      .where('agentid', '=', parseInt(agentId))
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    return parseFloat(result?.total?.toString() || '0')
  }

  private async getBatchExpensesTotals(
    combinations: Array<{ agentId: string; vendorId: number; issueDate: string; originalAgentId: string }>
  ): Promise<Map<string, number>> {
    const totalsMap = new Map<string, number>()
    
    if (combinations.length === 0) return totalsMap

    const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
    const vendorIds = [...new Set(combinations.map(c => c.vendorId))]
    const issueDates = [...new Set(combinations.map(c => c.issueDate))]
    
    if (agentIds.length === 0 || vendorIds.length === 0 || issueDates.length === 0) return totalsMap

    const results = await db
      .selectFrom('expenses')
      .select([
        'agentid',
        'vendor_id',
        'issue_date',
        db.fn.sum('amount').as('total')
      ])
      .where('agentid', 'in', agentIds)
      .where('vendor_id', 'in', vendorIds)
      .where(db.fn('DATE', ['issue_date']), 'in', issueDates)
      .groupBy(['agentid', 'vendor_id', 'issue_date'])
      .execute()

    for (const result of results) {
      const issueDate = result.issue_date.toISOString().split('T')[0]
      // Find matching combination to get originalAgentId
      const combination = combinations.find(c => 
        parseInt(c.agentId) === result.agentid && 
        c.vendorId === result.vendor_id && 
        c.issueDate === issueDate
      )
      if (combination) {
        const key = `${combination.originalAgentId}-${result.vendor_id}-${issueDate}`
        totalsMap.set(key, parseFloat(result.total?.toString() || '0'))
      }
    }

    return totalsMap
  }

  private async getPaystubCount(agentId: string, vendorId: number, issueDate: string): Promise<number> {
    const result = await db
      .selectFrom('paystubs')
      .select(db.fn.count('id').as('count'))
      .where('agent_id', '=', parseInt(agentId))
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    return Number(result?.count || 0)
  }

  private async getBatchPaystubCounts(
    combinations: Array<{ agentId: string; vendorId: number; issueDate: string }>
  ): Promise<Map<string, number>> {
    const countsMap = new Map<string, number>()
    
    if (combinations.length === 0) return countsMap

    const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
    const vendorIds = [...new Set(combinations.map(c => c.vendorId))]
    const issueDates = [...new Set(combinations.map(c => c.issueDate))]
    
    if (agentIds.length === 0 || vendorIds.length === 0 || issueDates.length === 0) return countsMap

    const results = await db
      .selectFrom('paystubs')
      .select([
        'agent_id',
        'vendor_id',
        'issue_date',
        db.fn.count('id').as('count')
      ])
      .where('agent_id', 'in', agentIds)
      .where('vendor_id', 'in', vendorIds)
      .where(db.fn('DATE', ['issue_date']), 'in', issueDates)
      .groupBy(['agent_id', 'vendor_id', 'issue_date'])
      .execute()

    for (const result of results) {
      const issueDate = result.issue_date.toISOString().split('T')[0]
      const key = `${result.agent_id}-${result.vendor_id}-${issueDate}`
      countsMap.set(key, Number(result.count || 0))
    }

    return countsMap
  }

  private hasEmployeeAccess(
    targetEmployeeId: number,
    userContext: {
      isAdmin: boolean
      isManager: boolean
      employeeId?: number
      managedEmployeeIds?: number[]
    }
  ): boolean {
    // Admins can access any employee
    if (userContext.isAdmin) return true
    
    // Users can access their own data
    if (userContext.employeeId === targetEmployeeId) return true
    
    // Managers can access their managed employees
    if (userContext.isManager && userContext.managedEmployeeIds?.includes(targetEmployeeId)) {
      return true
    }
    
    return false
  }
}

export const payrollRepository = new PayrollRepository()
