import { db } from '@/lib/database/client'
import type { UserContext } from '@/lib/auth/types'
import type { Transaction } from 'kysely'
import type { DB } from '@/lib/database/types'

export type PunchStatus = 'pending' | 'approved' | 'declined' | 'auto_rejected'

export interface DailyPayEnrollmentRow {
  id: number
  employeeId: number
  employeeName: string
  employeeEmail: string
  vendorId: number
  vendorName: string
  dailyRate: number
  isActive: boolean
  lastPunchAt: Date | null
  totalPunches: number
  createdAt: Date | null
  updatedAt: Date | null
}

export interface PunchRow {
  id: number
  employeeId: number
  employeeName: string
  vendorId: number
  vendorName: string
  punchedAt: Date
  workDate: string
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  status: PunchStatus
  decidedBy: number | null
  decidedByName: string | null
  decidedAt: Date | null
  declineReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date | null
  amount: number | null
  payRecordReversedAt: Date | null
}

export interface PunchFilters {
  status?: PunchStatus | 'all'
  vendorId?: number
  employeeId?: number
  fromDate?: string
  toDate?: string
  search?: string
  page?: number
  limit?: number
}

export interface PunchPage {
  punches: PunchRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  counts: { pending: number; approved: number; declined: number; auto_rejected: number }
}

export interface DailyPaySettingsRow {
  id: number
  isAutoCutoffEnabled: boolean
  cutoffDayOfWeek: number
  cutoffTimeLocal: string
  cutoffTimezone: string
  updatedBy: number | null
  updatedAt: Date
}

export interface CreatePunchInput {
  vendorId: number
  latitude: number
  longitude: number
  accuracyMeters: number
  ipAddress?: string | null
  userAgent?: string | null
}

export interface UpsertEnrollmentInput {
  employeeId: number
  vendorId: number
  dailyRate: number
  isActive?: boolean
}

export interface DailyPayLineItem {
  id: number
  punchId: number
  workDate: string
  punchedAt: Date | null
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  description: string
  amount: number
  createdBy: number | null
  createdByName: string | null
  createdAt: Date | null
}

export interface DailyPayForPaystub {
  totalAmount: number
  recordCount: number
  records: DailyPayLineItem[]
}

export class ApprovalRequiresConfirmationError extends Error {
  existingPunchId: number
  constructor(existingPunchId: number) {
    super('Another approved punch already exists on this work date')
    this.name = 'ApprovalRequiresConfirmationError'
    this.existingPunchId = existingPunchId
  }
}

export class PaystubAlreadyPaidError extends Error {
  constructor() {
    super('Cannot reverse — paystub is already paid')
    this.name = 'PaystubAlreadyPaidError'
  }
}

// 6 = Saturday. Verified against existing paystubs.weekend_date / invoices.wkending /
// overrides.wkending — Saturday is the dominant week-ending in the data; the few
// non-Saturday rows are off-cycle bonus paystubs, not weekly pay periods.
const WEEK_END_DAY = 6

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  return parseFloat(String(value)) || 0
}

/**
 * Convert a 'YYYY-MM-DD' string to a JS Date suitable for binding to a MySQL DATE column.
 *
 * mysql2 formats Date bindings using LOCAL time. `new Date('YYYY-MM-DD')` creates a UTC-midnight
 * Date, which mysql2 converts to the previous day in any UTC-offset-negative timezone (e.g. EDT
 * shifts 2026-04-01T00:00:00Z to "2026-03-31"). Constructing via `new Date(y, m, d)` produces
 * local-midnight, which round-trips cleanly through mysql2 in any server timezone.
 */
export function dateOnlyToDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Extract a 'YYYY-MM-DD' string from whatever mysql2 returned for a DATE column.
 * mysql2 with dateStrings:false returns local-midnight Dates, so we use local getters
 * to symmetrically inverse `dateOnlyToDate` above.
 */
