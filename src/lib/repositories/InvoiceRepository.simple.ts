import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { invoiceAuditRepository } from './InvoiceAuditRepository'

// Simple types for our gradual implementation
interface SimpleSale {
  invoiceId?: number  // For updates
  sale_date: string
  first_name: string
  last_name: string
  address: string
  city: string
  status: string
  amount: number
  is_active?: number
}

interface SimpleOverride {
  overrideId?: number  // For updates
  name: string
  sales: number
  commission: number
  total: number
}

interface SimpleExpense {
  expenseId?: number  // For updates
  type: string
  amount: number
  notes: string
}

interface SimpleRequest {
  vendor: string
  agentId: number
  issueDate: string
  weekending: string
  sales: SimpleSale[]
  overrides?: SimpleOverride[]
  expenses?: SimpleExpense[]
  pendingDeletes?: {
    sales?: number[]
    overrides?: number[]
    expenses?: number[]
  }
  // Audit metadata
  auditMetadata?: {
    userId: number
    userEmail: string
    ipAddress: string
    userAgent: string
  }
}

interface SimpleSaveResult {
  success: boolean
  sales: any[]  // We'll improve this gradually
  overrides: any[]
  expenses: any[]
  message: string
}

/**
 * Simplified Invoice Repository - Basic CRUD Operations Only
 * No transactions, no audit trails, no complex logic
 */
export class InvoiceRepository {
  
