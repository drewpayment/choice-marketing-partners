import { db } from '@/lib/database/client'
import type { UserContext } from '@/lib/auth/types'

export type JobDepartment =
  | 'sales'
  | 'operations'
  | 'engineering'
  | 'marketing'
  | 'admin'
  | 'other'

export type JobStatus = 'draft' | 'active' | 'filled' | 'closed'
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'seasonal'
export type WorkSetting = 'remote' | 'hybrid' | 'in-person'
export type SalaryType = 'hourly' | 'annual'
export type SalaryShowAs = 'range' | 'starting-at' | 'up-to' | 'exact' | 'hidden'

export interface JobPosting {
  id: number
  slug: string
  title: string
  department: JobDepartment
  status: JobStatus
  employment_type: EmploymentType
  work_setting: WorkSetting
  location_city: string | null
  location_state: string | null
  salary_min: string | null
  salary_max: string | null
  salary_type: SalaryType | null
  salary_show_as: SalaryShowAs
  summary: string | null
  description: string
  responsibilities: string
  qualifications: string
  benefits: string | null
  apply_url: string | null
  posted_at: Date | null
  created_by: number
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateJobPostingInput {
  slug: string
  title: string
  department: JobDepartment
  status?: JobStatus
  employment_type: EmploymentType
  work_setting: WorkSetting
  location_city?: string | null
  location_state?: string | null
  salary_min?: string | null
  salary_max?: string | null
  salary_type?: SalaryType | null
  salary_show_as?: SalaryShowAs
  summary?: string | null
  description: string
  responsibilities: string
  qualifications: string
  benefits?: string | null
  apply_url?: string | null
  posted_at?: Date | null
}

export type UpdateJobPostingInput = Partial<CreateJobPostingInput>

export interface ListActiveOptions {
  department?: JobDepartment
  limit?: number
}

export interface ListAllOptions {
  status?: JobStatus | 'all'
  includeDeleted?: boolean
}

function requireAdmin(user: UserContext) {
  if (!user.isAdmin) {
    throw new Error('Forbidden: admin role required')
  }
}

function toDecimalString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? value : String(value)
}

function rowToJobPosting(row: Record<string, unknown>): JobPosting {
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    department: row.department as JobDepartment,
    status: row.status as JobStatus,
    employment_type: row.employment_type as EmploymentType,
    work_setting: row.work_setting as WorkSetting,
    location_city: (row.location_city as string | null) ?? null,
    location_state: (row.location_state as string | null) ?? null,
    salary_min: toDecimalString(row.salary_min),
    salary_max: toDecimalString(row.salary_max),
    salary_type: (row.salary_type as SalaryType | null) ?? null,
    salary_show_as: row.salary_show_as as SalaryShowAs,
    summary: (row.summary as string | null) ?? null,
    description: row.description as string,
    responsibilities: row.responsibilities as string,
    qualifications: row.qualifications as string,
    benefits: (row.benefits as string | null) ?? null,
    apply_url: (row.apply_url as string | null) ?? null,
    posted_at: (row.posted_at as Date | null) ?? null,
    created_by: row.created_by as number,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: (row.deleted_at as Date | null) ?? null,
  }
}

export class JobPostingRepository {
  async listActive(opts: ListActiveOptions = {}): Promise<JobPosting[]> {
    let query = db
      .selectFrom('job_postings')
      .selectAll()
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .orderBy('posted_at', 'desc')
      .orderBy('id', 'desc')

    if (opts.department) {
      query = query.where('department', '=', opts.department)
    }
    if (opts.limit !== undefined) {
      query = query.limit(opts.limit)
    }

    const rows = await query.execute()
    return rows.map((r) => rowToJobPosting(r as unknown as Record<string, unknown>))
  }

