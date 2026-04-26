import { db } from '@/lib/database/client'
import type { UserContext } from '@/lib/auth/types'

export type ApplicationStatus = 'new' | 'reviewing' | 'contacted' | 'rejected' | 'hired'

export interface JobApplication {
  id: number
  job_posting_id: number
  applicant_name: string
  applicant_email: string
  applicant_phone: string | null
  cover_letter: string | null
  resume_url: string | null
  resume_filename: string | null
  status: ApplicationStatus
  notes: string | null
  submitted_at: Date
  updated_at: Date
}

export interface JobApplicationWithJob extends JobApplication {
  job_title: string
  job_slug: string
}

export interface SubmitApplicationInput {
  job_posting_id: number
  applicant_name: string
  applicant_email: string
  applicant_phone?: string | null
  cover_letter?: string | null
  resume_url?: string | null
  resume_filename?: string | null
}

export interface ListApplicationsOptions {
  status?: ApplicationStatus | 'all'
  jobPostingId?: number
}

function requireAdmin(user: UserContext) {
  if (!user.isAdmin) {
    throw new Error('Forbidden: admin role required')
  }
}

function rowToApplication(row: Record<string, unknown>): JobApplication {
  return {
    id: row.id as number,
    job_posting_id: row.job_posting_id as number,
    applicant_name: row.applicant_name as string,
    applicant_email: row.applicant_email as string,
    applicant_phone: (row.applicant_phone as string | null) ?? null,
    cover_letter: (row.cover_letter as string | null) ?? null,
    resume_url: (row.resume_url as string | null) ?? null,
    resume_filename: (row.resume_filename as string | null) ?? null,
    status: row.status as ApplicationStatus,
    notes: (row.notes as string | null) ?? null,
    submitted_at: row.submitted_at as Date,
    updated_at: row.updated_at as Date,
  }
}

export class JobApplicationRepository {
  async submit(input: SubmitApplicationInput): Promise<{ id: number }> {
    const result = await db
      .insertInto('job_applications')
      .values({
        job_posting_id: input.job_posting_id,
        applicant_name: input.applicant_name,
        applicant_email: input.applicant_email,
        applicant_phone: input.applicant_phone ?? null,
        cover_letter: input.cover_letter ?? null,
        resume_url: input.resume_url ?? null,
        resume_filename: input.resume_filename ?? null,
      })
      .executeTakeFirst()

    const insertId = Number(result.insertId ?? 0)
    return { id: insertId }
  }

  async listAll(
    user: UserContext,
    opts: ListApplicationsOptions = {},
  ): Promise<JobApplicationWithJob[]> {
    requireAdmin(user)

    let query = db
      .selectFrom('job_applications')
      .innerJoin('job_postings', 'job_postings.id', 'job_applications.job_posting_id')
      .select([
        'job_applications.id as id',
        'job_applications.job_posting_id as job_posting_id',
        'job_applications.applicant_name as applicant_name',
        'job_applications.applicant_email as applicant_email',
        'job_applications.applicant_phone as applicant_phone',
        'job_applications.cover_letter as cover_letter',
        'job_applications.resume_url as resume_url',
        'job_applications.resume_filename as resume_filename',
        'job_applications.status as status',
        'job_applications.notes as notes',
        'job_applications.submitted_at as submitted_at',
        'job_applications.updated_at as updated_at',
        'job_postings.title as job_title',
        'job_postings.slug as job_slug',
      ])
      .orderBy('job_applications.submitted_at', 'desc')

    if (opts.status && opts.status !== 'all') {
      query = query.where('job_applications.status', '=', opts.status)
    }
    if (opts.jobPostingId !== undefined) {
      query = query.where('job_applications.job_posting_id', '=', opts.jobPostingId)
    }

    const rows = await query.execute()
    return rows.map((r) => {
      const base = rowToApplication(r as unknown as Record<string, unknown>)
      const row = r as unknown as Record<string, unknown>
      return {
        ...base,
        job_title: row.job_title as string,
        job_slug: row.job_slug as string,
      }
    })
  }

  async getById(id: number, user: UserContext): Promise<JobApplicationWithJob | null> {
    requireAdmin(user)

    const row = await db
      .selectFrom('job_applications')
      .innerJoin('job_postings', 'job_postings.id', 'job_applications.job_posting_id')
      .select([
        'job_applications.id as id',
        'job_applications.job_posting_id as job_posting_id',
        'job_applications.applicant_name as applicant_name',
        'job_applications.applicant_email as applicant_email',
        'job_applications.applicant_phone as applicant_phone',
        'job_applications.cover_letter as cover_letter',
        'job_applications.resume_url as resume_url',
        'job_applications.resume_filename as resume_filename',
        'job_applications.status as status',
        'job_applications.notes as notes',
        'job_applications.submitted_at as submitted_at',
        'job_applications.updated_at as updated_at',
        'job_postings.title as job_title',
        'job_postings.slug as job_slug',
      ])
      .where('job_applications.id', '=', id)
      .executeTakeFirst()

    if (!row) return null
    const base = rowToApplication(row as unknown as Record<string, unknown>)
    const r = row as unknown as Record<string, unknown>
    return {
      ...base,
      job_title: r.job_title as string,
      job_slug: r.job_slug as string,
    }
  }

  async updateStatus(
    id: number,
    status: ApplicationStatus,
    notes: string | null,
    user: UserContext,
  ): Promise<void> {
    requireAdmin(user)

    const update: Record<string, unknown> = { status }
    if (notes !== undefined) {
      update.notes = notes
    }

    await db
      .updateTable('job_applications')
      .set(update as never)
      .where('id', '=', id)
      .execute()
  }
}