export function dateOnlyFromDb(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Compute the wkending (Saturday) for a given work date string, matching the existing paystub convention. */
export function wkendingFor(workDate: string): string {
  const d = dateOnlyToDate(workDate)
  const dow = d.getDay() // 0=Sun..6=Sat (local)
  const daysUntilEnd = (WEEK_END_DAY - dow + 7) % 7
  d.setDate(d.getDate() + daysUntilEnd)
  return dateOnlyFromDb(d)
}

/**
 * Resolve a work_date in the canonical timezone for a given UTC instant.
 * Returns 'YYYY-MM-DD' string.
 */
export function workDateInTimezone(instant: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(instant)
}

export class DailyPayRepository {
  async getSettings(): Promise<DailyPaySettingsRow> {
    const row = await db
      .selectFrom('daily_pay_settings')
      .selectAll()
      .orderBy('id', 'asc')
      .limit(1)
      .executeTakeFirst()

    if (!row) {
      throw new Error('daily_pay_settings is missing — migration may not have applied seed row')
    }
    return {
      id: Number(row.id),
      isAutoCutoffEnabled: Boolean(row.is_auto_cutoff_enabled),
      cutoffDayOfWeek: Number(row.cutoff_day_of_week),
      cutoffTimeLocal: String(row.cutoff_time_local),
      cutoffTimezone: String(row.cutoff_timezone),
      updatedBy: row.updated_by ?? null,
      updatedAt: row.updated_at as Date,
    }
  }

  async updateSettings(
    input: Partial<Omit<DailyPaySettingsRow, 'id' | 'updatedAt' | 'updatedBy'>>,
    ctx: UserContext,
  ): Promise<DailyPaySettingsRow> {
    if (!ctx.isAdmin) throw new Error('Admin access required')

    const existing = await this.getSettings()
    await db
      .updateTable('daily_pay_settings')
      .set({
        is_auto_cutoff_enabled:
          input.isAutoCutoffEnabled !== undefined ? (input.isAutoCutoffEnabled ? 1 : 0) : undefined,
        cutoff_day_of_week: input.cutoffDayOfWeek,
        cutoff_time_local: input.cutoffTimeLocal,
        cutoff_timezone: input.cutoffTimezone,
        updated_by: ctx.employeeId ?? null,
      })
      .where('id', '=', existing.id)
      .execute()

    return this.getSettings()
  }

  async getEnrollmentsForEmployee(
    employeeId: number,
    ctx: UserContext,
  ): Promise<DailyPayEnrollmentRow[]> {
    this.assertCanReadEmployee(employeeId, ctx)

    const rows = await db
      .selectFrom('daily_pay_enrollments as e')
      .innerJoin('employees as emp', 'emp.id', 'e.employee_id')
      .innerJoin('vendors as v', 'v.id', 'e.vendor_id')
      .select([
        'e.id',
        'e.employee_id',
        'emp.name as employee_name',
        'emp.email as employee_email',
        'e.vendor_id',
        'v.name as vendor_name',
        'e.daily_rate',
        'e.is_active',
        'e.created_at',
        'e.updated_at',
      ])
      .where('e.employee_id', '=', employeeId)
      .orderBy('e.is_active', 'desc')
      .orderBy('v.name', 'asc')
      .execute()

    const stats = await this.getEnrollmentStats(rows.map((r) => r.id))
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeEmail: r.employee_email,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      dailyRate: toNumber(r.daily_rate),
      isActive: Boolean(r.is_active),
      lastPunchAt: stats.get(r.id)?.lastPunchAt ?? null,
      totalPunches: stats.get(r.id)?.totalPunches ?? 0,
      createdAt: r.created_at as Date | null,
      updatedAt: r.updated_at as Date | null,
    }))
  }

  async listEnrollments(
    filters: { search?: string; status?: 'active' | 'inactive' | 'all'; vendorId?: number },
    ctx: UserContext,
  ): Promise<DailyPayEnrollmentRow[]> {
    if (!ctx.isAdmin) throw new Error('Admin access required')

    let q = db
      .selectFrom('daily_pay_enrollments as e')
      .innerJoin('employees as emp', 'emp.id', 'e.employee_id')
      .innerJoin('vendors as v', 'v.id', 'e.vendor_id')
      .select([
        'e.id',
        'e.employee_id',
        'emp.name as employee_name',
        'emp.email as employee_email',
        'e.vendor_id',
        'v.name as vendor_name',
        'e.daily_rate',
        'e.is_active',
        'e.created_at',
        'e.updated_at',
      ])

    if (filters.status === 'active') q = q.where('e.is_active', '=', 1)
    if (filters.status === 'inactive') q = q.where('e.is_active', '=', 0)
    if (filters.vendorId) q = q.where('e.vendor_id', '=', filters.vendorId)
    if (filters.search) {
      const s = `%${filters.search}%`
      q = q.where((eb) =>
        eb.or([eb('emp.name', 'like', s), eb('emp.email', 'like', s), eb('v.name', 'like', s)]),
      )
    }

    const rows = await q.orderBy('emp.name', 'asc').orderBy('v.name', 'asc').execute()
    const stats = await this.getEnrollmentStats(rows.map((r) => r.id))
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeEmail: r.employee_email,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      dailyRate: toNumber(r.daily_rate),
      isActive: Boolean(r.is_active),
      lastPunchAt: stats.get(r.id)?.lastPunchAt ?? null,
      totalPunches: stats.get(r.id)?.totalPunches ?? 0,
      createdAt: r.created_at as Date | null,
      updatedAt: r.updated_at as Date | null,
    }))
  }

  async upsertEnrollment(input: UpsertEnrollmentInput, ctx: UserContext): Promise<number> {
    if (!ctx.isAdmin) throw new Error('Admin access required')
    if (input.dailyRate < 0) throw new Error('Daily rate must be non-negative')

    const existing = await db
      .selectFrom('daily_pay_enrollments')
      .select(['id'])
      .where('employee_id', '=', input.employeeId)
      .where('vendor_id', '=', input.vendorId)
      .executeTakeFirst()

    if (existing) {
      await db
        .updateTable('daily_pay_enrollments')
        .set({
          daily_rate: String(input.dailyRate),
          is_active: input.isActive === undefined ? undefined : input.isActive ? 1 : 0,
        })
        .where('id', '=', existing.id)
        .execute()
      return existing.id
    }

    const result = await db
      .insertInto('daily_pay_enrollments')
      .values({
        employee_id: input.employeeId,
        vendor_id: input.vendorId,
        daily_rate: String(input.dailyRate),
        is_active: input.isActive === false ? 0 : 1,
        created_by: ctx.employeeId ?? null,
      })
      .executeTakeFirst()
    return Number(result.insertId)
  }

  async deactivateEnrollment(id: number, ctx: UserContext): Promise<void> {
    if (!ctx.isAdmin) throw new Error('Admin access required')
    await db.updateTable('daily_pay_enrollments').set({ is_active: 0 }).where('id', '=', id).execute()
  }

  async createPunch(
    input: CreatePunchInput,
    ctx: UserContext,
  ): Promise<{ id: number; workDate: string }> {
    if (!ctx.employeeId) throw new Error('Authentication required')

    const enrollment = await db
      .selectFrom('daily_pay_enrollments')
      .select(['id'])
      .where('employee_id', '=', ctx.employeeId)
      .where('vendor_id', '=', input.vendorId)
      .where('is_active', '=', 1)
      .executeTakeFirst()
    if (!enrollment) throw new Error('Not enrolled in daily-pay for this vendor')

    const settings = await this.getSettings()
    const now = new Date()

    const recent = await db
      .selectFrom('daily_punch_records')
      .select(['id', 'punched_at'])
      .where('employee_id', '=', ctx.employeeId)
      .where('punched_at', '>=', new Date(now.getTime() - 30_000))
      .orderBy('punched_at', 'desc')
      .limit(1)
      .executeTakeFirst()
    if (recent) {
      return { id: Number(recent.id), workDate: workDateInTimezone(now, settings.cutoffTimezone) }
    }

    const workDate = workDateInTimezone(now, settings.cutoffTimezone)

    const result = await db
      .insertInto('daily_punch_records')
      .values({
        employee_id: ctx.employeeId,
        vendor_id: input.vendorId,
        punched_at: now,
        work_date: dateOnlyToDate(workDate),
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        accuracy_meters: input.accuracyMeters,
        status: 'pending',
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      })
      .executeTakeFirst()

    return { id: Number(result.insertId), workDate }
  }

  async getTodayPunches(ctx: UserContext): Promise<PunchRow[]> {
    if (!ctx.employeeId) throw new Error('Authentication required')
    const settings = await this.getSettings()
    const today = workDateInTimezone(new Date(), settings.cutoffTimezone)
    return this.queryPunches({ employeeId: ctx.employeeId, fromDate: today, toDate: today, status: 'all' }, ctx, false)
  }

  async getRecentPunchesForEmployee(employeeId: number, limit = 10, ctx: UserContext): Promise<PunchRow[]> {
    this.assertCanReadEmployee(employeeId, ctx)
    return this.queryPunches({ employeeId, status: 'all', limit }, ctx, false)
  }

  async getPunches(filters: PunchFilters, ctx: UserContext): Promise<PunchPage> {
    if (!ctx.isAdmin) throw new Error('Admin access required')

    const page = filters.page ?? 1
    const limit = filters.limit ?? 200
    const punches = await this.queryPunches(filters, ctx, true)

    const counts = await db
      .selectFrom('daily_punch_records')
      .select(['status', db.fn.countAll().as('c')])
      .$if(!!filters.fromDate, (q) => q.where('work_date', '>=', dateOnlyToDate(filters.fromDate!)))
      .$if(!!filters.toDate, (q) => q.where('work_date', '<=', dateOnlyToDate(filters.toDate!)))
      .groupBy('status')
      .execute()

    const countsObj = { pending: 0, approved: 0, declined: 0, auto_rejected: 0 }
    for (const c of counts) {
      const k = c.status as PunchStatus
      if (k in countsObj) countsObj[k] = Number(c.c)
    }

    return {
      punches,
      total: punches.length,
      page,
      limit,
      totalPages: 1,
      counts: countsObj,
    }
  }

  async getPunchById(id: number, ctx: UserContext): Promise<PunchRow | null> {
    if (!ctx.isAdmin) throw new Error('Admin access required')
    const list = await this.queryPunches({ status: 'all' }, ctx, true, id)
    return list[0] ?? null
  }

  async approvePunch(
    id: number,
    opts: { confirmDouble?: boolean },
    ctx: UserContext,
  ): Promise<{ payRecordId: number; amount: number }> {
    if (!ctx.isAdmin) throw new Error('Admin access required')

    return await db.transaction().execute(async (trx) => {
      const punch = await trx
        .selectFrom('daily_punch_records')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()
      if (!punch) throw new Error('Punch not found')
      if (punch.status !== 'pending') throw new Error(`Punch is already ${punch.status}`)

      const enrollment = await trx
        .selectFrom('daily_pay_enrollments')
        .select(['daily_rate'])
        .where('employee_id', '=', punch.employee_id)
        .where('vendor_id', '=', punch.vendor_id)
        .where('is_active', '=', 1)
        .executeTakeFirst()
      if (!enrollment) throw new Error('No active enrollment — cannot determine daily rate')
      const amount = toNumber(enrollment.daily_rate)

      if (!opts.confirmDouble) {
        const sameDayWorkDate = dateOnlyFromDb(punch.work_date as Date | string | null)
        const sameDay = await trx
          .selectFrom('daily_punch_records as p')
          .innerJoin('daily_pay_records as r', 'r.punch_id', 'p.id')
          .select(['p.id'])
          .where('p.employee_id', '=', punch.employee_id)
          .where('p.work_date', '=', dateOnlyToDate(sameDayWorkDate))
          .where('p.status', '=', 'approved')
          .where('r.reversed_at', 'is', null)
          .where('p.id', '!=', id)
          .executeTakeFirst()
        if (sameDay) throw new ApprovalRequiresConfirmationError(Number(sameDay.id))
      }

      const punchWorkDateStr = dateOnlyFromDb(punch.work_date as Date | string | null)
      const wkeStr = wkendingFor(punchWorkDateStr)

      const insertResult = await trx
        .insertInto('daily_pay_records')
        .values({
          punch_id: id,
          employee_id: punch.employee_id,
          vendor_id: punch.vendor_id,
          work_date: dateOnlyToDate(punchWorkDateStr),
          wkending: dateOnlyToDate(wkeStr),
          amount: String(amount),
          description: 'Daily incentive',
          created_by: ctx.employeeId ?? null,
        })
        .executeTakeFirst()

      await trx
        .updateTable('daily_punch_records')
        .set({
          status: 'approved',
          decided_by: ctx.employeeId ?? null,
          decided_at: new Date(),
        })
        .where('id', '=', id)
        .execute()

      return { payRecordId: Number(insertResult.insertId), amount }
    })
  }

  async declinePunch(id: number, opts: { reason?: string | null }, ctx: UserContext): Promise<void> {
    if (!ctx.isAdmin) throw new Error('Admin access required')

    const punch = await db
      .selectFrom('daily_punch_records')
      .select(['status'])
      .where('id', '=', id)
      .executeTakeFirst()
    if (!punch) throw new Error('Punch not found')
    if (punch.status !== 'pending') throw new Error(`Punch is already ${punch.status}`)

    await db
      .updateTable('daily_punch_records')
      .set({
        status: 'declined',
        decided_by: ctx.employeeId ?? null,
        decided_at: new Date(),
        decline_reason: opts.reason ?? null,
      })
      .where('id', '=', id)
      .execute()
  }

  async reversePunch(id: number, ctx: UserContext): Promise<void> {
    if (!ctx.isAdmin) throw new Error('Admin access required')

    return await db.transaction().execute(async (trx) => {
      const payRecord = await trx
        .selectFrom('daily_pay_records')
        .selectAll()
        .where('punch_id', '=', id)
        .where('reversed_at', 'is', null)
        .executeTakeFirst()
      if (!payRecord) throw new Error('No active pay record for this punch — nothing to reverse')

      const matchingPaystub = await trx
        .selectFrom('paystubs')
        .select(['issue_date'])
        .where('agent_id', '=', payRecord.employee_id)
        .where('vendor_id', '=', payRecord.vendor_id)
        .where('weekend_date', '=', payRecord.wkending)
        .executeTakeFirst()
      if (matchingPaystub) {
        const paid = await trx
          .selectFrom('payroll')
          .select(['is_paid'])
          .where('agent_id', '=', payRecord.employee_id)
          .where('vendor_id', '=', payRecord.vendor_id)
          .where(db.fn('DATE', ['pay_date']), '=', dateOnlyFromDb(matchingPaystub.issue_date as Date))
          .executeTakeFirst()
        if (paid?.is_paid === 1) throw new PaystubAlreadyPaidError()
      }

      await trx
        .updateTable('daily_pay_records')
        .set({ reversed_at: new Date(), reversed_by: ctx.employeeId ?? null })
        .where('id', '=', payRecord.id)
        .execute()

      await trx
        .updateTable('daily_punch_records')
        .set({
          status: 'declined',
          decline_reason: 'reversed',
          decided_by: ctx.employeeId ?? null,
          decided_at: new Date(),
        })
        .where('id', '=', id)
        .execute()
    })
  }

  /** Idempotent: flips pending → auto_rejected for any punch whose work_date is on or before `cutoffWorkDate`. */
  async autoRejectStalePunches(cutoffWorkDate: string): Promise<number> {
    const result = await db
      .updateTable('daily_punch_records')
      .set({
        status: 'auto_rejected',
        decided_at: new Date(),
        decided_by: null,
      })
      .where('status', '=', 'pending')
      .where('work_date', '<=', dateOnlyToDate(cutoffWorkDate))
      .executeTakeFirst()
    return Number(result.numUpdatedRows ?? 0)
  }

  async getDailyPayForPaystub(
    employeeId: number,
    vendorId: number,
    weekendDate: string,
  ): Promise<DailyPayForPaystub> {
    const rows = await db
      .selectFrom('daily_pay_records as r')
      .leftJoin('daily_punch_records as p', 'p.id', 'r.punch_id')
      .leftJoin('employees as creator', 'creator.id', 'r.created_by')
      .select([
        'r.id',
        'r.punch_id',
        'r.work_date',
        'p.punched_at',
        'p.latitude',
        'p.longitude',
        'p.accuracy_meters',
        'r.description',
        'r.amount',
        'r.created_by',
        'creator.name as creator_name',
        'r.created_at',
      ])
      .where('r.employee_id', '=', employeeId)
      .where('r.vendor_id', '=', vendorId)
      .where('r.wkending', '=', dateOnlyToDate(weekendDate))
      .where('r.reversed_at', 'is', null)
      .orderBy('r.work_date', 'asc')
      .execute()

    const records: DailyPayLineItem[] = rows.map((r) => ({
      id: Number(r.id),
      punchId: Number(r.punch_id),
      workDate: dateOnlyFromDb(r.work_date as Date | string | null),
      punchedAt: (r.punched_at as Date | null) ?? null,
      latitude: r.latitude !== null ? toNumber(r.latitude) : null,
      longitude: r.longitude !== null ? toNumber(r.longitude) : null,
      accuracyMeters: r.accuracy_meters,
      description: r.description,
      amount: toNumber(r.amount),
      createdBy: r.created_by,
      createdByName: (r.creator_name as string | null) ?? null,
      createdAt: (r.created_at as Date | null) ?? null,
    }))

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)
    return { totalAmount, recordCount: records.length, records }
  }

  /** Batch fetch for `PayrollRepository.getPayrollSummary()` aggregation. */
  async getBatchDailyPayTotals(
    keys: Array<{ employeeId: number; vendorId: number; weekendDate: string }>,
  ): Promise<Map<string, { total: number; count: number }>> {
    const out = new Map<string, { total: number; count: number }>()
    if (keys.length === 0) return out

    const employeeIds = Array.from(new Set(keys.map((k) => k.employeeId)))
    const vendorIds = Array.from(new Set(keys.map((k) => k.vendorId)))
    const weekendDates = Array.from(new Set(keys.map((k) => k.weekendDate))).map(dateOnlyToDate)

    const rows = await db
      .selectFrom('daily_pay_records')
      .select([
        'employee_id',
        'vendor_id',
        'wkending',
        db.fn.sum<string>('amount').as('total'),
        db.fn.countAll<string>().as('count'),
      ])
      .where('employee_id', 'in', employeeIds)
      .where('vendor_id', 'in', vendorIds)
      .where('wkending', 'in', weekendDates)
      .where('reversed_at', 'is', null)
      .groupBy(['employee_id', 'vendor_id', 'wkending'])
      .execute()

    for (const r of rows) {
      const wkeStr = dateOnlyFromDb(r.wkending as Date | string | null)
      const key = `${r.employee_id}|${r.vendor_id}|${wkeStr}`
      out.set(key, { total: toNumber(r.total), count: Number(r.count) })
    }
    return out
  }

  // ── Internal helpers ────────────────────────────────────────────

  private assertCanReadEmployee(employeeId: number, ctx: UserContext) {
    if (ctx.isAdmin) return
    if (ctx.employeeId === employeeId) return
    if (ctx.isManager && ctx.managedEmployeeIds?.includes(employeeId)) return
    throw new Error('Access denied')
  }

  private async getEnrollmentStats(
    enrollmentIds: number[],
  ): Promise<Map<number, { lastPunchAt: Date | null; totalPunches: number }>> {
    const out = new Map<number, { lastPunchAt: Date | null; totalPunches: number }>()
    if (enrollmentIds.length === 0) return out

    const enrollments = await db
      .selectFrom('daily_pay_enrollments')
      .select(['id', 'employee_id', 'vendor_id'])
      .where('id', 'in', enrollmentIds)
      .execute()

    for (const e of enrollments) {
      const stats = await db
        .selectFrom('daily_punch_records')
        .select([
          db.fn.max<Date>('punched_at').as('last_punch'),
          db.fn.countAll<string>().as('total'),
        ])
        .where('employee_id', '=', e.employee_id)
        .where('vendor_id', '=', e.vendor_id)
        .executeTakeFirst()
      out.set(e.id, {
        lastPunchAt: (stats?.last_punch as Date | null) ?? null,
        totalPunches: Number(stats?.total ?? 0),
      })
    }
    return out
  }

  private async queryPunches(
    filters: PunchFilters,
    ctx: UserContext,
    isAdminScope: boolean,
    onlyId?: number,
  ): Promise<PunchRow[]> {
    let q = db
      .selectFrom('daily_punch_records as p')
      .innerJoin('employees as emp', 'emp.id', 'p.employee_id')
      .innerJoin('vendors as v', 'v.id', 'p.vendor_id')
      .leftJoin('employees as decider', 'decider.id', 'p.decided_by')
      .leftJoin('daily_pay_records as r', 'r.punch_id', 'p.id')
      .leftJoin('daily_pay_enrollments as enr', (join) =>
        join
          .onRef('enr.employee_id', '=', 'p.employee_id')
          .onRef('enr.vendor_id', '=', 'p.vendor_id')
          .on('enr.is_active', '=', 1),
      )
      .select([
        'p.id',
        'p.employee_id',
        'emp.name as employee_name',
        'p.vendor_id',
        'v.name as vendor_name',
        'p.punched_at',
        'p.work_date',
        'p.latitude',
        'p.longitude',
        'p.accuracy_meters',
        'p.status',
        'p.decided_by',
        'decider.name as decider_name',
        'p.decided_at',
        'p.decline_reason',
        'p.ip_address',
        'p.user_agent',
        'p.created_at',
        'r.amount',
        'r.reversed_at',
        'enr.daily_rate as enrollment_rate',
      ])

    if (onlyId) q = q.where('p.id', '=', onlyId)
    if (filters.status && filters.status !== 'all') q = q.where('p.status', '=', filters.status)
    if (filters.vendorId) q = q.where('p.vendor_id', '=', filters.vendorId)
    if (filters.employeeId) q = q.where('p.employee_id', '=', filters.employeeId)
    if (filters.fromDate) q = q.where('p.work_date', '>=', dateOnlyToDate(filters.fromDate))
    if (filters.toDate) q = q.where('p.work_date', '<=', dateOnlyToDate(filters.toDate))
    if (filters.search) {
      const s = `%${filters.search}%`
      q = q.where((eb) => eb.or([eb('emp.name', 'like', s), eb('v.name', 'like', s)]))
    }

    if (!isAdminScope && ctx.employeeId) {
      q = q.where('p.employee_id', '=', ctx.employeeId)
    } else if (!isAdminScope) {
      return []
    }

    if (filters.limit) q = q.limit(filters.limit)
    const rows = await q.orderBy('p.punched_at', 'desc').execute()

    return rows.map((r) => ({
      id: Number(r.id),
      employeeId: Number(r.employee_id),
      employeeName: r.employee_name,
      vendorId: Number(r.vendor_id),
      vendorName: r.vendor_name,
      punchedAt: r.punched_at as Date,
      workDate: dateOnlyFromDb(r.work_date as Date | string | null),
      latitude: r.latitude !== null ? toNumber(r.latitude) : null,
      longitude: r.longitude !== null ? toNumber(r.longitude) : null,
      accuracyMeters: r.accuracy_meters,
      status: r.status as PunchStatus,
      decidedBy: r.decided_by,
      decidedByName: (r.decider_name as string | null) ?? null,
      decidedAt: (r.decided_at as Date | null) ?? null,
      declineReason: r.decline_reason,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: (r.created_at as Date | null) ?? null,
      amount:
        r.amount !== null
          ? toNumber(r.amount)
          : r.enrollment_rate !== null
            ? toNumber(r.enrollment_rate)
            : null,
      payRecordReversedAt: (r.reversed_at as Date | null) ?? null,
    }))
  }
}

