import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { logger } from '@/lib/utils/logger'
import type {
  Sale as Invoice,
  Override,
  Expense,
  InvoiceSaveRequest,
  PayStatementDetailResponse as InvoiceSaveResult
} from '@/types/database'

/**
 * Convert MM-DD-YYYY date format to YYYY-MM-DD for database
 */
function formatDateForDB(dateString: string): string {
  if (dateString.includes('-') && dateString.length === 10) {
    const parts = dateString.split('-')
    if (parts.length === 3 && parts[0].length === 2) {
      // MM-DD-YYYY format
      return `${parts[2]}-${parts[0]}-${parts[1]}`
    }
    // Already in YYYY-MM-DD format
    return dateString
  }
  
  // Try parsing with dayjs
  const parsed = dayjs(dateString)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : dateString
}

// Types for invoice management
export interface Invoice {
  invoice_id: number
  vendor: string
  sale_date: string
  first_name: string
  last_name: string
  address: string
  city: string
  status: string
  amount: number
  agentid: number
  issue_date: string
  wkending: string
  created_at?: Date
  updated_at?: Date
}

export interface Override {
  ovrid: number
  vendor_id: number
  name: string
  sales: number
  commission: number
  total: number
  agentid: number
  issue_date: string
  wkending: string
  created_at?: Date
  updated_at?: Date
}

export interface Expense {
  expid: number
  vendor_id: number
  type: string
  amount: number
  notes: string
  agentid: number
  issue_date: string
  wkending: string
  created_at?: Date
  updated_at?: Date
}

export interface InvoicePageResources {
  agents: Array<{
    id: number
    name: string
    sales_id1?: string
  }>
  vendors: Array<{
    id: number
    name: string
  }>
  issueDates: string[] // Array of formatted dates (MM-DD-YYYY)
}

export interface InvoiceSearchParams {
  agentId?: number
  vendorId?: number
  issueDate?: string
}

export interface InvoiceDetail {
  invoices: Invoice[]
  overrides: Override[]
  expenses: Expense[]
  employee: {
    id: number
    name: string
    sales_id1?: string
  }
  vendor: {
    id: number
    name: string
  }
  issueDate: string
  weekending: string
}

export interface InvoiceSaveRequest {
  agentId: number
  vendorId: number
  issueDate: string
  weekending: string
  changedBy?: number // User ID who made the changes (for audit)
  changeReason?: string // Optional reason for the change
  ipAddress?: string // IP address for audit trail
  sales: Array<{
    invoiceId?: number
    saleDate: string
    firstName: string
    lastName: string
    address: string
    city: string
    status: string
    amount: number
  }>
  overrides: Array<{
    overrideId?: number
    name: string
    sales: number
    commission: number
    total: number
  }>
  expenses: Array<{
    expenseId?: number
    type: string
    amount: number
    notes: string
  }>
  pendingDeletes?: {
    sales?: number[]
    overrides?: number[]
    expenses?: number[]
  }
}

export interface InvoiceSaveResult {
  sales: Invoice[]
  overrides: Override[]
  expenses: Expense[]
  payroll: {
    id: number
    agent_id: number
    agent_name: string
    amount: number
    vendor_id: number
    pay_date: string
    is_paid: boolean
  }
}