  /**
   * Simple save operation - now with transaction support
   */
  async saveInvoiceData(request: SimpleRequest): Promise<SimpleSaveResult> {
    console.log('🚀 Starting SIMPLE saveInvoiceData with transaction')
    console.log('📝 Request data:', {
      agentId: request.agentId,
      vendor: request.vendor,
      salesCount: request.sales.length
    })

    try {
      // Use transaction for data consistency
      const result = await db.transaction().execute(async (trx) => {
        const salesResults = []
        const overrideResults = []
        const expenseResults = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let deletedSales: any[] = []

        // Handle deletes first (avoid the race condition we had before)
        if (request.pendingDeletes) {
          console.log('🗑️ Processing pending deletes:', request.pendingDeletes)
          
          if (request.pendingDeletes.sales?.length) {
            // Get the records before deleting them for audit trail
            const salesToDelete = await trx
              .selectFrom('invoices')
              .selectAll()
              .where('invoice_id', 'in', request.pendingDeletes.sales)
              .execute()

            await trx
              .deleteFrom('invoices')
              .where('invoice_id', 'in', request.pendingDeletes.sales)
              .execute()
            
            // Store deleted records for audit trail
            deletedSales = salesToDelete
            console.log('✅ Deleted', request.pendingDeletes.sales.length, 'invoices')
          }
          
          if (request.pendingDeletes.overrides?.length) {
            await trx
              .deleteFrom('overrides')
              .where('ovrid', 'in', request.pendingDeletes.overrides)
              .execute()
            console.log('✅ Deleted', request.pendingDeletes.overrides.length, 'overrides')
          }
          
          if (request.pendingDeletes.expenses?.length) {
            await trx
              .deleteFrom('expenses')
              .where('expid', 'in', request.pendingDeletes.expenses)
              .execute()
            console.log('✅ Deleted', request.pendingDeletes.expenses.length, 'expenses')
          }
        }
        
        // Process sales
        for (const sale of request.sales || []) {
          console.log('💾 Processing sale:', sale)
          
          const saleData = {
            vendor: request.vendor,
            sale_date: dayjs(sale.sale_date, 'MM-DD-YYYY').toDate(),
            first_name: sale.first_name,
            last_name: sale.last_name,
            address: sale.address,
            city: sale.city,
            status: sale.status,
            amount: sale.amount.toString(),
            agentid: request.agentId,
            issue_date: dayjs(request.issueDate, 'YYYY-MM-DD').toDate(),
            wkending: dayjs(request.weekending, 'YYYY-MM-DD').toDate(),
            updated_at: new Date()
          }

          if (sale.invoiceId && sale.invoiceId > 0) {
            // Get existing data for audit trail
            const existingInvoice = await trx
              .selectFrom('invoices')
              .selectAll()
              .where('invoice_id', '=', sale.invoiceId)
              .executeTakeFirst()

            await trx
              .updateTable('invoices')
              .set(saleData)
              .where('invoice_id', '=', sale.invoiceId)
              .execute()
            
            salesResults.push({ 
              ...saleData, 
              invoice_id: sale.invoiceId,
              // Store previous data for audit
              _previousData: existingInvoice || null
            })
          } else {
            const result = await trx
              .insertInto('invoices')
              .values({ ...saleData, created_at: new Date() })
              .executeTakeFirst()
            const newId = Number(result.insertId)
            salesResults.push({ 
              ...saleData, 
              invoice_id: newId,
              _previousData: null // New record, no previous data
            })
          }
        }

        // Process overrides
        for (const override of request.overrides || []) {
          console.log('💾 Processing override:', override)
          
          const overrideData = {
            vendor_id: parseInt(request.vendor),
            name: override.name,
            sales: override.sales,
            commission: override.commission.toString(),
            total: override.total.toString(),
            agentid: request.agentId,
            issue_date: dayjs(request.issueDate, 'YYYY-MM-DD').toDate(),
            wkending: dayjs(request.weekending, 'YYYY-MM-DD').toDate(),
            updated_at: new Date()
          }

          if (override.overrideId && override.overrideId > 0) {
            await trx
              .updateTable('overrides')
              .set(overrideData)
              .where('ovrid', '=', override.overrideId)
              .execute()
            overrideResults.push({ ...overrideData, ovrid: override.overrideId })
          } else {
            const result = await trx
              .insertInto('overrides')
              .values({ ...overrideData, created_at: new Date() })
              .executeTakeFirst()
            const newId = Number(result.insertId)
            overrideResults.push({ ...overrideData, ovrid: newId })
          }
        }

        // Process expenses
        for (const expense of request.expenses || []) {
          console.log('💾 Processing expense:', expense)
          
          const expenseData = {
            vendor_id: parseInt(request.vendor),
            type: expense.type,
            amount: expense.amount.toString(),
            notes: expense.notes,
            agentid: request.agentId,
            issue_date: dayjs(request.issueDate, 'YYYY-MM-DD').toDate(),
            wkending: dayjs(request.weekending, 'YYYY-MM-DD').toDate(),
            updated_at: new Date()
          }

          if (expense.expenseId && expense.expenseId > 0) {
            await trx
              .updateTable('expenses')
              .set(expenseData)
              .where('expid', '=', expense.expenseId)
              .execute()
            expenseResults.push({ ...expenseData, expid: expense.expenseId })
          } else {
            const result = await trx
              .insertInto('expenses')
              .values({ ...expenseData, created_at: new Date() })
              .executeTakeFirst()
            const newId = Number(result.insertId)
            expenseResults.push({ ...expenseData, expid: newId })
          }
        }

        return { salesResults, overrideResults, expenseResults, deletedSales }
      })

      console.log('✅ Transaction completed successfully')
      
      // Calculate payroll after transaction completes
      await this.updatePayrollRecords(request, result.salesResults, result.overrideResults, result.expenseResults)
      
      // Create audit trail if metadata provided
      if (request.auditMetadata) {
        await this.createAuditTrail(request, result.salesResults, result.overrideResults, result.expenseResults, result.deletedSales)
      }
      
      return {
        success: true,
        sales: result.salesResults,
        overrides: result.overrideResults,
        expenses: result.expenseResults,
        message: `Processed ${result.salesResults.length} sales, ${result.overrideResults.length} overrides, ${result.expenseResults.length} expenses`
      }
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      throw error
    }
  }

