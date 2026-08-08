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

export const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'monthly_weekday'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export interface ScheduledExpenseRecord {
  id: number
  agentid: number
  vendor_id: number
  type: string
  amount: number
  notes: string
  frequency: Frequency
  // Only set when frequency === 'monthly_weekday'; NULL for every other frequency.
  monthly_week: number | null // 1=first, 2=second, 3=third, 4=fourth, 5=last
  monthly_weekday: number | null // 0=Sunday … 6=Saturday (matches JS Date.getDay())
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
  monthlyWeek?: number | null // required when frequency === 'monthly_weekday' (1-5)
  monthlyWeekday?: number | null // required when frequency === 'monthly_weekday' (0-6)
  startDate: string // YYYY-MM-DD
  endDate?: string | null // YYYY-MM-DD
  isActive?: boolean
}

export interface UpdateScheduledExpenseInput {
  type?: string
  amount?: number
  notes?: string
  frequency?: Frequency
  monthlyWeek?: number | null
  monthlyWeekday?: number | null
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
 *  - monthly_weekday: due when the "nth <weekday> of the month" occurrence falls
 *              inside the statement's 7-day window [wkending-6d … wkending] (both
 *              inclusive). monthly_week 1-4 = the nth <weekday>; 5 = the LAST
 *              <weekday> of the month. Because a 7-day window can straddle a month
 *              boundary, the occurrence is computed for EVERY month the window
 *              touches (at most two) and the template is due if ANY of those
 *              occurrences land in the window.
 *
 * start/end gating:
 *  - weekly/biweekly/monthly gate on `wkending` (the statement week-ending): the
 *    materialized expense is dated to the statement week, so start_date/end_date
 *    are compared against wkending.
 *  - monthly_weekday gates on the OCCURRENCE date instead (start_date <= occurrence
 *    AND (end_date IS NULL OR end_date >= occurrence)). The occurrence — not the
 *    week end — is the meaningful calendar event, and it can sit up to 6 days before
 *    wkending, so gating on wkending would (wrongly) accept/reject occurrences that
 *    fall on the far side of a start/end boundary within the same week. This is why
 *    the generic wkending guards below are skipped for monthly_weekday.
 */

/**
 * The nth (1-4) or LAST (5) `weekday` (0=Sun … 6=Sat) of `anchor`'s calendar month.
 * Date-only math via dayjs — no timezone parsing of 'YYYY-MM-DD' through new Date().
 */
function nthWeekdayOfMonth(anchor: dayjs.Dayjs, week: number, weekday: number): dayjs.Dayjs {
  if (week >= 1 && week <= 4) {
    const first = anchor.startOf('month')
    const offset = (weekday - first.day() + 7) % 7
    return first.add(offset + (week - 1) * 7, 'day')
  }
  // week === 5 → last <weekday>: step back from the last day of the month.
  const last = anchor.endOf('month').startOf('day')
  const backOffset = (last.day() - weekday + 7) % 7
  return last.subtract(backOffset, 'day')
}

export function isTemplateDue(
  template: {
    frequency: string
    start_date: Date | string
    end_date: Date | string | null
    monthly_week?: number | null
    monthly_weekday?: number | null
  },
  wkending: string
): boolean {
  const week = dayjs(wkending, 'YYYY-MM-DD').startOf('day')
  const start = dayjs(template.start_date).startOf('day')

  // Generic wkending window guards — applied to every frequency EXCEPT
  // monthly_weekday, which gates on the occurrence date inside its own branch.
  if (template.frequency !== 'monthly_weekday') {
    if (start.isAfter(week)) return false
    if (template.end_date) {
      const end = dayjs(template.end_date).startOf('day')
      if (end.isBefore(week)) return false
    }
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

    case 'monthly_weekday': {
      const mw = template.monthly_week
      const wd = template.monthly_weekday
      if (mw == null || wd == null) return false // malformed template; treat as not due

      const windowStart = week.subtract(6, 'day') // 7-day window, both ends inclusive
      const end = template.end_date ? dayjs(template.end_date).startOf('day') : null

      // Months the window touches (a 7-day window spans at most two months).
      const months = [windowStart]
      if (windowStart.month() !== week.month() || windowStart.year() !== week.year()) {
        months.push(week)
      }

      for (const m of months) {
        const occ = nthWeekdayOfMonth(m, mw, wd)
        if (occ.isBefore(windowStart) || occ.isAfter(week)) continue // not in this week's window
        if (start.isAfter(occ)) continue // start_date > occurrence
        if (end && end.isBefore(occ)) continue // end_date < occurrence
        return true
      }
      return false
    }

    default:
      return false
  }
}

