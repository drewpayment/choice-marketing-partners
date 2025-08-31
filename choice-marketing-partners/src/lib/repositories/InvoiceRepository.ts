import { db } from '@/lib/database/client'
import dayjs from 'dayjs'

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
    console.log('🔍 Repository - getInvoiceDetail called with:', { agentId, vendorId, issueDate })
    
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

    console.log('💾 Repository - Found invoices:', invoices.length)

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
   * Save invoice data (transactional operation)
   */
  async saveInvoiceData(request: InvoiceSaveRequest): Promise<InvoiceSaveResult> {
    const formattedIssueDate = formatDateForDB(request.issueDate)
    const formattedWeekending = formatDateForDB(request.weekending)
    const now = new Date()

    // Start transaction
    return await db.transaction().execute(async (trx) => {
      // Delete pending items first
      if (request.pendingDeletes) {
        if (request.pendingDeletes.sales?.length) {
          await trx
            .deleteFrom('invoices')
            .where('invoice_id', 'in', request.pendingDeletes.sales)
            .execute()
        }
        if (request.pendingDeletes.overrides?.length) {
          await trx
            .deleteFrom('overrides')
            .where('ovrid', 'in', request.pendingDeletes.overrides)
            .execute()
        }
        if (request.pendingDeletes.expenses?.length) {
          await trx
            .deleteFrom('expenses')
            .where('expid', 'in', request.pendingDeletes.expenses)
            .execute()
        }
      }

      // Save sales records
      const savedSales: Invoice[] = []
      for (const sale of request.sales) {
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
          updated_at: now
        }

        if (sale.invoiceId && sale.invoiceId > 0) {
          // Update existing
          await trx
            .updateTable('invoices')
            .set(saleData)
            .where('invoice_id', '=', sale.invoiceId)
            .execute()
          
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
          // Insert new
          const result = await trx
            .insertInto('invoices')
            .values({
              ...saleData,
              created_at: now
            })
            .executeTakeFirst()

          savedSales.push({
            invoice_id: Number(result.insertId),
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

      // Save override records
      const savedOverrides: Override[] = []
      for (const override of request.overrides) {
        const overrideData = {
          vendor_id: request.vendorId,
          name: override.name,
          sales: override.sales,
          commission: override.commission.toString(),
          total: override.total.toString(),
          agentid: request.agentId,
          issue_date: dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate(),
          wkending: dayjs(formattedWeekending, 'YYYY-MM-DD').toDate(),
          updated_at: now
        }

        if (override.overrideId && override.overrideId > 0) {
          // Update existing
          await trx
            .updateTable('overrides')
            .set(overrideData)
            .where('ovrid', '=', override.overrideId)
            .execute()

          savedOverrides.push({
            ovrid: override.overrideId,
            vendor_id: overrideData.vendor_id,
            name: overrideData.name,
            sales: overrideData.sales,
            commission: override.commission,
            total: override.total,
            agentid: overrideData.agentid,
            issue_date: dayjs(overrideData.issue_date).format('YYYY-MM-DD'),
            wkending: dayjs(overrideData.wkending).format('YYYY-MM-DD')
          })
        } else {
          // Insert new
          const result = await trx
            .insertInto('overrides')
            .values({
              ...overrideData,
              created_at: now
            })
            .executeTakeFirst()

          savedOverrides.push({
            ovrid: Number(result.insertId),
            vendor_id: overrideData.vendor_id,
            name: overrideData.name,
            sales: overrideData.sales,
            commission: override.commission,
            total: override.total,
            agentid: overrideData.agentid,
            issue_date: dayjs(overrideData.issue_date).format('YYYY-MM-DD'),
            wkending: dayjs(overrideData.wkending).format('YYYY-MM-DD')
          })
        }
      }

      // Save expense records
      const savedExpenses: Expense[] = []
      for (const expense of request.expenses) {
        const expenseData = {
          vendor_id: request.vendorId,
          type: expense.type,
          amount: expense.amount.toString(),
          notes: expense.notes,
          agentid: request.agentId,
          issue_date: dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate(),
          wkending: dayjs(formattedWeekending, 'YYYY-MM-DD').toDate(),
          updated_at: now
        }

        if (expense.expenseId && expense.expenseId > 0) {
          // Update existing
          await trx
            .updateTable('expenses')
            .set(expenseData)
            .where('expid', '=', expense.expenseId)
            .execute()

          savedExpenses.push({
            expid: expense.expenseId,
            vendor_id: expenseData.vendor_id,
            type: expenseData.type,
            amount: expense.amount,
            notes: expenseData.notes,
            agentid: expenseData.agentid,
            issue_date: dayjs(expenseData.issue_date).format('YYYY-MM-DD'),
            wkending: dayjs(expenseData.wkending).format('YYYY-MM-DD')
          })
        } else {
          // Insert new
          const result = await trx
            .insertInto('expenses')
            .values({
              ...expenseData,
              created_at: now
            })
            .executeTakeFirst()

          savedExpenses.push({
            expid: Number(result.insertId),
            vendor_id: expenseData.vendor_id,
            type: expenseData.type,
            amount: expense.amount,
            notes: expenseData.notes,
            agentid: expenseData.agentid,
            issue_date: dayjs(expenseData.issue_date).format('YYYY-MM-DD'),
            wkending: dayjs(expenseData.wkending).format('YYYY-MM-DD')
          })
        }
      }

      // Calculate totals and update/create payroll record
      const salesTotal = savedSales.reduce((sum, sale) => sum + sale.amount, 0)
      const overridesTotal = savedOverrides.reduce((sum, override) => sum + override.total, 0)
      const expensesTotal = savedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      const totalAmount = salesTotal + overridesTotal + expensesTotal

      // Get employee name
      const employee = await trx
        .selectFrom('employees')
        .select('name')
        .where('id', '=', request.agentId)
        .executeTakeFirst()

      // Get vendor name for paystubs table
      const vendor = await trx
        .selectFrom('vendors')
        .select('name')
        .where('id', '=', request.vendorId)
        .executeTakeFirst()

      // Update or create payroll record
      const existingPayroll = await trx
        .selectFrom('payroll')
        .select('id')
        .where('agent_id', '=', request.agentId)
        .where('vendor_id', '=', request.vendorId)
        .where('pay_date', '=', dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate())
        .executeTakeFirst()

      const payrollData = {
        agent_id: request.agentId,
        agent_name: employee?.name || '',
        amount: totalAmount.toString(),
        is_paid: 0, // Database expects number, not boolean
        vendor_id: request.vendorId,
        pay_date: dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate(),
        updated_at: now
      }

      let payrollId: number

      if (existingPayroll) {
        await trx
          .updateTable('payroll')
          .set(payrollData)
          .where('id', '=', existingPayroll.id)
          .execute()
        payrollId = existingPayroll.id
      } else {
        const result = await trx
          .insertInto('payroll')
          .values({
            ...payrollData,
            created_at: now
          })
          .executeTakeFirst()
        payrollId = Number(result.insertId)
      }

      // Update or create paystubs record with weekend date
      const paystubData = {
        agent_id: request.agentId,
        agent_name: employee?.name || '',
        amount: totalAmount.toString(), // Convert to string for Decimal type
        vendor_id: request.vendorId,
        vendor_name: vendor?.name || '',
        issue_date: dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate(),
        weekend_date: dayjs(formattedWeekending, 'YYYY-MM-DD').toDate(),
        updated_at: now
      }

      const existingPaystub = await trx
        .selectFrom('paystubs')
        .select('id')
        .where('agent_id', '=', request.agentId)
        .where('vendor_id', '=', request.vendorId)
        .where('issue_date', '=', dayjs(formattedIssueDate, 'YYYY-MM-DD').toDate())
        .executeTakeFirst()

      if (existingPaystub) {
        await trx
          .updateTable('paystubs')
          .set(paystubData)
          .where('id', '=', existingPaystub.id)
          .execute()
      } else {
        await trx
          .insertInto('paystubs')
          .values({
            ...paystubData,
            created_at: now,
            modified_by: 1 // Default to system user, you may want to use actual user ID
          })
          .execute()
      }

      return {
        sales: savedSales,
        overrides: savedOverrides,
        expenses: savedExpenses,
        payroll: {
          id: payrollId,
          agent_id: request.agentId,
          agent_name: employee?.name || '',
          amount: totalAmount,
          vendor_id: request.vendorId,
          pay_date: request.issueDate,
          is_paid: false
        }
      }
    })
  }

  /**
   * Delete single invoice
   */
  async deleteInvoice(invoiceId: number): Promise<boolean> {
    const result = await db
      .deleteFrom('invoices')
      .where('invoice_id', '=', invoiceId)
      .execute()

    return result.length > 0
  }

  /**
   * Bulk delete invoices
   */
  async deleteInvoices(invoiceIds: number[]): Promise<{ deletedCount: number; expectedCount: number }> {
    const result = await db
      .deleteFrom('invoices')
      .where('invoice_id', 'in', invoiceIds)
      .execute()

    return {
      deletedCount: result.length,
      expectedCount: invoiceIds.length
    }
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
        console.error('Error deleting paystub:', error)
        return false
      }
    })
  }
}

export const invoiceRepository = new InvoiceRepository()
