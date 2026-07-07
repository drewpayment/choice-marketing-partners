import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { logger } from '@/lib/utils/logger'
import type { UserContext } from '@/lib/auth/types'
import type { Kysely, Transaction } from 'kysely'
import type { DB } from '@/lib/database/types'

/**
 * Advances are first-class "daily pay" advances paid to a rep against a future
 * pay statement. They are stored as POSITIVE amounts and SUBTRACT from paystub
 * net pay:  netPay = sales + overrides + expenses - advances.
 *
 * They replace the old workaround of recording advances as negative free-text
 * expense rows.
 */

export const ADVANCE_METHODS = ['cash', 'ach', 'check', 'other'] as const
export type AdvanceMethod = (typeof ADVANCE_METHODS)[number]

export interface AdvanceRecord {
  advance_id: number
  agentid: number
  vendor_id: number
  amount: number
  advance_date: string // YYYY-MM-DD
  issue_date: string // YYYY-MM-DD
  wkending: string // YYYY-MM-DD
  method: string
  notes: string
  created_by: number
  created_at: string | null
  updated_at: string | null
}

export interface CreateAdvanceInput {
  agentid: number
  vendorId: number
  amount: number
  advanceDate: string // YYYY-MM-DD
  issueDate: string // YYYY-MM-DD
  wkending: string // YYYY-MM-DD
  method?: string
  notes?: string
}

export interface UpdateAdvanceInput {
  amount?: number
  advanceDate?: string
  issueDate?: string
  wkending?: string
  method?: string
  notes?: string
}

export interface AdvanceFilters {
  vendorId?: number
  issueDate?: string // YYYY-MM-DD
  wkending?: string // YYYY-MM-DD
  startDate?: string // YYYY-MM-DD (issue_date >=)
  endDate?: string // YYYY-MM-DD (issue_date <=)
}

export interface AuditMetadata {
  changedBy: number
  ipAddress?: string
  reason?: string
}

type DbOrTrx = Kysely<DB> | Transaction<DB>

function normalizeMethod(method?: string): AdvanceMethod {
  const m = (method || 'other').toLowerCase() as AdvanceMethod
  return ADVANCE_METHODS.includes(m) ? m : 'other'
}

function toDateString(value: Date | string | null | undefined): string {
  if (!value) return ''
  return dayjs(value).format('YYYY-MM-DD')
}

/**
 * Repository for first-class daily-pay advances.
 */
