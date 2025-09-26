import { db } from '@/lib/database/client'
import dayjs from 'dayjs'

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

    // We need to get the sales_id1 for each employee to match against invoices table
    const employeeIds = [...new Set(results.map(r => r.employeeId).filter(Boolean))]
    const employees = await db
      .selectFrom('employees')
      .select(['id', 'sales_id1'])
      .where('id', 'in', employeeIds)
      .execute()

    const employeeMap = new Map(employees.map(e => [e.id, e.sales_id1]))

    // Update combinations to use sales_id1 instead of agent_id
    const salesCombinations = results
      .map(r => {
        // Handle case where employeeId might be null
        if (!r.employeeId || !r.agentId) return null
        
        const salesId = employeeMap.get(r.employeeId)
        if (!salesId) return null
        
        return {
          agentId: salesId,  // Use sales_id1 (already a string)
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
        netPay: salesTotal + overridesTotal + expensesTotal,
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
      sales,
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
      weekending: paystub?.weekend_date ? dayjs(paystub.weekend_date).format('MM-DD-YYYY') : undefined
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
   * Private helper methods
   */
  private async getSalesTotal(agentId: string, vendorId: number, issueDate: string): Promise<number> {
    const result = await db
      .selectFrom('invoices')
      .select(db.fn.sum('amount').as('total'))
      .where('agentid', '=', parseInt(agentId))
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
    const agentIds = [...new Set(combinations.map(c => parseInt(c.originalAgentId)).filter(id => !isNaN(id)))]
    const issueDates = [...new Set(combinations.map(c => c.issueDate))]
    
    if (agentIds.length === 0 || issueDates.length === 0) return totalsMap

    const results = await db
      .selectFrom('invoices')
      .select([
        'agentid',
        'issue_date',
        db.fn.sum('amount').as('total')
      ])
      .where('agentid', 'in', agentIds)
      .where(db.fn('DATE', ['issue_date']), 'in', issueDates)
      .groupBy(['agentid', 'issue_date'])
      .execute()

    for (const result of results) {
      const issueDate = result.issue_date.toISOString().split('T')[0]
      // Find matching combination to get vendorId and originalAgentId
      const combination = combinations.find(c => 
        parseInt(c.originalAgentId) === result.agentid && c.issueDate === issueDate
      )
      if (combination) {
        const key = `${combination.originalAgentId}-${combination.vendorId}-${issueDate}`
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

    const agentIds = [...new Set(combinations.map(c => parseInt(c.originalAgentId)).filter(id => !isNaN(id)))]
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
        parseInt(c.originalAgentId) === result.agentid && 
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

    const agentIds = [...new Set(combinations.map(c => parseInt(c.originalAgentId)).filter(id => !isNaN(id)))]
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
        parseInt(c.originalAgentId) === result.agentid && 
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