/**
 * Where a template lands NEXT relative to `fromDate`, as a discriminated union
 * the admin UI renders directly. Unlike isTemplateDue() (which answers "is this
 * template due for THIS statement week?"), projectNextDue() answers "when will it
 * apply next?" and needs no statement week to be chosen.
 *
 *  - paused:       is_active = 0. No projection.
 *  - ended:        end_date has passed and no future occurrence remains.
 *  - every_week:   weekly cadence — applies to every statement week (no single date).
 *  - week_window:  biweekly cadence — the next due 7-day block [start … end].
 *  - date:         a single calendar date (monthly anniversary or the nth/last
 *                  weekday-of-month occurrence).
 */
export type NextDue =
  | { kind: 'paused' }
  | { kind: 'ended' }
  | { kind: 'every_week' }
  | { kind: 'week_window'; start: string; end: string } // YYYY-MM-DD, both inclusive
  | { kind: 'date'; date: string } // YYYY-MM-DD

/**
 * Project the NEXT application of `template` on/after `fromDate` (YYYY-MM-DD).
 * Pure + deterministic — date-only dayjs math, never new Date('YYYY-MM-DD').
 * Mirrors the cadence semantics of isTemplateDue() but forward-projects instead
 * of testing a specific statement week.
 */
export function projectNextDue(
  template: {
    frequency: string
    start_date: Date | string
    end_date: Date | string | null
    is_active?: number
    monthly_week?: number | null
    monthly_weekday?: number | null
  },
  fromDate: string
): NextDue {
  if (template.is_active === 0) return { kind: 'paused' }

  const from = dayjs(fromDate, 'YYYY-MM-DD').startOf('day')
  const start = dayjs(template.start_date).startOf('day')
  const end = template.end_date ? dayjs(template.end_date).startOf('day') : null

  // Lower bound for the next occurrence: never before start_date, never before fromDate.
  const lb = start.isAfter(from) ? start : from

  // If the window has fully closed before the lower bound, nothing remains.
  if (end && end.isBefore(lb)) return { kind: 'ended' }

  switch (template.frequency) {
    case 'weekly':
      // Applies every statement week within [start, end]; end/paused handled above.
      return { kind: 'every_week' }

    case 'biweekly': {
      // Due blocks are [start + 14k, +6d] for k = 0, 1, 2 … Find the first block
      // that contains or falls after `lb`.
      let k: number
      if (start.isAfter(from)) {
        k = 0 // the start block is itself in the future
      } else {
        const blockIdx = Math.floor(from.diff(start, 'day') / 14)
        const blockEnd = start.add(blockIdx * 14 + 6, 'day')
        k = blockEnd.isBefore(from) ? blockIdx + 1 : blockIdx
      }
      const winStart = start.add(k * 14, 'day')
      const winEnd = winStart.add(6, 'day')
      if (end && end.isBefore(winStart)) return { kind: 'ended' }
      return { kind: 'week_window', start: winStart.format('YYYY-MM-DD'), end: winEnd.format('YYYY-MM-DD') }
    }

    case 'monthly': {
      // Next clamped anniversary (start's day-of-month) on/after the lower bound.
      const startDay = start.date()
      let month = lb.startOf('month')
      for (let i = 0; i < 600; i++) {
        const day = Math.min(startDay, month.daysInMonth())
        const anniv = month.date(day)
        if (!anniv.isBefore(lb)) {
          if (end && anniv.isAfter(end)) return { kind: 'ended' }
          return { kind: 'date', date: anniv.format('YYYY-MM-DD') }
        }
        month = month.add(1, 'month')
      }
      return { kind: 'ended' }
    }

    case 'monthly_weekday': {
      const mw = template.monthly_week
      const wd = template.monthly_weekday
      if (mw == null || wd == null) return { kind: 'ended' } // malformed; nothing to project

      // Next nth/last <weekday> occurrence on/after the lower bound.
      let month = lb.startOf('month')
      for (let i = 0; i < 600; i++) {
        const occ = nthWeekdayOfMonth(month, mw, wd)
        if (!occ.isBefore(lb)) {
          if (end && occ.isAfter(end)) return { kind: 'ended' }
          return { kind: 'date', date: occ.format('YYYY-MM-DD') }
        }
        month = month.add(1, 'month')
      }
      return { kind: 'ended' }
    }

    default:
      return { kind: 'ended' }
  }
}