  async getBySlug(slug: string): Promise<JobPosting | null> {
    const row = await db
      .selectFrom('job_postings')
      .selectAll()
      .where('slug', '=', slug)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!row) return null
    return rowToJobPosting(row as unknown as Record<string, unknown>)
  }

  async getActiveBySlug(slug: string): Promise<JobPosting | null> {
    const row = await db
      .selectFrom('job_postings')
      .selectAll()
      .where('slug', '=', slug)
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!row) return null
    return rowToJobPosting(row as unknown as Record<string, unknown>)
  }

  async listAll(user: UserContext, opts: ListAllOptions = {}): Promise<JobPosting[]> {
    requireAdmin(user)

    let query = db
      .selectFrom('job_postings')
      .selectAll()
      .orderBy('updated_at', 'desc')

    if (!opts.includeDeleted) {
      query = query.where('deleted_at', 'is', null)
    }
    if (opts.status && opts.status !== 'all') {
      query = query.where('status', '=', opts.status)
    }

    const rows = await query.execute()
    return rows.map((r) => rowToJobPosting(r as unknown as Record<string, unknown>))
  }

  async getById(id: number, user: UserContext): Promise<JobPosting | null> {
    requireAdmin(user)
    const row = await db
      .selectFrom('job_postings')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) return null
    return rowToJobPosting(row as unknown as Record<string, unknown>)
  }

  async create(input: CreateJobPostingInput, user: UserContext): Promise<JobPosting> {
    requireAdmin(user)
    if (!user.employeeId) {
      throw new Error('Cannot create job: missing employeeId on user context')
    }

    const status = input.status ?? 'draft'
    const postedAt = input.posted_at ?? (status === 'active' ? new Date() : null)

    await db
      .insertInto('job_postings')
      .values({
        slug: input.slug,
        title: input.title,
        department: input.department,
        status,
        employment_type: input.employment_type,
        work_setting: input.work_setting,
        location_city: input.location_city ?? null,
        location_state: input.location_state ?? null,
        salary_min: input.salary_min ?? null,
        salary_max: input.salary_max ?? null,
        salary_type: input.salary_type ?? null,
        salary_show_as: input.salary_show_as ?? 'range',
        summary: input.summary ?? null,
        description: input.description,
        responsibilities: input.responsibilities,
        qualifications: input.qualifications,
        benefits: input.benefits ?? null,
        apply_url: input.apply_url ?? null,
        posted_at: postedAt,
        created_by: user.employeeId,
      })
      .execute()

    const row = await db
      .selectFrom('job_postings')
      .selectAll()
      .where('slug', '=', input.slug)
      .executeTakeFirstOrThrow()

    return rowToJobPosting(row as unknown as Record<string, unknown>)
  }

  async update(id: number, input: UpdateJobPostingInput, user: UserContext): Promise<JobPosting> {
    requireAdmin(user)

    const existing = await this.getById(id, user)
    if (!existing) {
      throw new Error(`Job posting ${id} not found`)
    }

    const promoteToActive = input.status === 'active' && existing.status !== 'active'

    const update: Record<string, unknown> = {}
    const assignable: Array<keyof CreateJobPostingInput> = [
      'slug',
      'title',
      'department',
      'status',
      'employment_type',
      'work_setting',
      'location_city',
      'location_state',
      'salary_min',
      'salary_max',
      'salary_type',
      'salary_show_as',
      'summary',
      'description',
      'responsibilities',
      'qualifications',
      'benefits',
      'apply_url',
      'posted_at',
    ]
    for (const k of assignable) {
      if (Object.prototype.hasOwnProperty.call(input, k)) {
        update[k as string] = (input as Record<string, unknown>)[k as string] ?? null
      }
    }

    if (promoteToActive && !('posted_at' in update)) {
      update.posted_at = new Date()
    }

    if (Object.keys(update).length === 0) return existing

    await db
      .updateTable('job_postings')
      .set(update as never)
      .where('id', '=', id)
      .execute()

    const refreshed = await this.getById(id, user)
    if (!refreshed) throw new Error(`Job posting ${id} disappeared after update`)
    return refreshed
  }

  async softDelete(id: number, user: UserContext): Promise<void> {
    requireAdmin(user)
    await db
      .updateTable('job_postings')
      .set({ deleted_at: new Date(), status: 'closed' })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .execute()
  }

  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    let query = db
      .selectFrom('job_postings')
      .select('id')
      .where('slug', '=', slug)

    if (excludeId !== undefined) {
      query = query.where('id', '!=', excludeId)
    }

    const row = await query.executeTakeFirst()
    return !!row
  }
}
