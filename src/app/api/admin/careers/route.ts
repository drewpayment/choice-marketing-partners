import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import {
  JobPostingRepository,
  type JobDepartment,
  type JobStatus,
  type EmploymentType,
  type WorkSetting,
  type SalaryType,
  type SalaryShowAs,
} from '@/lib/repositories/JobPostingRepository'
import { logger } from '@/lib/utils/logger'

const departments = ['sales', 'operations', 'engineering', 'marketing', 'admin', 'other'] as const
const statuses = ['draft', 'active', 'filled', 'closed'] as const
const employmentTypes = ['full-time', 'part-time', 'contract', 'seasonal'] as const
const workSettings = ['remote', 'hybrid', 'in-person'] as const
const salaryShowAsValues = ['range', 'starting-at', 'up-to', 'exact', 'hidden'] as const

const optionalNullableString = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === '' ? null : v))

const createSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  title: z.string().trim().min(2).max(160),
  department: z.enum(departments),
  status: z.enum(statuses).optional(),
  employment_type: z.enum(employmentTypes),
  work_setting: z.enum(workSettings),
  location_city: optionalNullableString,
  location_state: optionalNullableString,
  salary_min: optionalNullableString,
  salary_max: optionalNullableString,
  salary_type: z
    .union([z.enum(['hourly', 'annual']), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? null : v)),
  salary_show_as: z.enum(salaryShowAsValues).optional(),
  summary: optionalNullableString,
  description: z.string().trim().min(1),
  responsibilities: z.string().trim().min(1),
  qualifications: z.string().trim().min(1),
  benefits: optionalNullableString,
  apply_url: optionalNullableString.refine(
    (v) => v === null || /^https?:\/\//.test(v),
    'apply_url must start with http:// or https://',
  ),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.employeeId) {
    return NextResponse.json(
      { error: 'Your account is missing an employee link.' },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const repo = new JobPostingRepository()
  if (await repo.slugExists(parsed.data.slug)) {
    return NextResponse.json({ error: 'Slug is already in use.' }, { status: 409 })
  }

  try {
    const created = await repo.create(
      {
        slug: parsed.data.slug,
        title: parsed.data.title,
        department: parsed.data.department as JobDepartment,
        status: parsed.data.status as JobStatus | undefined,
        employment_type: parsed.data.employment_type as EmploymentType,
        work_setting: parsed.data.work_setting as WorkSetting,
        location_city: parsed.data.location_city,
        location_state: parsed.data.location_state,
        salary_min: parsed.data.salary_min,
        salary_max: parsed.data.salary_max,
        salary_type: parsed.data.salary_type as SalaryType | null,
        salary_show_as: parsed.data.salary_show_as as SalaryShowAs | undefined,
        summary: parsed.data.summary,
        description: parsed.data.description,
        responsibilities: parsed.data.responsibilities,
        qualifications: parsed.data.qualifications,
        benefits: parsed.data.benefits,
        apply_url: parsed.data.apply_url,
      },
      {
        isAdmin: true,
        isManager: !!session.user.isManager,
        employeeId: session.user.employeeId,
      },
    )
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    logger.error('Failed to create job posting', error)
    return NextResponse.json({ error: 'Failed to create job posting.' }, { status: 500 })
  }
}