/**
 * A template enriched with the joined agent/vendor names, its most recent
 * application (or null), and its projected next occurrence — the admin overview
 * shape returned by getAllTemplates().
 */
export interface ScheduledExpenseTemplateWithMeta extends ScheduledExpenseRecord {
  agent_name: string
  vendor_name: string
  last_applied: { issue_date: string; wkending: string; applied_at: string | null } | null
  next_due: NextDue
}

/** A single materialized application of a template, for the applications history view. */
export interface ScheduledExpenseApplicationRecord {
  id: number
  issue_date: string
  wkending: string
  amount: number
  applied_at: string | null
  applied_by_name: string
}

export class ScheduledExpenseRepository {
  /** Create a recurring template (admin/manager over the agent). */
  async createTemplate(
    input: CreateScheduledExpenseInput,
    userContext: UserContext
  ): Promise<ScheduledExpenseRecord> {
    this.assertCanWrite(input.agentid, userContext)
    this.assertFrequency(input.frequency)
    const { monthlyWeek, monthlyWeekday } = this.resolveMonthlyWeekdayFields(
      input.frequency,
      input.monthlyWeek,
      input.monthlyWeekday
    )

    const result = await db
      .insertInto('scheduled_expenses')
      .values({
        agentid: input.agentid,
        vendor_id: input.vendorId,
        type: input.type,
        amount: input.amount.toFixed(2),
        notes: input.notes ?? '',
        frequency: input.frequency,
        monthly_week: monthlyWeek,
        monthly_weekday: monthlyWeekday,
        start_date: dayjs(input.startDate, 'YYYY-MM-DD').toDate(),
        end_date: input.endDate ? dayjs(input.endDate, 'YYYY-MM-DD').toDate() : null,
        is_active: input.isActive === false ? 0 : 1,
        created_by: userContext.employeeId ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      // Postgres never populates InsertResult.insertId — the generated key has to
      // come back through RETURNING. `scheduled_expenses`' PK is `id`.
      .returning('id')
      .executeTakeFirstOrThrow()

    const id = result.id
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

    // Resolve monthly-weekday fields against the EFFECTIVE (post-update) state so a
    // frequency change to/from monthly_weekday validates and nulls out correctly.
    const effectiveFrequency = (input.frequency ?? existing.frequency) as Frequency
    const effectiveWeek =
      input.monthlyWeek !== undefined ? input.monthlyWeek : (existing.monthly_week ?? null)
    const effectiveWeekday =
      input.monthlyWeekday !== undefined ? input.monthlyWeekday : (existing.monthly_weekday ?? null)
    const { monthlyWeek, monthlyWeekday } = this.resolveMonthlyWeekdayFields(
      effectiveFrequency,
      effectiveWeek,
      effectiveWeekday
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date() }
    if (input.type !== undefined) updates.type = input.type
    if (input.amount !== undefined) updates.amount = input.amount.toFixed(2)
    if (input.notes !== undefined) updates.notes = input.notes
    if (input.frequency !== undefined) updates.frequency = input.frequency
    // Always (re)write the monthly-weekday columns from the resolved effective state:
    // this guarantees they are NULL for non-monthly_weekday frequencies.
    updates.monthly_week = monthlyWeek
    updates.monthly_weekday = monthlyWeekday
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

    // `created_at` is nullable. MySQL sorts NULLs last on DESC; Postgres sorts them
    // first. Pin `nulls last` so a template with no created_at keeps sorting to the
    // bottom of the agent's list instead of jumping to the top.
    const rows = await query.orderBy('created_at', (ob) => ob.desc().nullsLast()).execute()
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
    // The lower bound for end_date is the START of the 7-day statement window
    // (wkending-6d), not wkending itself: a monthly_weekday occurrence can land up
    // to 6 days before wkending, so an end_date inside the window must survive the
    // pre-filter. isTemplateDue() then applies the authoritative, occurrence-based
    // gate — this SQL bound only trims rows and never over-excludes.
    const windowStart = dayjs(wkending, 'YYYY-MM-DD').subtract(6, 'day').format('YYYY-MM-DD')
    const rows: TemplateRow[] = await db
      .selectFrom('scheduled_expenses')
      .selectAll()
      .where('agentid', '=', agentId)
      .where('vendor_id', '=', vendorId)
      .where('is_active', '=', 1)
      .where(db.fn('DATE', ['start_date']), '<=', wkending)
      .where(({ eb, or }) =>
        or([eb('end_date', 'is', null), eb(db.fn('DATE', ['end_date']), '>=', windowStart)])
      )
      .execute()

    return rows.filter((r) => isTemplateDue(r, wkending)).map((r) => this.mapRow(r))
  }

  /**
   * Admin overview: ALL templates (admin) or those for the manager's direct
   * reports (manager). Plain employees are denied. Each row is enriched with the
   * agent/vendor names, the most recent application, and the projected next
   * occurrence (relative to `today`). Ordered active-first, then agent name.
   */
  async getAllTemplates(
    userContext: UserContext,
    opts: { activeOnly?: boolean; today?: string } = {}
  ): Promise<ScheduledExpenseTemplateWithMeta[]> {
    if (!userContext.isAdmin && !userContext.isManager) {
      throw new Error('Insufficient permissions')
    }

    let query = db
      .selectFrom('scheduled_expenses as se')
      .innerJoin('employees as e', 'e.id', 'se.agentid')
      .leftJoin('vendors as v', 'v.id', 'se.vendor_id')
      .selectAll('se')
      .select(['e.name as agent_name', 'v.name as vendor_name'])

    // Managers are scoped to their direct reports; admins see everything.
    if (!userContext.isAdmin) {
      const managed = userContext.managedEmployeeIds ?? []
      if (managed.length === 0) return []
      query = query.where('se.agentid', 'in', managed)
    }

    if (opts.activeOnly) query = query.where('se.is_active', '=', 1)

    const rows: TemplateRow[] = await query
      .orderBy('se.is_active', 'desc')
      .orderBy('e.name', 'asc')
      .execute()

    if (rows.length === 0) return []

    // Latest application per template — one grouped query, merged in JS to avoid
    // a correlated LEFT JOIN. Rows arrive newest-first, so the first hit per
    // template id is the latest.
    const templateIds = rows.map((r) => r.id)
    const appRows: TemplateRow[] = await db
      .selectFrom('scheduled_expense_applications')
      .select(['scheduled_expense_id', 'issue_date', 'wkending', 'created_at'])
      .where('scheduled_expense_id', 'in', templateIds)
      .orderBy('issue_date', 'desc')
      .execute()

    const latestByTemplate = new Map<number, TemplateRow>()
    for (const a of appRows) {
      if (!latestByTemplate.has(a.scheduled_expense_id)) latestByTemplate.set(a.scheduled_expense_id, a)
    }

    const today = opts.today ?? dayjs().format('YYYY-MM-DD')

    return rows.map((row) => {
      const base = this.mapRow(row)
      const latest = latestByTemplate.get(row.id)
      return {
        ...base,
        agent_name: row.agent_name ?? '',
        vendor_name: row.vendor_name ?? '',
        last_applied: latest
          ? {
              issue_date: dayjs(latest.issue_date).format('YYYY-MM-DD'),
              wkending: dayjs(latest.wkending).format('YYYY-MM-DD'),
              applied_at: latest.created_at ? dayjs(latest.created_at).toISOString() : null,
            }
          : null,
        next_due: projectNextDue(row, today),
      }
    })
  }

  /**
   * Application history for a single template (read RBAC identical to
   * getTemplateById). Rows newest-first, joined with the applying admin's name.
   */
  async getApplications(
    templateId: number,
    userContext: UserContext
  ): Promise<ScheduledExpenseApplicationRecord[]> {
    const template = await db
      .selectFrom('scheduled_expenses')
      .select('agentid')
      .where('id', '=', templateId)
      .executeTakeFirst()

    if (!template) throw new Error('Scheduled expense not found')
    if (!this.canRead(template.agentid, userContext)) {
      throw new Error('Access denied: agent not in your direct reports')
    }

    const rows: TemplateRow[] = await db
      .selectFrom('scheduled_expense_applications as a')
      .leftJoin('employees as e', 'e.id', 'a.applied_by')
      .select([
        'a.id',
        'a.issue_date',
        'a.wkending',
        'a.amount',
        'a.created_at',
        'e.name as applied_by_name',
      ])
      .where('a.scheduled_expense_id', '=', templateId)
      .orderBy('a.issue_date', 'desc')
      .execute()

    return rows.map((r) => ({
      id: r.id,
      issue_date: dayjs(r.issue_date).format('YYYY-MM-DD'),
      wkending: dayjs(r.wkending).format('YYYY-MM-DD'),
      amount: parseFloat(r.amount?.toString() || '0'),
      applied_at: r.created_at ? dayjs(r.created_at).toISOString() : null,
      applied_by_name: r.applied_by_name ?? '',
    }))
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

  /**
   * Validate and normalize the monthly-weekday columns against the frequency.
   * - frequency === 'monthly_weekday': monthly_week (1-5) and monthly_weekday (0-6)
   *   are REQUIRED and range-checked.
   * - any other frequency: both must be absent/null — supplying them is rejected —
   *   and they are stored as NULL.
   */
  private resolveMonthlyWeekdayFields(
    frequency: string,
    monthlyWeek: number | null | undefined,
    monthlyWeekday: number | null | undefined
  ): { monthlyWeek: number | null; monthlyWeekday: number | null } {
    if (frequency === 'monthly_weekday') {
      if (monthlyWeek == null || monthlyWeekday == null) {
        throw new Error(
          'Invalid monthly_weekday: monthlyWeek (1-5) and monthlyWeekday (0-6) are required'
        )
      }
      if (!Number.isInteger(monthlyWeek) || monthlyWeek < 1 || monthlyWeek > 5) {
        throw new Error('Invalid monthly_weekday: monthlyWeek must be an integer 1-5')
      }
      if (!Number.isInteger(monthlyWeekday) || monthlyWeekday < 0 || monthlyWeekday > 6) {
        throw new Error('Invalid monthly_weekday: monthlyWeekday must be an integer 0-6')
      }
      return { monthlyWeek, monthlyWeekday }
    }

    if (monthlyWeek != null || monthlyWeekday != null) {
      throw new Error(
        `Invalid monthly_weekday: monthlyWeek/monthlyWeekday are only allowed when frequency is 'monthly_weekday'`
      )
    }
    return { monthlyWeek: null, monthlyWeekday: null }
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
      monthly_week: row.monthly_week ?? null,
      monthly_weekday: row.monthly_weekday ?? null,
      start_date: dayjs(row.start_date).format('YYYY-MM-DD'),
      end_date: row.end_date ? dayjs(row.end_date).format('YYYY-MM-DD') : null,
      is_active: row.is_active,
      created_by: row.created_by,
    }
  }
}

export const scheduledExpenseRepository = new ScheduledExpenseRepository()