/**
 * Returns the wkending of the most recent past cutoff in the canonical timezone.
 *
 * Returns `null` only on the cutoff day before the cutoff time has been reached —
 * i.e., the brief active-editing window where this week's cutoff hasn't fired yet.
 * Outside that window, always returns the wkending of the most recent crossed cutoff.
 *
 * This makes the cron unconditionally idempotent: if a previous run failed and left
 * stragglers, any subsequent hourly fire (on Sat, Sun, Mon, Tue, …) will pick them up.
 */
export function computeJustCrossedCutoff(
  now: Date,
  cutoffDayOfWeek: number,
  cutoffTimeLocal: string,
  cutoffTimezone: string,
): { cutoffWorkDate: string } | null {
  const localFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: cutoffTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = localFmt.formatToParts(now)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value

  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const localDow = weekdayMap[map.weekday]
  const localTime = `${map.hour}:${map.minute}:${map.second}`

  // Edge case: it's the cutoff day, but cutoff time hasn't been reached yet.
  // The most recent cutoff was a week ago; treat as "no new cutoff to process"
  // so the cron sleeps through the active-editing window.
  if (localDow === cutoffDayOfWeek && localTime < cutoffTimeLocal) {
    return null
  }

  // Days back from `now` to the most recent cutoff datetime.
  const daysBack = (localDow - cutoffDayOfWeek + 7) % 7
  // Days forward from cutoff to that week's wkending.
  const daysForward = (WEEK_END_DAY - cutoffDayOfWeek + 7) % 7
  const offset = daysForward - daysBack

  // Apply offset using local-date arithmetic on the canonical-TZ components.
  // setDate handles month/year rollover and DST transitions correctly within +/- 14d.
  const yy = Number(map.year)
  const mm = Number(map.month) - 1
  const dd = Number(map.day)
  const wkeDate = new Date(yy, mm, dd + offset)
  const wkeYmd = `${wkeDate.getFullYear()}-${String(wkeDate.getMonth() + 1).padStart(2, '0')}-${String(wkeDate.getDate()).padStart(2, '0')}`
  return { cutoffWorkDate: wkeYmd }
}

export const dailyPayRepository = new DailyPayRepository()