  /**
   * Update payroll and paystubs records
   */
  private async updatePayrollRecords(request: SimpleRequest, sales: any[], overrides: any[], expenses: any[]) {
    console.log('💰 Updating payroll records')
    
    try {
      // Calculate totals
      const salesTotal = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0)
      const overridesTotal = overrides.reduce((sum, override) => sum + parseFloat(override.total), 0)
      const expensesTotal = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
      const totalAmount = salesTotal + overridesTotal + expensesTotal

      console.log('📊 Totals:', { salesTotal, overridesTotal, expensesTotal, totalAmount })

      // Get employee and vendor names
      const [employee, vendor] = await Promise.all([
        db.selectFrom('employees').select('name').where('id', '=', request.agentId).executeTakeFirst(),
        db.selectFrom('vendors').select('name').where('id', '=', parseInt(request.vendor)).executeTakeFirst()
      ])

      const agentName = employee?.name || ''
      const vendorName = vendor?.name || ''

      // Update or create payroll record
      const payrollData = {
        agent_id: request.agentId,
        agent_name: agentName,
        amount: totalAmount.toString(),
        is_paid: 0,
        vendor_id: parseInt(request.vendor),
        pay_date: dayjs(request.issueDate, 'YYYY-MM-DD').toDate(),
        updated_at: new Date()
      }

      const existingPayroll = await db
        .selectFrom('payroll')
        .select('id')
        .where('agent_id', '=', request.agentId)
        .where('vendor_id', '=', parseInt(request.vendor))
        .where('pay_date', '=', dayjs(request.issueDate, 'YYYY-MM-DD').toDate())
        .executeTakeFirst()

      if (existingPayroll) {
        await db
          .updateTable('payroll')
          .set(payrollData)
          .where('id', '=', existingPayroll.id)
          .execute()
        console.log('✅ Updated payroll record:', existingPayroll.id)
      } else {
        await db
          .insertInto('payroll')
          .values({ ...payrollData, created_at: new Date() })
          .execute()
        console.log('✅ Created payroll record')
      }

      // Update or create paystubs record
      const paystubData = {
        agent_id: request.agentId,
        agent_name: agentName,
        amount: totalAmount.toString(),
        vendor_id: parseInt(request.vendor),
        vendor_name: vendorName,
        issue_date: dayjs(request.issueDate, 'YYYY-MM-DD').toDate(),
        weekend_date: dayjs(request.weekending, 'YYYY-MM-DD').toDate(),
        updated_at: new Date()
      }

      const existingPaystub = await db
        .selectFrom('paystubs')
        .select('id')
        .where('agent_id', '=', request.agentId)
        .where('vendor_id', '=', parseInt(request.vendor))
        .where('issue_date', '=', dayjs(request.issueDate, 'YYYY-MM-DD').toDate())
        .executeTakeFirst()

      if (existingPaystub) {
        await db
          .updateTable('paystubs')
          .set(paystubData)
          .where('id', '=', existingPaystub.id)
          .execute()
        console.log('✅ Updated paystub record:', existingPaystub.id)
      } else {
        await db
          .insertInto('paystubs')
          .values({ ...paystubData, created_at: new Date(), modified_by: 1 })
          .execute()
        console.log('✅ Created paystub record')
      }

    } catch (error) {
      console.error('❌ Error updating payroll records:', error)
      // Don't throw - payroll calculation errors shouldn't fail the main operation
    }
  }

  /**
   * Create audit trail for the changes
   */
  private async createAuditTrail(request: SimpleRequest, sales: any[], _overrides: any[], _expenses: any[], deletedSales: any[] = []) {
    if (!request.auditMetadata) return
    
    console.log('📝 Creating audit trail')
    
    try {
      // Create audit records for updated/created sales
      for (const sale of sales) {
        if (sale.invoice_id) {
          const previousData = sale._previousData || {}
          
          // Create audit record with proper before/after comparison
          await invoiceAuditRepository.createAuditRecord(
            sale.invoice_id,
            'UPDATE', // Use UPDATE for both new and existing records
            previousData, // Previous state (empty for new records)
            {
              vendor: sale.vendor,
              sale_date: sale.sale_date,
              first_name: sale.first_name,
              last_name: sale.last_name,
              address: sale.address,
              city: sale.city,
              status: sale.status,
              amount: sale.amount,
              agentid: sale.agentid,
              issue_date: sale.issue_date,
              wkending: sale.wkending
            },
            request.auditMetadata.userId,
            sale._previousData ? 'Invoice updated via web interface' : 'New invoice created via web interface',
            request.auditMetadata.ipAddress
          )
          
          console.log(`✅ Audit record created for invoice ${sale.invoice_id} (${sale._previousData ? 'UPDATE' : 'CREATE'})`)
        }
      }
      
      // Create audit records for deleted sales
      for (const deletedSale of deletedSales) {
        await invoiceAuditRepository.createAuditRecord(
          deletedSale.invoice_id,
          'DELETE',
          {
            vendor: deletedSale.vendor,
            sale_date: deletedSale.sale_date,
            first_name: deletedSale.first_name,
            last_name: deletedSale.last_name,
            address: deletedSale.address,
            city: deletedSale.city,
            status: deletedSale.status,
            amount: deletedSale.amount,
            agentid: deletedSale.agentid,
            issue_date: deletedSale.issue_date,
            wkending: deletedSale.wkending
          }, // Previous state (what was deleted)
          {}, // After state (empty since it's deleted)
          request.auditMetadata.userId,
          'Invoice deleted via web interface',
          request.auditMetadata.ipAddress
        )
        
        console.log(`✅ Audit record created for deleted invoice ${deletedSale.invoice_id}`)
      }
      
      console.log('✅ Audit trail created for', sales.length, 'invoice changes and', deletedSales.length, 'deletions')
    } catch (error) {
      console.error('❌ Error creating audit trail:', error)
      // Don't throw - audit errors shouldn't fail the main operation
    }
  }

  /**
   * Simple get by invoice ID
   */
  async getInvoiceById(invoiceId: number) {
    return await db
      .selectFrom('invoices')
      .selectAll()
      .where('invoice_id', '=', invoiceId)
      .executeTakeFirst()
  }

  /**
   * Simple get by agent and vendor
   */
  async getInvoicesByAgent(agentId: number, vendorId?: number) {
    let query = db
      .selectFrom('invoices')
      .selectAll()
      .where('agentid', '=', agentId)
      
    if (vendorId) {
      query = query.where('vendor', '=', vendorId.toString())
    }
    
    return await query.execute()
  }

  /**
   * Get invoice page resources (agents, vendors, issue dates)
   */
  async getInvoicePageResources() {
    console.log('📊 Getting invoice page resources')
    
    try {
      // Get active agents with all sales IDs for filtering
      const agents = await db
        .selectFrom('employees')
        .select(['id', 'name', 'sales_id1', 'sales_id2', 'sales_id3'])
        .where('is_active', '=', 1)
        .where('deleted_at', 'is', null)
        .orderBy('name')
        .execute()

      // Get active vendors
      const vendors = await db
        .selectFrom('vendors')
        .select(['id', 'name'])
        .where('is_active', '=', 1)
        .orderBy('name')
        .execute()

      // Get recent issue dates from paystubs (last 3 months)
      const threeMonthsAgo = dayjs().subtract(3, 'months').toDate()
      const issueDatesResult = await db
        .selectFrom('paystubs')
        .select('issue_date')
        .where('issue_date', '>=', threeMonthsAgo)
        .groupBy('issue_date')
        .orderBy('issue_date', 'desc')
        .execute()

      const issueDates = issueDatesResult
        .map(row => dayjs(row.issue_date).format('MM-DD-YYYY'))
        .filter(date => date !== 'Invalid date')

      console.log('✅ Found resources:', {
        agentsCount: agents.length,
        vendorsCount: vendors.length,
        issueDatesCount: issueDates.length
      })

      return {
        agents,
        vendors,
        issueDates
      }
    } catch (error) {
      console.error('❌ Error getting invoice page resources:', error)
      throw error
    }
  }

  /**
   * Get invoice details for a specific agent/vendor/issue date
   */
  async getInvoiceDetail(agentId: number, vendorId: number, issueDate: string) {
    console.log('📋 Getting invoice detail:', { agentId, vendorId, issueDate })
    
    try {
      const formattedDate = dayjs(issueDate, 'MM-DD-YYYY').toDate()
      
      // Get invoices
      const invoices = await db
        .selectFrom('invoices')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor', '=', vendorId.toString())
        .where('issue_date', '=', formattedDate)
        .execute()

      // Get overrides
      const overrides = await db
        .selectFrom('overrides')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where('issue_date', '=', formattedDate)
        .execute()

      // Get expenses
      const expenses = await db
        .selectFrom('expenses')
        .selectAll()
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where('issue_date', '=', formattedDate)
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

      console.log('✅ Found detail:', {
        invoicesCount: invoices.length,
        overridesCount: overrides.length,
        expensesCount: expenses.length,
        employeeName: employee?.name,
        vendorName: vendor?.name
      })

      return {
        invoices: invoices.map(inv => ({
          ...inv,
          sale_date: dayjs(inv.sale_date).format('MM-DD-YYYY'),
          issue_date: dayjs(inv.issue_date).format('MM-DD-YYYY'),
          wkending: dayjs(inv.wkending).format('MM-DD-YYYY'),
          amount: parseFloat(inv.amount.toString())
        })),
        overrides: overrides.map(ovr => ({
          ...ovr,
          issue_date: dayjs(ovr.issue_date).format('MM-DD-YYYY'),
          wkending: dayjs(ovr.wkending).format('MM-DD-YYYY'),
          commission: parseFloat(ovr.commission.toString()),
          total: parseFloat(ovr.total.toString())
        })),
        expenses: expenses.map(exp => ({
          ...exp,
          issue_date: dayjs(exp.issue_date).format('MM-DD-YYYY'),
          wkending: dayjs(exp.wkending).format('MM-DD-YYYY'),
          amount: parseFloat(exp.amount.toString())
        })),
        employee: employee || { id: agentId, name: 'Unknown', sales_id1: '' },
        vendor: vendor || { id: vendorId, name: 'Unknown' }
      }
    } catch (error) {
      console.error('❌ Error getting invoice detail:', error)
      throw error
    }
  }
}

export const invoiceRepository = new InvoiceRepository()