export class InvoiceRepository {
  /**
   * Get resources needed for invoice page (agents, vendors, upcoming issue dates)
   */
  async getInvoicePageResources(): Promise<InvoicePageResources> {
    // Get active employees
    const agents = await db
      .selectFrom('employees')
      .select(['id', 'name', 'sales_id1'])
      .where('is_active', '=', 1)
      .where('hidden_payroll', '=', 0)
      .orderBy('name', 'asc')
      .execute()

    // Get active vendors
    const vendors = await db
      .selectFrom('vendors')
      .select(['id', 'name'])
      .where('is_active', '=', 1)
      .orderBy('name', 'asc')
      .execute()

    // Generate next 6 Wednesdays
    const issueDates = []
    for (let i = 0; i < 6; i++) {
      const wednesday = dayjs().day(3).add(i, 'week') // 3 = Wednesday
      issueDates.push(wednesday.format('MM-DD-YYYY'))
    }

    return {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        sales_id1: agent.sales_id1 || undefined
      })),
      vendors: vendors.map(vendor => ({
        id: vendor.id,
        name: vendor.name
      })),
      issueDates
    }
  }

  /**
   * Get invoice detail for editing
   */
  async getInvoiceDetail(agentId: number, vendorId: number, issueDate: string): Promise<InvoiceDetail | null> {
    logger.log('🔍 Repository - getInvoiceDetail called with:', { agentId, vendorId, issueDate })
    
    agentId = Number(agentId);
    issueDate = dayjs(issueDate, 'MM-DD-YYYY').format('YYYY-MM-DD');

    // Get invoices using MySQL date function to handle the date comparison
    let invoices = await db
      .selectFrom('invoices')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor', '=', `${vendorId}`)
      .where(({ eb }) => eb.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    logger.log('💾 Repository - Found invoices:', invoices.length)

    if (invoices.length === 0) {
      invoices = [{
        invoice_id: 0,
        vendor: `${vendorId}`,
        sale_date: new Date(),
        first_name: '',
        last_name: '',
        address: '',
        city: '',
        status: '',
        amount: `${0}`,
        agentid: agentId,
        issue_date: new Date(),
        wkending: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }]
    }

    // Get overrides using MySQL date function
    const overrides = await db
      .selectFrom('overrides')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(({ eb }) => eb.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Get expenses using MySQL date function
    const expenses = await db
      .selectFrom('expenses')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(({ eb }) => eb.fn('DATE', ['issue_date']), '=', issueDate)
      .execute()

    // Get employee info
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'name', 'sales_id1'])
      .where('id', '=', agentId)
      .executeTakeFirst()

    // Get vendor info
    const vendor = await db
      .selectFrom('vendors')
      .select(['id', 'name'])
      .where('id', '=', vendorId)
      .executeTakeFirst()

    // Get paystub info to get the weekending date from paystubs table
    const paystub = await db
      .selectFrom('paystubs')
      .select(['weekend_date'])
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(({ eb }) => eb.fn('DATE', ['issue_date']), '=', issueDate)
      .executeTakeFirst()

    if (!employee || !vendor) {
      return null
    }

    // Use weekending from paystubs table if available, otherwise fallback to invoice wkending
    const weekendingDate = paystub?.weekend_date 
      ? dayjs(paystub.weekend_date).format('MM-DD-YYYY')
      : (invoices[0] ? dayjs(invoices[0].wkending).format('MM-DD-YYYY') : '')

    return {
      invoices: invoices.map(inv => ({
        invoice_id: inv.invoice_id,
        vendor: inv.vendor,
        sale_date: dayjs(inv.sale_date).format('MM-DD-YYYY'),
        first_name: inv.first_name,
        last_name: inv.last_name,
        address: inv.address,
        city: inv.city,
        status: inv.status,
        amount: parseFloat(inv.amount),
        agentid: inv.agentid,
        issue_date: dayjs(inv.issue_date).format('YYYY-MM-DD'),
        wkending: dayjs(inv.wkending).format('YYYY-MM-DD'),
        created_at: inv.created_at || undefined,
        updated_at: inv.updated_at || undefined
      })),
      overrides: overrides.map(ovr => ({
        ovrid: ovr.ovrid,
        vendor_id: ovr.vendor_id,
        name: ovr.name,
        sales: ovr.sales,
        commission: parseFloat(ovr.commission.toString()),
        total: parseFloat(ovr.total.toString()),
        agentid: ovr.agentid,
        issue_date: dayjs(ovr.issue_date).format('YYYY-MM-DD'),
        wkending: dayjs(ovr.wkending).format('YYYY-MM-DD'),
        created_at: ovr.created_at || undefined,
        updated_at: ovr.updated_at || undefined
      })),
      expenses: expenses.map(exp => ({
        expid: exp.expid,
        vendor_id: exp.vendor_id,
        type: exp.type,
        amount: parseFloat(exp.amount.toString()),
        notes: exp.notes,
        agentid: exp.agentid,
        issue_date: dayjs(exp.issue_date).format('YYYY-MM-DD'),
        wkending: dayjs(exp.wkending).format('YYYY-MM-DD'),
        created_at: exp.created_at || undefined,
        updated_at: exp.updated_at || undefined
      })),
      employee: {
        id: employee.id,
        name: employee.name,
        sales_id1: employee.sales_id1 || undefined
      },
      vendor: {
        id: vendor.id,
        name: vendor.name
      },
      issueDate: dayjs(invoices[0].issue_date).format('MM-DD-YYYY'),
      weekending: weekendingDate
    }
  }

  /**
   * Save invoice data (simplified version for testing)
   */
  async saveInvoiceData(request: InvoiceSaveRequest): Promise<InvoiceSaveResult> {
    logger.log('🚀 Starting simplified saveInvoiceData')
    logger.log('📝 Request data:', {
      agentId: request.agentId,
      vendorId: request.vendorId,
      salesCount: request.sales.length,
      overridesCount: request.overrides.length,
      expensesCount: request.expenses.length
    })

    const formattedIssueDate = formatDateForDB(request.issueDate)
    const formattedWeekending = formatDateForDB(request.weekending)
    const now = new Date()

    try {
      // Process sales records one by one (no transaction for now)
      const savedSales: Invoice[] = []
      
      for (const sale of request.sales) {
        logger.log('� Processing sale:', {
          invoiceId: sale.invoiceId,
          firstName: sale.firstName,
          lastName: sale.lastName,
          amount: sale.amount
        })

        const saleData = {
          vendor: request.vendorId.toString(),
          sale_date: dayjs(sale.saleDate, 'MM-DD-YYYY').toDate(),
          first_name: sale.firstName,
          last_name: sale.lastName,
          address: sale.address,
          city: sale.city,
          status: sale.status,
          amount: sale.amount.toString(),
          agentid: request.agentId,
          issue_date: dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate(),
          wkending: dayjs(formattedWeekending, 'YYYY-MM-DD').toDate(),
          updated_at: now,
          custom_fields: sale.custom_fields ? JSON.stringify(sale.custom_fields) : null,
        }

        if (sale.invoiceId && sale.invoiceId > 0) {
          logger.log('🔄 Updating existing invoice:', sale.invoiceId)
          
          // Simple update without transaction
          await db
            .updateTable('invoices')
            .set(saleData)
            .where('invoice_id', '=', sale.invoiceId)
            .execute()
            
          logger.log('✅ Updated invoice:', sale.invoiceId)
          
          savedSales.push({
            invoice_id: sale.invoiceId,
            vendor: saleData.vendor,
            sale_date: dayjs(saleData.sale_date).format('YYYY-MM-DD'),
            first_name: saleData.first_name,
            last_name: saleData.last_name,
            address: saleData.address,
            city: saleData.city,
            status: saleData.status,
            amount: sale.amount,
            agentid: saleData.agentid,
            issue_date: dayjs(saleData.issue_date).format('YYYY-MM-DD'),
            wkending: dayjs(saleData.wkending).format('YYYY-MM-DD')
          })
        } else {
          logger.log('➕ Creating new invoice')
          
          // Simple insert without transaction
          const result = await db
            .insertInto('invoices')
            .values({
              ...saleData,
              created_at: now
            })
            .executeTakeFirst()

          const newInvoiceId = Number(result.insertId)
          logger.log('✅ Created new invoice:', newInvoiceId)

          savedSales.push({
            invoice_id: newInvoiceId,
            vendor: saleData.vendor,
            sale_date: dayjs(saleData.sale_date).format('YYYY-MM-DD'),
            first_name: saleData.first_name,
            last_name: saleData.last_name,
            address: saleData.address,
            city: saleData.city,
            status: saleData.status,
            amount: sale.amount,
            agentid: saleData.agentid,
            issue_date: dayjs(saleData.issue_date).format('YYYY-MM-DD'),
            wkending: dayjs(saleData.wkending).format('YYYY-MM-DD')
          })
        }
      }

      logger.log('✅ All sales processed successfully')

      // Return simplified result
      return {
        sales: savedSales,
        overrides: [], // Skip for now
        expenses: [],  // Skip for now
        payroll: {
          id: 0,
          agent_id: request.agentId,
          agent_name: 'Test Agent',
          amount: savedSales.reduce((sum, sale) => sum + sale.amount, 0),
          vendor_id: request.vendorId,
          pay_date: request.issueDate,
          is_paid: false
        }
      }
    } catch (error) {
      logger.error('❌ Error in simplified saveInvoiceData:', error)
      throw error
    }
  }

  /**
   * Delete single invoice with audit trail
   */
  async deleteInvoice(invoiceId: number, deletedBy?: number, reason?: string, ipAddress?: string): Promise<boolean> {
    return await db.transaction().execute(async (trx) => {
      // Get invoice data before deletion for audit trail
      let previousInvoice = null
      if (deletedBy) {
        previousInvoice = await trx
          .selectFrom('invoices')
          .selectAll()
          .where('invoice_id', '=', invoiceId)
          .executeTakeFirst()
      }

      // Delete the invoice
      const result = await trx
        .deleteFrom('invoices')
        .where('invoice_id', '=', invoiceId)
        .execute()

      // Create audit record if user provided and invoice existed
      if (deletedBy && previousInvoice) {
        try {
          await invoiceAuditRepository.createAuditRecord(
            invoiceId,
            'DELETE',
            {
              vendor: previousInvoice.vendor,
              sale_date: previousInvoice.sale_date,
              first_name: previousInvoice.first_name,
              last_name: previousInvoice.last_name,
              address: previousInvoice.address,
              city: previousInvoice.city,
              status: previousInvoice.status,
              amount: parseFloat(previousInvoice.amount),
              agentid: previousInvoice.agentid,
              issue_date: previousInvoice.issue_date,
              wkending: previousInvoice.wkending
            },
            null, // No current data for DELETE
            deletedBy,
            reason,
            ipAddress
          )
        } catch (auditError) {
          logger.error('Failed to create audit record for invoice deletion:', auditError)
          // Continue with the transaction - don't fail the delete due to audit issues
        }
      }

      return result.length > 0
    })
  }

  /**
   * Bulk delete invoices with audit trail
   */
  async deleteInvoices(
    invoiceIds: number[], 
    deletedBy?: number, 
    reason?: string, 
    ipAddress?: string
  ): Promise<{ deletedCount: number; expectedCount: number }> {
    return await db.transaction().execute(async (trx) => {
      let deletedCount = 0

      // Process each invoice individually to capture audit trail
      for (const invoiceId of invoiceIds) {
        // Get invoice data before deletion for audit trail
        let previousInvoice = null
        if (deletedBy) {
          previousInvoice = await trx
            .selectFrom('invoices')
            .selectAll()
            .where('invoice_id', '=', invoiceId)
            .executeTakeFirst()
        }

        // Delete the invoice
        const result = await trx
          .deleteFrom('invoices')
          .where('invoice_id', '=', invoiceId)
          .execute()

        if (result.length > 0) {
          deletedCount++

          // Create audit record if user provided and invoice existed
          if (deletedBy && previousInvoice) {
            try {
              await invoiceAuditRepository.createAuditRecord(
                invoiceId,
                'DELETE',
                {
                  vendor: previousInvoice.vendor,
                  sale_date: previousInvoice.sale_date,
                  first_name: previousInvoice.first_name,
                  last_name: previousInvoice.last_name,
                  address: previousInvoice.address,
                  city: previousInvoice.city,
                  status: previousInvoice.status,
                  amount: parseFloat(previousInvoice.amount),
                  agentid: previousInvoice.agentid,
                  issue_date: previousInvoice.issue_date,
                  wkending: previousInvoice.wkending
                },
                null, // No current data for DELETE
                deletedBy,
                reason,
                ipAddress
              )
            } catch (auditError) {
              logger.error('Failed to create audit record for invoice deletion:', auditError)
              // Continue with the transaction - don't fail the delete due to audit issues
            }
          }
        }
      }

      return {
        deletedCount,
        expectedCount: invoiceIds.length
      }
    })
  }

  /**
   * Delete entire paystub (all related records)
   */
  async deletePaystub(agentId: number, vendorId: number, issueDate: string): Promise<boolean> {
    const formattedDate = dayjs(issueDate, 'MM-DD-YYYY').toDate()

    return await db.transaction().execute(async (trx) => {
      try {
        // Delete all related records
        await trx
          .deleteFrom('invoices')
          .where('agentid', '=', agentId)
          .where('vendor', '=', vendorId.toString())
          .where('issue_date', '=', formattedDate)
          .execute()

        await trx
          .deleteFrom('expenses')
          .where('agentid', '=', agentId)
          .where('vendor_id', '=', vendorId)
          .where('issue_date', '=', formattedDate)
          .execute()

        await trx
          .deleteFrom('overrides')
          .where('agentid', '=', agentId)
          .where('vendor_id', '=', vendorId)
          .where('issue_date', '=', formattedDate)
          .execute()

        // Delete payroll record (paystub)
        await trx
          .deleteFrom('payroll')
          .where('agent_id', '=', agentId)
          .where('vendor_id', '=', vendorId)
          .where('pay_date', '=', formattedDate)
          .execute()

        return true
      } catch (error) {
        logger.error('Error deleting paystub:', error)
        return false
      }
    })
  }
}

export const invoiceRepository = new InvoiceRepository()
