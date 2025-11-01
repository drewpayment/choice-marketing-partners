import { db } from '@/lib/database/client'
import dayjs from 'dayjs'

/**
 * Search filters for invoice audit investigation
 */
export interface InvoiceAuditSearchFilters {
  // Invoice identification
  invoiceId?: number
  
  // Agent/Employee filters
  agentId?: number
  agentIds?: number[]
  
  // Vendor filters
  vendor?: string
  vendorId?: number
  
  // Date range filters
  saleDateFrom?: string // MM-DD-YYYY format
  saleDateTo?: string   // MM-DD-YYYY format
  issueDateFrom?: string // MM-DD-YYYY format
  issueDateTo?: string   // MM-DD-YYYY format
  wkendingFrom?: string  // MM-DD-YYYY format
  wkendingTo?: string    // MM-DD-YYYY format
  changedDateFrom?: string // MM-DD-YYYY format
  changedDateTo?: string   // MM-DD-YYYY format
  
  // Customer information
  customerName?: string  // Search first_name + last_name
  city?: string
  address?: string
  
  // Amount filters
  amountFrom?: number
  amountTo?: number
  amountChanged?: boolean // Only show records where amount changed
  
  // Status filters
  status?: string
  statusChanged?: boolean // Only show records where status changed
  
  // Change information
  changedBy?: number
  actionType?: 'UPDATE' | 'DELETE'
  
  // Pagination
  page?: number
  limit?: number
}

/**
 * Audit record with enhanced information for investigation
 */
export interface InvoiceAuditRecord {
  // Base audit fields with proper typing
  id: number
  invoice_id: number
  action_type: 'UPDATE' | 'DELETE'
  changed_by: number
  changed_at: Date
  
  // Previous state
  previous_vendor: string | null
  previous_sale_date: Date | null
  previous_first_name: string | null
  previous_last_name: string | null
  previous_address: string | null
  previous_city: string | null
  previous_status: string | null
  previous_amount: number | null
  previous_agentid: number | null
  previous_issue_date: Date | null
  previous_wkending: Date | null
  
  // Current state
  current_vendor: string | null
  current_sale_date: Date | null
  current_first_name: string | null
  current_last_name: string | null
  current_address: string | null
  current_city: string | null
  current_status: string | null
  current_amount: number | null
  current_agentid: number | null
  current_issue_date: Date | null
  current_wkending: Date | null
  
  change_reason: string | null
  ip_address: string | null
  
  // Enhanced metadata
  changed_by_name?: string
  days_since_sale?: number
  days_since_issue?: number
  
  // Field change indicators
  changes: {
    vendor?: { from: string | null; to: string | null }
    sale_date?: { from: string | null; to: string | null }
    first_name?: { from: string | null; to: string | null }
    last_name?: { from: string | null; to: string | null }
    address?: { from: string | null; to: string | null }
    city?: { from: string | null; to: string | null }
    status?: { from: string | null; to: string | null }
    amount?: { from: number | null; to: number | null }
    agentid?: { from: number | null; to: number | null }
    issue_date?: { from: string | null; to: string | null }
    wkending?: { from: string | null; to: string | null }
  }
}

/**
 * Search results with pagination
 */
