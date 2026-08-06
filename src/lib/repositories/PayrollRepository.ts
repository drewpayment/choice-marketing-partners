import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { AdvanceRepository } from '@/lib/repositories/AdvanceRepository'
import { VendorFieldRepository } from '@/lib/repositories/VendorFieldRepository'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { logger } from '@/lib/utils/logger'
import { accessibleEmployeeIds, type UserContext } from '@/lib/auth/types'
import {
  getEmployeeVisibilityCutoff,
  DEFAULT_RELEASE_HOUR,
  DEFAULT_RELEASE_MINUTE,
} from '@/lib/utils/payroll-visibility'


/**
 * Optional narrowing of a payroll list to one side of an elevated user's access:
 * `mine` = only their own statements, `team` = only the people they manage.
 *
 * SECURITY: a scope may only ever REMOVE rows from what the role filter already
 * allows. It is intersected with the role-resolved id set, never substituted for
 * it. See `resolveEmployeeScope`.
 */
export type PayrollScope = 'mine' | 'team'

const PAYROLL_SCOPES: readonly PayrollScope[] = ['mine', 'team']

/**
 * Validate an untrusted value (e.g. a `searchParams` string) against the
 * `PayrollScope` union. Anything else — including garbage, arrays and empty
 * strings — resolves to `undefined`, i.e. "no narrowing", which is the safe
 * default. Never pass an unvalidated string into `PayrollFilters.scope`.
 */
export function parsePayrollScope(value: unknown): PayrollScope | undefined {
  return typeof value === 'string' && (PAYROLL_SCOPES as readonly string[]).includes(value)
    ? (value as PayrollScope)
    : undefined
}

/**
 * How the employees.id predicate should be applied for a given role + scope.
 * `unfiltered` = no predicate (admin, no scope). `empty` = the caller must
 * short-circuit to an empty result rather than emit an unbounded query or an
 * `IN ()` list, which is invalid MySQL.
 */
type EmployeeScopeResolution =
  | { kind: 'unfiltered' }
  | { kind: 'empty' }
  | { kind: 'equals'; id: number }
  | { kind: 'in'; ids: number[] }

export interface PayrollFilters {
  employeeId?: number
  vendorId?: number
  issueDate?: string
  agentId?: string
  startDate?: string
  endDate?: string
  status?: 'paid' | 'unpaid' | 'all'
  scope?: PayrollScope
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
  weekendDate: string | null
  totalSales: number
  totalOverrides: number
  totalExpenses: number
  totalAdvances: number
  netPay: number
  paystubCount: number
  isPaid: boolean
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
  advances: Array<{
    advance_id: number
    agentid: number
    vendor_id: number
    amount: number
    advance_date: string
    issue_date: string
    wkending: string
    method: string
    notes: string
  }>
  totals: {
    sales: number
    overrides: number
    expenses: number
    advances: number
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
    advanceCount: number
    paystubTotal: number
    invoiceTotal: number
    overrideTotal: number
    expenseTotal: number
    advanceTotal: number
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
    advances: number
    payroll: number
  }
  error?: string
}

/**
 * Repository for payroll-related data operations
 */
export class PayrollRepository {

  /**
   * Resolve the employees.id predicate for a list query from the user's role
   * and an optional `scope` narrowing.
   *
   * The role filter is resolved to its id set FIRST, then `scope` is applied as
   * an intersection against that set. This is what makes it impossible for any
   * `scope` value to widen access:
   *
   *   - no scope        → today's behaviour, unchanged (admin unfiltered,
   *                       manager `IN (self + reports)`, employee `= self`)
   *   - scope 'mine'    → base ∩ [employeeId]        (no employeeId ⇒ empty)
   *   - scope 'team'    → base ∩ managedEmployeeIds  (no reports  ⇒ empty)
   *
   * A non-manager passing `scope: 'team'` intersects their `[self]` base with
   * an empty managed list and gets `empty`, never their peers' rows. Admins are
   * narrowed too: their base is unbounded, so the intersection is the scope set
   * itself.
   */
  private resolveEmployeeScope(
    scope: PayrollScope | undefined,
    userContext: {
      isAdmin: boolean
      isManager: boolean
      employeeId?: number
      managedEmployeeIds?: number[]
    }
  ): EmployeeScopeResolution {
    // The id set the caller asked to narrow to. `null` = no narrowing requested.
    // Anything outside the union is treated as no narrowing (safe default).
    const scopeIds: number[] | null =
      scope === 'mine'
        ? (userContext.employeeId ? [userContext.employeeId] : [])
        : scope === 'team'
          ? [...new Set(userContext.managedEmployeeIds ?? [])]
          : null

    // Admins have an unbounded base set, so base ∩ scope === scope.
    if (userContext.isAdmin) {
      if (scopeIds === null) return { kind: 'unfiltered' }
      return scopeIds.length ? { kind: 'in', ids: scopeIds } : { kind: 'empty' }
    }

    // Managers see themselves AND their subordinates.
    const accessibleIds = accessibleEmployeeIds(userContext)

    if (userContext.isManager && accessibleIds.length) {
      if (scopeIds === null) return { kind: 'in', ids: accessibleIds }
      const narrowed = scopeIds.filter(id => accessibleIds.includes(id))
      return narrowed.length ? { kind: 'in', ids: narrowed } : { kind: 'empty' }
    }

    if (userContext.employeeId) {
      // Base is exactly [self]; the intersection is either [self] or nothing.
      if (scopeIds === null || scopeIds.includes(userContext.employeeId)) {
        return { kind: 'equals', id: userContext.employeeId }
      }
      return { kind: 'empty' }
    }

    // No access at all.
    return { kind: 'empty' }
  }

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