export class AdvanceRepository {
  /**
   * Create a new advance. Amount must be strictly positive.
   * Writes an advance_audit CREATE row in the same transaction.
   */
  async createAdvance(
    input: CreateAdvanceInput,
    userContext: UserContext,
    audit: AuditMetadata
  ): Promise<AdvanceRecord> {
    this.assertCanWrite(input.agentid, userContext)

    if (!(input.amount > 0)) {
      throw new Error('Advance amount must be greater than zero')
    }

    const method = normalizeMethod(input.method)
    const notes = input.notes ?? ''

    const values = {
      agentid: input.agentid,
      vendor_id: input.vendorId,
      amount: input.amount.toFixed(2),
      advance_date: dayjs(input.advanceDate, 'YYYY-MM-DD').toDate(),
      issue_date: dayjs(input.issueDate, 'YYYY-MM-DD').toDate(),
      wkending: dayjs(input.wkending, 'YYYY-MM-DD').toDate(),
      method,
      notes,
      created_by: audit.changedBy,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const advanceId = await db.transaction().execute(async (trx) => {
      const result = await trx.insertInto('advances').values(values).executeTakeFirst()
      const newId = Number(result.insertId)

      await this.writeAudit(trx, newId, 'CREATE', null, {
        amount: values.amount,
        advance_date: values.advance_date,
        issue_date: values.issue_date,
        wkending: values.wkending,
        method: values.method,
        notes: values.notes,
        agentid: values.agentid,
        vendor_id: values.vendor_id,
      }, audit)

      // Keep persisted statement totals in sync if a statement already exists.
      await this.resyncStatementTotals(trx, values.agentid, values.vendor_id, input.issueDate)

      return newId
    })

    logger.log('✅ Created advance', advanceId)

    const created = await this.getAdvanceById(advanceId, userContext)
    if (!created) throw new Error('Failed to load created advance')
    return created
  }

  /**
   * Update an existing advance. Amount (when provided) must be positive.
   * Writes an advance_audit UPDATE row capturing before/after state.
   */
  async updateAdvance(
    advanceId: number,
    input: UpdateAdvanceInput,
    userContext: UserContext,
    audit: AuditMetadata
  ): Promise<AdvanceRecord> {
    const existing = await db
      .selectFrom('advances')
      .selectAll()
      .where('advance_id', '=', advanceId)
      .executeTakeFirst()

    if (!existing) {
      throw new Error('Advance not found')
    }

    this.assertCanWrite(existing.agentid, userContext)

    if (input.amount !== undefined && !(input.amount > 0)) {
      throw new Error('Advance amount must be greater than zero')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date() }
    if (input.amount !== undefined) updates.amount = input.amount.toFixed(2)
    if (input.advanceDate !== undefined) updates.advance_date = dayjs(input.advanceDate, 'YYYY-MM-DD').toDate()
    if (input.issueDate !== undefined) updates.issue_date = dayjs(input.issueDate, 'YYYY-MM-DD').toDate()
    if (input.wkending !== undefined) updates.wkending = dayjs(input.wkending, 'YYYY-MM-DD').toDate()
    if (input.method !== undefined) updates.method = normalizeMethod(input.method)
    if (input.notes !== undefined) updates.notes = input.notes

    await db.transaction().execute(async (trx) => {
      await trx.updateTable('advances').set(updates).where('advance_id', '=', advanceId).execute()

      await this.writeAudit(
        trx,
        advanceId,
        'UPDATE',
        {
          amount: existing.amount,
          advance_date: existing.advance_date,
          issue_date: existing.issue_date,
          wkending: existing.wkending,
          method: existing.method,
          notes: existing.notes,
          agentid: existing.agentid,
          vendor_id: existing.vendor_id,
        },
        {
          amount: updates.amount ?? existing.amount,
          advance_date: updates.advance_date ?? existing.advance_date,
          issue_date: updates.issue_date ?? existing.issue_date,
          wkending: updates.wkending ?? existing.wkending,
          method: updates.method ?? existing.method,
          notes: updates.notes ?? existing.notes,
          agentid: existing.agentid,
          vendor_id: existing.vendor_id,
        },
        audit
      )

      // Resync persisted statement totals. agentid/vendor_id are immutable via
      // UpdateAdvanceInput, but issue_date CAN move — so resync both the old and
      // the new (agentid, vendor_id, issue_date) keys. Dedupe when unchanged.
      const oldIssue = toDateString(existing.issue_date)
      const newIssue = updates.issue_date ? toDateString(updates.issue_date) : oldIssue

      const seen = new Set<string>()
      for (const issue of [oldIssue, newIssue]) {
        const key = `${existing.agentid}|${existing.vendor_id}|${issue}`
        if (seen.has(key)) continue
        seen.add(key)
        await this.resyncStatementTotals(trx, existing.agentid, existing.vendor_id, issue)
      }
    })

    logger.log('✅ Updated advance', advanceId)

    const updated = await this.getAdvanceById(advanceId, userContext)
    if (!updated) throw new Error('Failed to load updated advance')
    return updated
  }

  /**
   * Delete an advance. Writes an advance_audit DELETE row snapshotting the
   * previous state in the same transaction.
   */
  async deleteAdvance(
    advanceId: number,
    userContext: UserContext,
    audit: AuditMetadata
  ): Promise<{ success: boolean }> {
    const existing = await db
      .selectFrom('advances')
      .selectAll()
      .where('advance_id', '=', advanceId)
      .executeTakeFirst()

    if (!existing) {
      throw new Error('Advance not found')
    }

    this.assertCanWrite(existing.agentid, userContext)

    await db.transaction().execute(async (trx) => {
      await this.writeAudit(
        trx,
        advanceId,
        'DELETE',
        {
          amount: existing.amount,
          advance_date: existing.advance_date,
          issue_date: existing.issue_date,
          wkending: existing.wkending,
          method: existing.method,
          notes: existing.notes,
          agentid: existing.agentid,
          vendor_id: existing.vendor_id,
        },
        null,
        audit
      )

      await trx.deleteFrom('advances').where('advance_id', '=', advanceId).execute()

      // Removing an advance changes net pay — resync the statement it settled against.
      await this.resyncStatementTotals(
        trx,
        existing.agentid,
        existing.vendor_id,
        toDateString(existing.issue_date)
      )
    })

    logger.log('✅ Deleted advance', advanceId)
    return { success: true }
  }

  /**
   * Fetch a single advance by id with read RBAC applied.
   */
  async getAdvanceById(advanceId: number, userContext: UserContext): Promise<AdvanceRecord | null> {
    const row = await db
      .selectFrom('advances')
      .selectAll()
      .where('advance_id', '=', advanceId)
      .executeTakeFirst()

    if (!row) return null

    if (!this.canRead(row.agentid, userContext)) {
      throw new Error('Access denied: agent not in your direct reports')
    }

    return this.mapRow(row)
  }

  /**
   * All advances that settle against a given (agentid, vendor, issue_date)
   * statement. Used by paystub math. No RBAC gate here — callers (paystub /
   * payroll persistence) have already resolved access.
   */
  async getAdvancesForStatement(
    agentId: number,
    vendorId: number,
    issueDate: string
  ): Promise<AdvanceRecord[]> {
    const rows = await db
      .selectFrom('advances')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(db.fn('DATE', ['issue_date']), '=', issueDate)
      .orderBy('advance_date', 'asc')
      .execute()

    return rows.map((r) => this.mapRow(r))
  }

  /**
   * List advances for an agent with role-based filtering.
   * Employees may only read their own advances; managers only their direct
   * reports; admins anyone.
   */
  async getAdvancesByAgent(
    agentId: number,
    filters: AdvanceFilters,
    userContext: UserContext
  ): Promise<AdvanceRecord[]> {
    if (!this.canRead(agentId, userContext)) {
      throw new Error('Access denied: agent not in your direct reports')
    }

    let query = db.selectFrom('advances').selectAll().where('agentid', '=', agentId)

    if (filters.vendorId) {
      query = query.where('vendor_id', '=', filters.vendorId)
    }
    if (filters.issueDate) {
      query = query.where(db.fn('DATE', ['issue_date']), '=', filters.issueDate)
    }
    if (filters.wkending) {
      query = query.where(db.fn('DATE', ['wkending']), '=', filters.wkending)
    }
    if (filters.startDate) {
      query = query.where(db.fn('DATE', ['issue_date']), '>=', filters.startDate)
    }
    if (filters.endDate) {
      query = query.where(db.fn('DATE', ['issue_date']), '<=', filters.endDate)
    }

    const rows = await query.orderBy('issue_date', 'desc').orderBy('advance_date', 'desc').execute()
    return rows.map((r) => this.mapRow(r))
  }

  /**
   * Batch-sum advances for many (agent, vendor, issue_date) combinations.
   * Mirrors PayrollRepository.getBatchExpensesTotals so it can slot into the
   * parallel-fetch in getPayrollSummary. Keyed `${originalAgentId}-${vendorId}-${issueDate}`.
   */
  async getBatchAdvancesTotals(
    combinations: Array<{ agentId: string; vendorId: number; issueDate: string; originalAgentId: string }>
  ): Promise<Map<string, number>> {
    const totalsMap = new Map<string, number>()

    if (combinations.length === 0) return totalsMap

    const agentIds = [...new Set(combinations.map((c) => parseInt(c.agentId)).filter((id) => !isNaN(id)))]
    const vendorIds = [...new Set(combinations.map((c) => c.vendorId))]
    const issueDates = [...new Set(combinations.map((c) => c.issueDate))]

    if (agentIds.length === 0 || vendorIds.length === 0 || issueDates.length === 0) return totalsMap

    const results = await db
      .selectFrom('advances')
      .select(['agentid', 'vendor_id', 'issue_date', db.fn.sum('amount').as('total')])
      .where('agentid', 'in', agentIds)
      .where('vendor_id', 'in', vendorIds)
      .where(db.fn('DATE', ['issue_date']), 'in', issueDates)
      .groupBy(['agentid', 'vendor_id', 'issue_date'])
      .execute()

    for (const result of results) {
      const issueDate = result.issue_date.toISOString().split('T')[0]
      const combination = combinations.find(
        (c) =>
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Re-derive the persisted statement totals (paystubs.amount + payroll.amount)
   * for a single (agentid, vendor_id, issue_date) key after an advance mutation.
   *
   * Advances are recorded OUTSIDE the invoice-save flow, so
   * InvoiceRepository.simple.updatePayrollRecords only refreshes these persisted
   * totals at invoice-save time. When an advance is created/updated/deleted against
   * a statement that ALREADY exists, those totals go stale — the summary list reads
   * SUM(paystubs.amount) while the detail view recomputes net pay live, so they
   * would disagree. This closes that gap.
   *
   * No-op when no paystubs row exists yet: the statement has not been generated, and
   * the next invoice-save will pick these advances up (matching invoice-save, which
   * inserts the statement when absent — we never create one from an advance write).
   *
   * The total mirrors InvoiceRepository.simple.updatePayrollRecords /
   * PayrollRepository EXACTLY:
   *   total = SUM(invoices.amount) + SUM(overrides.total)
   *         + SUM(expenses.amount) - SUM(advances.amount)
   * Note the column asymmetry: `invoices.vendor` holds the vendor id AS A STRING,
   * while overrides/expenses/advances/paystubs/payroll key on numeric `vendor_id`.
   * issue_date is matched with DATE() to ignore any time component, exactly as the
   * read paths (getPaystubDetail / the batch total helpers) do; payroll keys on
   * DATE(pay_date). All reads/writes run on the passed transaction so they observe
   * the just-written advance state.
   */
  private async resyncStatementTotals(
    trx: DbOrTrx,
    agentId: number,
    vendorId: number,
    issueDate: string
  ): Promise<void> {
    const issue = dayjs(issueDate, 'YYYY-MM-DD').format('YYYY-MM-DD')

    // Only resync when the statement already exists.
    const existingPaystub = await trx
      .selectFrom('paystubs')
      .select('id')
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(trx.fn('DATE', ['issue_date']), '=', issue)
      .executeTakeFirst()

    if (!existingPaystub) return

    const [salesRow, overridesRow, expensesRow, advancesRow] = await Promise.all([
      trx
        .selectFrom('invoices')
        .select(trx.fn.sum('amount').as('total'))
        .where('agentid', '=', agentId)
        .where('vendor', '=', vendorId.toString())
        .where(trx.fn('DATE', ['issue_date']), '=', issue)
        .executeTakeFirst(),
      trx
        .selectFrom('overrides')
        .select(trx.fn.sum('total').as('total'))
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(trx.fn('DATE', ['issue_date']), '=', issue)
        .executeTakeFirst(),
      trx
        .selectFrom('expenses')
        .select(trx.fn.sum('amount').as('total'))
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(trx.fn('DATE', ['issue_date']), '=', issue)
        .executeTakeFirst(),
      trx
        .selectFrom('advances')
        .select(trx.fn.sum('amount').as('total'))
        .where('agentid', '=', agentId)
        .where('vendor_id', '=', vendorId)
        .where(trx.fn('DATE', ['issue_date']), '=', issue)
        .executeTakeFirst(),
    ])

    const salesTotal = parseFloat(salesRow?.total?.toString() || '0')
    const overridesTotal = parseFloat(overridesRow?.total?.toString() || '0')
    const expensesTotal = parseFloat(expensesRow?.total?.toString() || '0')
    const advancesTotal = parseFloat(advancesRow?.total?.toString() || '0')

    const totalAmount = salesTotal + overridesTotal + expensesTotal - advancesTotal
    const amount = totalAmount.toString()

    await trx
      .updateTable('paystubs')
      .set({ amount, updated_at: new Date() })
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(trx.fn('DATE', ['issue_date']), '=', issue)
      .execute()

    await trx
      .updateTable('payroll')
      .set({ amount, updated_at: new Date() })
      .where('agent_id', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where(trx.fn('DATE', ['pay_date']), '=', issue)
      .execute()
  }

  /** Write an advance_audit row (create/update/delete). */
  private async writeAudit(
    trx: DbOrTrx,
    advanceId: number,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    previous: Partial<{
      amount: number | string
      advance_date: Date | string
      issue_date: Date | string
      wkending: Date | string
      method: string
      notes: string
      agentid: number
      vendor_id: number
    }> | null,
    current: Partial<{
      amount: number | string
      advance_date: Date | string
      issue_date: Date | string
      wkending: Date | string
      method: string
      notes: string
      agentid: number
      vendor_id: number
    }> | null,
    audit: AuditMetadata
  ): Promise<void> {
    await trx
      .insertInto('advance_audit')
      .values({
        advance_id: advanceId,
        action_type: actionType,
        changed_by: audit.changedBy,
        changed_at: new Date(),
        previous_amount: previous?.amount != null ? previous.amount.toString() : null,
        previous_advance_date: previous?.advance_date ? dayjs(previous.advance_date).toDate() : null,
        previous_issue_date: previous?.issue_date ? dayjs(previous.issue_date).toDate() : null,
        previous_wkending: previous?.wkending ? dayjs(previous.wkending).toDate() : null,
        previous_method: previous?.method ?? null,
        previous_notes: previous?.notes ?? null,
        previous_agentid: previous?.agentid ?? null,
        previous_vendor_id: previous?.vendor_id ?? null,
        current_amount: current?.amount != null ? current.amount.toString() : null,
        current_advance_date: current?.advance_date ? dayjs(current.advance_date).toDate() : null,
        current_issue_date: current?.issue_date ? dayjs(current.issue_date).toDate() : null,
        current_wkending: current?.wkending ? dayjs(current.wkending).toDate() : null,
        current_method: current?.method ?? null,
        current_notes: current?.notes ?? null,
        current_agentid: current?.agentid ?? null,
        current_vendor_id: current?.vendor_id ?? null,
        change_reason: audit.reason ?? null,
        ip_address: audit.ipAddress ?? null,
      })
      .execute()
  }

  /** Write access: admin, or manager over one of their direct reports. */
  private assertCanWrite(agentId: number, userContext: UserContext): void {
    if (!userContext.isAdmin && !userContext.isManager) {
      throw new Error('Insufficient permissions')
    }
    if (!userContext.isAdmin && userContext.isManager) {
      if (!userContext.managedEmployeeIds?.includes(agentId)) {
        throw new Error('Access denied: agent not in your direct reports')
      }
    }
  }

  /** Read access: admin, the owning employee, or a manager over the agent. */
  private canRead(agentId: number, userContext: UserContext): boolean {
    if (userContext.isAdmin) return true
    if (userContext.employeeId === agentId) return true
    if (userContext.isManager && userContext.managedEmployeeIds?.includes(agentId)) return true
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): AdvanceRecord {
    return {
      advance_id: row.advance_id,
      agentid: row.agentid,
      vendor_id: row.vendor_id,
      amount: parseFloat(row.amount?.toString() || '0'),
      advance_date: toDateString(row.advance_date),
      issue_date: toDateString(row.issue_date),
      wkending: toDateString(row.wkending),
      method: row.method,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at ? dayjs(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? dayjs(row.updated_at).toISOString() : null,
    }
  }
}

export const advanceRepository = new AdvanceRepository()