export interface InvoiceAuditSearchResult {
  records: InvoiceAuditRecord[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Summary statistics for audit investigation
 */
export interface InvoiceAuditSummary {
  totalChanges: number
  statusChanges: number
  amountChanges: number
  recentChanges: number // Changes in last 30 days
  topChangedStatuses: Array<{ status: string; count: number }>
  topChangingUsers: Array<{ userId: number; userName: string; changeCount: number }>
}

export class InvoiceAuditRepository {
  /**
   * Create audit record when invoice is updated
   */
  async createAuditRecord(
    invoiceId: number,
    actionType: 'UPDATE' | 'DELETE',
    previousData: Partial<{
      vendor: string
      sale_date: Date | string
      first_name: string
      last_name: string
      address: string
      city: string
      status: string
      amount: number | string
      agentid: number
      issue_date: Date | string
      wkending: Date | string
    }>,
    currentData: Partial<{
      vendor: string
      sale_date: Date | string
      first_name: string
      last_name: string
      address: string
      city: string
      status: string
      amount: number | string
      agentid: number
      issue_date: Date | string
      wkending: Date | string
    }> | null,
    changedBy: number,
    changeReason?: string,
    ipAddress?: string
  ): Promise<number> {
    const auditData = {
      invoice_id: invoiceId,
      action_type: actionType,
      changed_by: changedBy,
      changed_at: new Date(),
      
      // Previous state
      previous_vendor: previousData?.vendor || null,
      previous_sale_date: previousData?.sale_date ? dayjs(previousData.sale_date).toDate() : null,
      previous_first_name: previousData?.first_name || null,
      previous_last_name: previousData?.last_name || null,
      previous_address: previousData?.address || null,
      previous_city: previousData?.city || null,
      previous_status: previousData?.status || null,
      previous_amount: previousData?.amount?.toString() || null,
      previous_agentid: previousData?.agentid || null,
      previous_issue_date: previousData?.issue_date ? dayjs(previousData.issue_date).toDate() : null,
      previous_wkending: previousData?.wkending ? dayjs(previousData.wkending).toDate() : null,
      
      // Current state (null for DELETE)
      current_vendor: currentData?.vendor || null,
      current_sale_date: currentData?.sale_date ? dayjs(currentData.sale_date).toDate() : null,
      current_first_name: currentData?.first_name || null,
      current_last_name: currentData?.last_name || null,
      current_address: currentData?.address || null,
      current_city: currentData?.city || null,
      current_status: currentData?.status || null,
      current_amount: currentData?.amount?.toString() || null,
      current_agentid: currentData?.agentid || null,
      current_issue_date: currentData?.issue_date ? dayjs(currentData.issue_date).toDate() : null,
      current_wkending: currentData?.wkending ? dayjs(currentData.wkending).toDate() : null,
      
      change_reason: changeReason || null,
      ip_address: ipAddress || null
    }

    const result = await db
      .insertInto('invoice_audit')
      .values(auditData)
      .executeTakeFirst()

    return Number(result.insertId)
  }

  /**
   * Search audit records with comprehensive filtering
   */
  async searchAuditRecords(filters: InvoiceAuditSearchFilters): Promise<InvoiceAuditSearchResult> {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const offset = (page - 1) * limit

    let query = db
      .selectFrom('invoice_audit as ia')
      .leftJoin('employees as e', 'ia.changed_by', 'e.id')
      .select([
        'ia.id',
        'ia.invoice_id',
        'ia.action_type',
        'ia.changed_by',
        'ia.changed_at',
        'ia.previous_vendor',
        'ia.previous_sale_date',
        'ia.previous_first_name',
        'ia.previous_last_name',
        'ia.previous_address',
        'ia.previous_city',
        'ia.previous_status',
        'ia.previous_amount',
        'ia.previous_agentid',
        'ia.previous_issue_date',
        'ia.previous_wkending',
        'ia.current_vendor',
        'ia.current_sale_date',
        'ia.current_first_name',
        'ia.current_last_name',
        'ia.current_address',
        'ia.current_city',
        'ia.current_status',
        'ia.current_amount',
        'ia.current_agentid',
        'ia.current_issue_date',
        'ia.current_wkending',
        'ia.change_reason',
        'ia.ip_address',
        'e.name as changed_by_name'
      ])

    // Apply filters
    if (filters.invoiceId) {
      query = query.where('ia.invoice_id', '=', filters.invoiceId)
    }

    if (filters.agentId) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_agentid', '=', filters.agentId!),
          eb('ia.current_agentid', '=', filters.agentId!)
        ])
      )
    }

    if (filters.agentIds && filters.agentIds.length > 0) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_agentid', 'in', filters.agentIds!),
          eb('ia.current_agentid', 'in', filters.agentIds!)
        ])
      )
    }

    if (filters.vendor) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_vendor', '=', filters.vendor!),
          eb('ia.current_vendor', '=', filters.vendor!)
        ])
      )
    }

    if (filters.customerName) {
      const nameSearch = `%${filters.customerName}%`
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_first_name', 'like', nameSearch),
          eb('ia.previous_last_name', 'like', nameSearch),
          eb('ia.current_first_name', 'like', nameSearch),
          eb('ia.current_last_name', 'like', nameSearch)
        ])
      )
    }

    if (filters.city) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_city', 'like', `%${filters.city}%`),
          eb('ia.current_city', 'like', `%${filters.city}%`)
        ])
      )
    }

    if (filters.status) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_status', '=', filters.status!),
          eb('ia.current_status', '=', filters.status!)
        ])
      )
    }

    // Date range filters
    if (filters.saleDateFrom) {
      const fromDate = dayjs(filters.saleDateFrom, 'MM-DD-YYYY').format('YYYY-MM-DD')
      query = query.where(({ or, eb }) => 
        or([
          eb(eb.fn('DATE', ['ia.previous_sale_date']), '>=', fromDate),
          eb(eb.fn('DATE', ['ia.current_sale_date']), '>=', fromDate)
        ])
      )
    }

    if (filters.saleDateTo) {
      const toDate = dayjs(filters.saleDateTo, 'MM-DD-YYYY').format('YYYY-MM-DD')
      query = query.where(({ or, eb }) => 
        or([
          eb(eb.fn('DATE', ['ia.previous_sale_date']), '<=', toDate),
          eb(eb.fn('DATE', ['ia.current_sale_date']), '<=', toDate)
        ])
      )
    }

    if (filters.changedDateFrom) {
      const fromDate = dayjs(filters.changedDateFrom, 'MM-DD-YYYY').format('YYYY-MM-DD')
      query = query.where(({ eb }) => eb(eb.fn('DATE', ['ia.changed_at']), '>=', fromDate))
    }

    if (filters.changedDateTo) {
      const toDate = dayjs(filters.changedDateTo, 'MM-DD-YYYY').format('YYYY-MM-DD')
      query = query.where(({ eb }) => eb(eb.fn('DATE', ['ia.changed_at']), '<=', toDate))
    }

    // Amount filters
    if (filters.amountFrom !== undefined) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_amount', '>=', filters.amountFrom!.toString()),
          eb('ia.current_amount', '>=', filters.amountFrom!.toString())
        ])
      )
    }

    if (filters.amountTo !== undefined) {
      query = query.where(({ or, eb }) => 
        or([
          eb('ia.previous_amount', '<=', filters.amountTo!.toString()),
          eb('ia.current_amount', '<=', filters.amountTo!.toString())
        ])
      )
    }

    // Show only records where specific fields changed
    if (filters.statusChanged) {
      query = query.where(({ eb }) => 
        eb('ia.previous_status', '!=', eb.ref('ia.current_status'))
      )
    }

    if (filters.amountChanged) {
      query = query.where(({ eb }) => 
        eb('ia.previous_amount', '!=', eb.ref('ia.current_amount'))
      )
    }

    if (filters.changedBy) {
      query = query.where('ia.changed_by', '=', filters.changedBy)
    }

    if (filters.actionType) {
      query = query.where('ia.action_type', '=', filters.actionType)
    }

    // Get total count for pagination
    const countQuery = query.clearSelect().select(({ fn }) => fn.count<number>('ia.id').as('count'))
    const countResult = await countQuery.executeTakeFirst()
    const totalCount = countResult?.count || 0

    // Execute main query with pagination
    const results = await query
      .orderBy('ia.changed_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    // Transform results to include change analysis
    const records: InvoiceAuditRecord[] = results.map(record => {
      const changes: InvoiceAuditRecord['changes'] = {}

      // Detect field changes
      if (record.previous_vendor !== record.current_vendor) {
        changes.vendor = { from: record.previous_vendor, to: record.current_vendor }
      }
      if (record.previous_sale_date !== record.current_sale_date) {
        changes.sale_date = { 
          from: record.previous_sale_date ? dayjs(record.previous_sale_date).format('MM-DD-YYYY') : null,
          to: record.current_sale_date ? dayjs(record.current_sale_date).format('MM-DD-YYYY') : null
        }
      }
      if (record.previous_first_name !== record.current_first_name) {
        changes.first_name = { from: record.previous_first_name, to: record.current_first_name }
      }
      if (record.previous_last_name !== record.current_last_name) {
        changes.last_name = { from: record.previous_last_name, to: record.current_last_name }
      }
      if (record.previous_address !== record.current_address) {
        changes.address = { from: record.previous_address, to: record.current_address }
      }
      if (record.previous_city !== record.current_city) {
        changes.city = { from: record.previous_city, to: record.current_city }
      }
      if (record.previous_status !== record.current_status) {
        changes.status = { from: record.previous_status, to: record.current_status }
      }
      if (record.previous_amount !== record.current_amount) {
        changes.amount = { 
          from: record.previous_amount ? parseFloat(record.previous_amount) : null,
          to: record.current_amount ? parseFloat(record.current_amount) : null
        }
      }
      if (record.previous_agentid !== record.current_agentid) {
        changes.agentid = { from: record.previous_agentid, to: record.current_agentid }
      }
      if (record.previous_issue_date !== record.current_issue_date) {
        changes.issue_date = { 
          from: record.previous_issue_date ? dayjs(record.previous_issue_date).format('MM-DD-YYYY') : null,
          to: record.current_issue_date ? dayjs(record.current_issue_date).format('MM-DD-YYYY') : null
        }
      }
      if (record.previous_wkending !== record.current_wkending) {
        changes.wkending = { 
          from: record.previous_wkending ? dayjs(record.previous_wkending).format('MM-DD-YYYY') : null,
          to: record.current_wkending ? dayjs(record.current_wkending).format('MM-DD-YYYY') : null
        }
      }

      // Calculate days since events for investigation context
      const saleDate = record.current_sale_date || record.previous_sale_date
      const issueDate = record.current_issue_date || record.previous_issue_date
      const days_since_sale = saleDate ? dayjs().diff(dayjs(saleDate), 'day') : undefined
      const days_since_issue = issueDate ? dayjs().diff(dayjs(issueDate), 'day') : undefined

      return {
        ...record,
        previous_amount: record.previous_amount ? parseFloat(record.previous_amount) : null,
        current_amount: record.current_amount ? parseFloat(record.current_amount) : null,
        changed_by_name: record.changed_by_name || undefined,
        days_since_sale,
        days_since_issue,
        changes
      }
    })

    return {
      records,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    }
  }

  /**
   * Get audit history for a specific invoice
   */
  async getInvoiceAuditHistory(invoiceId: number): Promise<InvoiceAuditRecord[]> {
    const results = await this.searchAuditRecords({ 
      invoiceId, 
      limit: 1000 // Get all history for this invoice
    })
    
    return results.records
  }

  /**
   * Get audit summary statistics for investigation dashboard
   */
  async getAuditSummary(agentIds?: number[], dateFrom?: string, dateTo?: string): Promise<InvoiceAuditSummary> {
    let baseQuery = db.selectFrom('invoice_audit as ia')

    // Apply agent filter if provided
    if (agentIds && agentIds.length > 0) {
      baseQuery = baseQuery.where(({ or, eb }) => 
        or([
          eb('ia.previous_agentid', 'in', agentIds),
          eb('ia.current_agentid', 'in', agentIds)
        ])
      )
    }

    // Apply date filter if provided
    if (dateFrom) {
      const fromDate = dayjs(dateFrom, 'MM-DD-YYYY').format('YYYY-MM-DD')
      baseQuery = baseQuery.where(({ eb }) => eb.fn('DATE', ['ia.changed_at']), '>=', fromDate)
    }

    if (dateTo) {
      const toDate = dayjs(dateTo, 'MM-DD-YYYY').format('YYYY-MM-DD')
      baseQuery = baseQuery.where(({ eb }) => eb.fn('DATE', ['ia.changed_at']), '<=', toDate)
    }

    // Get total changes
    const totalChanges = await baseQuery
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst()

    // Get status changes
    const statusChanges = await baseQuery
      .where(({ eb }) => eb('previous_status', '!=', eb.ref('current_status')))
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst()

    // Get amount changes
    const amountChanges = await baseQuery
      .where(({ eb }) => eb('previous_amount', '!=', eb.ref('current_amount')))
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst()

    // Get recent changes (last 30 days)
    const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
    const recentChanges = await baseQuery
      .where(({ eb }) => eb.fn('DATE', ['changed_at']), '>=', thirtyDaysAgo)
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst()

    // Get top changed statuses
    const topChangedStatuses = await baseQuery
      .where(({ eb }) => eb('previous_status', '!=', eb.ref('current_status')))
      .select(['current_status as status', ({ fn }) => fn.count<number>('id').as('count')])
      .groupBy('current_status')
      .orderBy('count', 'desc')
      .limit(10)
      .execute()

    // Get top changing users
    const topChangingUsers = await baseQuery
      .leftJoin('employees as e', 'ia.changed_by', 'e.id')
      .select(['ia.changed_by as userId', 'e.name as userName', ({ fn }) => fn.count<number>('ia.id').as('changeCount')])
      .groupBy(['ia.changed_by', 'e.name'])
      .orderBy('changeCount', 'desc')
      .limit(10)
      .execute()

    return {
      totalChanges: totalChanges?.count || 0,
      statusChanges: statusChanges?.count || 0,
      amountChanges: amountChanges?.count || 0,
      recentChanges: recentChanges?.count || 0,
      topChangedStatuses: topChangedStatuses.map(s => ({ 
        status: s.status || 'Unknown', 
        count: s.count 
      })),
      topChangingUsers: topChangingUsers.map(u => ({
        userId: u.userId,
        userName: u.userName || 'Unknown User',
        changeCount: u.changeCount
      }))
    }
  }

  /**
   * Check if invoice has any audit history (for UI indicators)
   */
  async hasAuditHistory(invoiceId: number): Promise<boolean> {
    const result = await db
      .selectFrom('invoice_audit')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .where('invoice_id', '=', invoiceId)
      .executeTakeFirst()

    return (result?.count || 0) > 0
  }

  /**
   * Get recent audit activity for dashboard
   */
  async getRecentAuditActivity(agentIds?: number[], limit: number = 20): Promise<InvoiceAuditRecord[]> {
    const results = await this.searchAuditRecords({
      agentIds,
      limit,
      page: 1
    })

    return results.records
  }
}

export const invoiceAuditRepository = new InvoiceAuditRepository()