    // Non-admins may only see paystubs whose issue_date has been released.
    // Future-dated paystubs stay hidden until their release time arrives.
    const issueDateCutoff = await this.getEmployeeIssueDateCutoff(userContext)

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
        db.fn.max('paystubs.weekend_date').as('weekendDate'),
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

    // Apply role-based filtering, narrowed by `scope` where requested.
    // `scope` intersects the role-resolved id set — it can only remove rows.
    const employeeScope = this.resolveEmployeeScope(filters.scope, userContext)

    if (employeeScope.kind === 'empty') {
      // No access, or the scope intersects the accessible set to nothing.
      // Short-circuit rather than emitting an unbounded query or `IN ()`.
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

    if (employeeScope.kind === 'in') {
      query = query.where('employees.id', 'in', employeeScope.ids)
    } else if (employeeScope.kind === 'equals') {
      query = query.where('employees.id', '=', employeeScope.id)
    }

    // Hide unreleased (future-dated) paystubs from non-admins
    if (!userContext.isAdmin && issueDateCutoff) {
      query = query.where(db.fn('DATE', ['paystubs.issue_date']), '<=', issueDateCutoff)
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

    // Apply the same role-based filtering (and the same scope narrowing) to the
    // count query, so pagination never advertises rows the data query hides.
    if (employeeScope.kind === 'in') {
      countQuery = countQuery.where('employees.id', 'in', employeeScope.ids)
    } else if (employeeScope.kind === 'equals') {
      countQuery = countQuery.where('employees.id', '=', employeeScope.id)
    }

    // Hide unreleased (future-dated) paystubs from non-admins
    if (!userContext.isAdmin && issueDateCutoff) {
      countQuery = countQuery.where(db.fn('DATE', ['paystubs.issue_date']), '<=', issueDateCutoff)
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
    const advanceRepo = new AdvanceRepository()
    const [salesTotals, overridesTotals, expensesTotals, advancesTotals, paystubCounts, paidMap] = await Promise.all([
      this.getBatchSalesTotals(salesCombinations),
      this.getBatchOverridesTotals(salesCombinations),
      this.getBatchExpensesTotals(salesCombinations),
      advanceRepo.getBatchAdvancesTotals(salesCombinations),
      this.getBatchPaystubCounts(combinations),
      this.getBatchIsPaid(combinations)
    ])

    // Build summaries using the batched data
    const summaries: PayrollSummary[] = []

    for (const result of results) {
      if (!result.employeeId || !result.agentId) continue

      const key = `${result.agentId}-${result.vendorId}-${result.issueDate.toISOString().split('T')[0]}`

      const salesTotal = salesTotals.get(key) || 0
      const overridesTotal = overridesTotals.get(key) || 0
      const expensesTotal = expensesTotals.get(key) || 0
      const advancesTotal = advancesTotals.get(key) || 0
      const paystubCount = paystubCounts.get(key) || 0

      summaries.push({
        employeeId: result.employeeId,
        employeeName: result.employeeName || 'Unknown',
        agentId: result.agentId.toString(),
        vendorId: result.vendorId,
        vendorName: result.vendorName || 'Unknown',
        issueDate: result.issueDate.toISOString().split('T')[0],
        weekendDate: result.weekendDate
          ? new Date(result.weekendDate).toISOString().split('T')[0]
          : null,
        totalSales: salesTotal,
        totalOverrides: overridesTotal,
        totalExpenses: expensesTotal,
        totalAdvances: advancesTotal,
        netPay: parseFloat(result.netPay?.toString() || '0'),
        paystubCount,
        isPaid: paidMap.get(key) || false,
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

    // Non-admins cannot view a paystub whose issue_date has not been released
    // yet (e.g. before 8pm the day before payday).
    const issueDateCutoff = await this.getEmployeeIssueDateCutoff(userContext)
    if (issueDateCutoff && issueDate.slice(0, 10) > issueDateCutoff) {
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

    // Get advances (first-class daily-pay advances that settle against this statement)
    const advanceRepo = new AdvanceRepository()
    const advances = await advanceRepo.getAdvancesForStatement(agentIdForQueries, vendorId, issueDate)

    // Get paystub info
    const paystub = await db
      .selectFrom('paystubs')
      .select(['created_at', 'weekend_date'])
      .where('agent_id', '=', agentIdForQueries)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    // Resolve real paid state from the payroll table (keyed by pay_date == issue_date)
    const payrollRow = await db
      .selectFrom('payroll')
      .select('is_paid')
      .where('agent_id', '=', agentIdForQueries)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['pay_date']), '=', issueDate)
      .executeTakeFirst()
    const isPaid = Number(payrollRow?.is_paid ?? 0) === 1

    // Calculate totals
    const salesTotal = sales.reduce((sum, invoice) => sum + parseFloat(invoice.amount || '0'), 0)
    const overridesTotal = overrides.reduce((sum, override) => sum + parseFloat(override.total || '0'), 0)
    const expensesTotal = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0)
    const advancesTotal = advances.reduce((sum, advance) => sum + advance.amount, 0)

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

    // Fetch vendor field configuration (only if feature flag is enabled).
    // Use the non-privileged display read — anyone authorized to view this
    // paystub may read the vendor's field labels. getFieldsByVendor is admin-only
    // and would throw for the employee viewing their own paystub.
    let fieldConfig: Awaited<ReturnType<VendorFieldRepository['getActiveFieldsForDisplay']>> = []
    const flagEnabled = await isFeatureEnabled('vendor_custom_fields', {
      userId: String(userContext.employeeId ?? ''),
      isAdmin: userContext.isAdmin,
      isManager: userContext.isManager,
      isSubscriber: false,
      subscriberId: null,
    })
    if (flagEnabled) {
      const vendorFieldRepo = new VendorFieldRepository()
      fieldConfig = await vendorFieldRepo.getActiveFieldsForDisplay(vendorId)
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
      advances,
      totals: {
        sales: salesTotal,
        overrides: overridesTotal,
        expenses: expensesTotal,
        advances: advancesTotal,
        netPay: salesTotal + overridesTotal + expensesTotal - advancesTotal
      },
      isPaid,
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
   * Get available issue dates for role-based access.
   *
   * NOTE: `PayrollFilters.scope` is deliberately NOT applied here. The issue
   * dates populate the filter dropdown, which should keep offering every date
   * the user can reach regardless of which scope tab is active.
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
      // Managers see themselves AND their subordinates
      const accessibleIds = accessibleEmployeeIds(userContext)

      if (userContext.isManager && accessibleIds.length) {
        query = query.where('employees.id', 'in', accessibleIds)
      } else if (userContext.employeeId) {
        query = query.where('employees.id', '=', userContext.employeeId)
      } else {
        return []
      }

      // Hide unreleased (future-dated) paystubs from non-admins
      const issueDateCutoff = await this.getEmployeeIssueDateCutoff(userContext)
      if (issueDateCutoff) {
        query = query.where(db.fn('DATE', ['paystubs.issue_date']), '<=', issueDateCutoff)
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

    if (!payrollRecord) {
      return {
        canDelete: false,
        isPaid: false,
        reason: 'No pay statement found for the specified employee, vendor, and date.',
      }
    }

    if (payrollRecord.is_paid === 1) {
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

    // Count and total advances
    const advances = await db
      .selectFrom('advances')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    const paystubTotal = paystubs.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0)
    const invoiceTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount?.toString() || '0'), 0)
    const overrideTotal = overrides.reduce((sum, o) => sum + parseFloat(o.total?.toString() || '0'), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0)
    const advanceTotal = advances.reduce((sum, a) => sum + parseFloat(a.amount?.toString() || '0'), 0)

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
        advanceCount: advances.length,
        paystubTotal,
        invoiceTotal,
        overrideTotal,
        expenseTotal,
        advanceTotal,
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

      if (!payrollRecord) {
        return {
          success: false,
          deleted: { paystubs: 0, invoices: 0, overrides: 0, expenses: 0, advances: 0, payroll: 0 },
          error: 'No pay statement found for the specified employee, vendor, and date.',
        }
      }

      if (payrollRecord.is_paid === 1) {
        return {
          success: false,
          deleted: { paystubs: 0, invoices: 0, overrides: 0, expenses: 0, advances: 0, payroll: 0 },
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

      const advances = await trx
        .selectFrom('advances')
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
      const advanceTotal = advances.reduce((sum, a) => sum + parseFloat(a.amount?.toString() || '0'), 0)

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
          deleted_advances_count: advances.length,
          paystub_total: paystubTotal,
          invoices_total: invoiceTotal,
          overrides_total: overrideTotal,
          expenses_total: expenseTotal,
          advances_total: advanceTotal,
          paystub_data: JSON.stringify(paystubs),
          payroll_data: JSON.stringify(payrollRecord ? [payrollRecord] : []),
          invoices_data: JSON.stringify(invoices),
          overrides_data: JSON.stringify(overrides),
          expenses_data: JSON.stringify(expenses),
          advances_data: JSON.stringify(advances),
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

      // Drop recurring-template application links for this statement so template
      // history reflects the deletion (the whole statement week is being removed).
      await trx
        .deleteFrom('scheduled_expense_applications')
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(db.fn('DATE', ['issue_date']), '=', issueDate)
        .execute()

      await trx
        .deleteFrom('advances')
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
          paystubs: Number(paystubResult[0]?.numAffectedRows ?? 0n),
          invoices: Number(invoiceResult[0]?.numAffectedRows ?? 0n),
          overrides: Number(overrideResult[0]?.numAffectedRows ?? 0n),
          expenses: Number(expenseResult[0]?.numAffectedRows ?? 0n),
          advances: advances.length,
          payroll: Number(payrollResult[0]?.numAffectedRows ?? 0n),
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

  /**
   * Batch-resolve payroll.is_paid for each (agent_id, vendor_id, issue_date→pay_date)
   * combination. Keyed `${agentId}-${vendorId}-${issueDate}`. Missing/0 => false.
   */
  private async getBatchIsPaid(
    combinations: Array<{ agentId: string; vendorId: number; issueDate: string }>
  ): Promise<Map<string, boolean>> {
    const paidMap = new Map<string, boolean>()

    if (combinations.length === 0) return paidMap

    const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
    const vendorIds = [...new Set(combinations.map(c => c.vendorId))]
    const issueDates = [...new Set(combinations.map(c => c.issueDate))]

    if (agentIds.length === 0 || vendorIds.length === 0 || issueDates.length === 0) return paidMap

    const results = await db
      .selectFrom('payroll')
      .select([
        'agent_id',
        'vendor_id',
        'pay_date',
        db.fn.max('is_paid').as('is_paid')
      ])
      .where('agent_id', 'in', agentIds)
      .where('vendor_id', 'in', vendorIds)
      .where(db.fn('DATE', ['pay_date']), 'in', issueDates)
      .groupBy(['agent_id', 'vendor_id', 'pay_date'])
      .execute()

    for (const result of results) {
      const payDate = result.pay_date.toISOString().split('T')[0]
      const key = `${result.agent_id}-${result.vendor_id}-${payDate}`
      paidMap.set(key, Number(result.is_paid || 0) === 1)
    }

    return paidMap
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

  /**
   * Compute the latest paystub issue_date (inclusive, YYYY-MM-DD) that a
   * non-admin user is currently allowed to see, based on the configured
   * payroll release time. Used to hide future-dated paystubs that have been
   * generated but not yet released (e.g. before 8pm the day before payday).
   *
   * Returns `null` for admins, who are never restricted.
   */
  private async getEmployeeIssueDateCutoff(userContext: {
    isAdmin: boolean
  }): Promise<string | null> {
    if (userContext.isAdmin) return null

    let release = { hour: DEFAULT_RELEASE_HOUR, minute: DEFAULT_RELEASE_MINUTE }
    try {
      const restriction = await db
        .selectFrom('payroll_restriction')
        .select(['hour', 'minute'])
        .where('id', '=', 1)
        .executeTakeFirst()

      if (restriction) {
        release = { hour: restriction.hour, minute: restriction.minute }
      }
    } catch (error) {
      // Fall back to the secure default (8pm) rather than exposing paystubs.
      logger.warn('Failed to load payroll_restriction, using default release time', error)
    }

    return getEmployeeVisibilityCutoff(release)
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
