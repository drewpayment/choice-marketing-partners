import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { logger } from '@/lib/utils/logger'
import type { UserContext } from '@/lib/auth/types'

/**
 * Recurring expense templates. A template describes an expense (type/amount/notes)
 * that should recur on a cadence (weekly/biweekly/monthly) for an agent+vendor.
 * amount is SIGNED — some recurring items are deductions (negative).
 *
 * Wave 2's statement builder calls getDueTemplates() to materialize the concrete
 * `expenses` rows for a given statement week.
 */

export const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export interface ScheduledExpenseRecord {
  id: number
  agentid: number
  vendor_id: number
  type: string
  amount: number
  notes: string
  frequency: Frequency
  start_date: string // YYYY-MM-DD
  end_date: string | null // YYYY-MM-DD
  is_active: number
  created_by: number
}

export interface CreateScheduledExpenseInput {
  agentid: number
  vendorId: number
  type: string
  amount: number
  notes?: string
  frequency: Frequency
  startDate: string // YYYY-MM-DD
  endDate?: string | null // YYYY-MM-DD
  isActive?: boolean
}

export interface UpdateScheduledExpenseInput {
  type?: string
  amount?: number
  notes?: string
  frequency?: Frequency
  startDate?: string
  endDate?: string | null
  isActive?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateRow = any

/**
 * Cadence rule — deterministic, keyed off `wkending` (the statement week-ending date):
 *
 *  - weekly:   due every statement week within [start_date, end_date].
 *  - biweekly: due on weeks where floor(daysBetween(start_date, wkending) / 7) is EVEN.
 *              (week 0 = the start week is due, week 1 skipped, week 2 due, ...)
 *  - monthly:  due on the FIRST statement week of wkending's calendar month whose
 *              wkending falls on/after the monthly anniversary of start_date.
 *              anniversary = start_date's day-of-month, clamped to the length of
 *              wkending's month (e.g. a start day of 31 becomes Feb 28/29).
 *              Concretely: wkending >= anniversary AND (wkending - 7d) < anniversary.
 *              This selects exactly one week per month. Caveat: if the anniversary
 *              lands after the last statement week of its month, that month is
 *              skipped (kept simple on purpose).
 *
 * All cadences additionally require: start_date <= wkending AND
 * (end_date IS NULL OR end_date >= wkending).
 */
export function isTemplateDue(
  template: { frequency: string; start_date: Date | string; end_date: Date | string | null },
  wkending: string
): boolean {
  const week = dayjs(wkending, 'YYYY-MM-DD').startOf('day')
  const start = dayjs(template.start_date).startOf('day')

  // Window guards
  if (start.isAfter(week)) return false
  if (template.end_date) {
    const end = dayjs(template.end_date).startOf('day')
    if (end.isBefore(week)) return false
  }

  switch (template.frequency) {
    case 'weekly':
      return true

    case 'biweekly': {
      const days = week.diff(start, 'day')
      const weeks = Math.floor(days / 7)
      return weeks % 2 === 0
    }

    case 'monthly': {
      const daysInMonth = week.daysInMonth()
      const targetDay = Math.min(start.date(), daysInMonth)
      const anniversary = week.date(targetDay)
      const prevWeek = week.subtract(7, 'day')
      return !week.isBefore(anniversary) && prevWeek.isBefore(anniversary)
    }

    default:
      return false
  }
}

export class ScheduledExpenseRepository {
  /** Create a recurring template (admin/manager over the agent). */
  async createTemplate(
    input: CreateScheduledExpenseInput,
    userContext: UserContext
  ): Promise<ScheduledExpenseRecord> {
    this.assertCanWrite(input.agentid, userContext)
    this.assertFrequency(input.frequency)

    const result = await db
      .insertInto('scheduled_expenses')
      .values({
        agentid: input.agentid,
        vendor_id: input.vendorId,
        type: input.type,
        amount: input.amount.toFixed(2),
        notes: input.notes ?? '',
        frequency: input.frequency,
        start_date: dayjs(input.startDate, 'YYYY-MM-DD').toDate(),
        end_date: input.endDate ? dayjs(input.endDate, 'YYYY-MM-DD').toDate() : null,
        is_active: input.isActive === false ? 0 : 1,
        created_by: userContext.employeeId ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .executeTakeFirst()

    const id = Number(result.insertId)
    logger.log('✅ Created scheduled expense template', id)
    const created = await this.getTemplateById(id, userContext)
    if (!created) throw new Error('Failed to load created template')
    return created
  }

  /** Update a template (admin/manager over the agent). */
  async updateTemplate(
    id: number,
    input: UpdateScheduledExpenseInput,
    userContext: UserContext
  ): Promise<ScheduledExpenseRecord> {
    const existing = await db
      .selectFrom('scheduled_expenses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error('Scheduled expense not found')
    this.assertCanWrite(existing.agentid, userContext)

    if (input.frequency !== undefined) this.assertFrequency(input.frequency)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date() }
    if (input.type !== undefined) updates.type = input.type
    if (input.amount !== undefined) updates.amount = input.amount.toFixed(2)
    if (input.notes !== undefined) updates.notes = input.notes
    if (input.frequency !== undefined) updates.frequency = input.frequency
    if (input.startDate !== undefined) updates.start_date = dayjs(input.startDate, 'YYYY-MM-DD').toDate()
    if (input.endDate !== undefined) updates.end_date = input.endDate ? dayjs(input.endDate, 'YYYY-MM-DD').toDate() : null
    if (input.isActive !== undefined) updates.is_active = input.isActive ? 1 : 0

    await db.updateTable('scheduled_expenses').set(updates).where('id', '=', id).execute()

    logger.log('✅ Updated scheduled expense template', id)
    const updated = await this.getTemplateById(id, userContext)
    if (!updated) throw new Error('Failed to load updated template')
    return updated
  }

  /** Delete a template (admin/manager over the agent). */
  async deleteTemplate(id: number, userContext: UserContext): Promise<{ success: boolean }> {
    const existing = await db
      .selectFrom('scheduled_expenses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error('Scheduled expense not found')
    this.assertCanWrite(existing.agentid, userContext)

    await db.deleteFrom('scheduled_expenses').where('id', '=', id).execute()
    logger.log('✅ Deleted scheduled expense template', id)
    return { success: true }
  }

  /** Fetch a single template with read RBAC applied. */
  async getTemplateById(id: number, userContext: UserContext): Promise<ScheduledExpenseRecord | null> {
    const row = await db
      .selectFrom('scheduled_expenses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) return null
    if (!this.canRead(row.agentid, userContext)) {
      throw new Error('Access denied: agent not in your direct reports')
    }
    return this.mapRow(row)
  }

  /** List templates for an agent (read RBAC applied). */
  async getTemplatesByAgent(
    agentId: number,
    userContext: UserContext,
    opts: { vendorId?: number; activeOnly?: boolean } = {}
  ): Promise<ScheduledExpenseRecord[]> {
    if (!this.canRead(agentId, userContext)) {
      throw new Error('Access denied: agent not in your direct reports')
    }

    let query = db.selectFrom('scheduled_expenses').selectAll().where('agentid', '=', agentId)
    if (opts.vendorId) query = query.where('vendor_id', '=', opts.vendorId)
    if (opts.activeOnly) query = query.where('is_active', '=', 1)

    const rows = await query.orderBy('created_at', 'desc').execute()
    return rows.map((r) => this.mapRow(r))
  }

  /**
   * Return active templates for (agentid, vendorId) whose cadence lands in the
   * statement week ending `wkending`. Admin/manager only (statement building).
   */
  async getDueTemplates(
    agentId: number,
    vendorId: number,
    wkending: string,
    userContext: UserContext
  ): Promise<ScheduledExpenseRecord[]> {
    this.assertCanWrite(agentId, userContext)

    // Pre-filter in SQL by the window + active flag; final cadence check in JS.
    const rows: TemplateRow[] = await db
      .selectFrom('scheduled_expenses')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where('is_active', '=', 1)
      .where(db.fn('DATE', ['start_date']), '<=', wkending)
      .where(({ eb, or }) =>
        or([eb('end_date', 'is', null), eb(db.fn('DATE', ['end_date']), '>=', wkending)])
      )
      .execute()

    return rows.filter((r) => isTemplateDue(r, wkending)).map((r) => this.mapRow(r))
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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

  private canRead(agentId: number, userContext: UserContext): boolean {
    if (userContext.isAdmin) return true
    if (userContext.employeeId === agentId) return true
    if (userContext.isManager && userContext.managedEmployeeIds?.includes(agentId)) return true
    return false
  }

  private assertFrequency(frequency: string): void {
    if (!FREQUENCIES.includes(frequency as Frequency)) {
      throw new Error(`Invalid frequency: ${frequency}. Must be one of ${FREQUENCIES.join(', ')}`)
    }
  }

  private mapRow(row: TemplateRow): ScheduledExpenseRecord {
    return {
      id: row.id,
      agentid: row.agentid,
      vendor_id: row.vendor_id,
      type: row.type,
      amount: parseFloat(row.amount?.toString() || '0'),
      notes: row.notes,
      frequency: row.frequency,
      start_date: dayjs(row.start_date).format('YYYY-MM-DD'),
      end_date: row.end_date ? dayjs(row.end_date).format('YYYY-MM-DD') : null,
      is_active: row.is_active,
      created_by: row.created_by,
    }
  }
}

export const scheduledExpenseRepository = new ScheduledExpenseRepository()
