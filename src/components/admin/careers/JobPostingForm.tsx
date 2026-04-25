'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  JobPosting,
  JobDepartment,
  JobStatus,
  EmploymentType,
  WorkSetting,
  SalaryType,
  SalaryShowAs,
} from '@/lib/repositories/JobPostingRepository'

const departments: JobDepartment[] = [
  'sales',
  'operations',
  'engineering',
  'marketing',
  'admin',
  'other',
]
const statuses: JobStatus[] = ['draft', 'active', 'filled', 'closed']
const employmentTypes: EmploymentType[] = ['full-time', 'part-time', 'contract', 'seasonal']
const workSettings: WorkSetting[] = ['remote', 'hybrid', 'in-person']
type SalaryTypeChoice = 'none' | SalaryType
const salaryTypes: SalaryTypeChoice[] = ['none', 'hourly', 'annual']
const SALARY_TYPE_LABEL: Record<SalaryTypeChoice, string> = {
  none: '— none —',
  hourly: 'hourly',
  annual: 'annual',
}
const salaryShowAsOptions: SalaryShowAs[] = [
  'range',
  'starting-at',
  'up-to',
  'exact',
  'hidden',
]

const optionalString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Use numbers only, e.g. 65000')
  .optional()
  .or(z.literal(''))

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, numbers, and dashes only'),
  title: z.string().trim().min(2).max(160),
  department: z.enum(departments as [string, ...string[]]),
  status: z.enum(statuses as [string, ...string[]]),
  employment_type: z.enum(employmentTypes as [string, ...string[]]),
  work_setting: z.enum(workSettings as [string, ...string[]]),
  location_city: optionalString,
  location_state: optionalString,
  salary_min: moneyString,
  salary_max: moneyString,
  salary_type: z.enum(['none', 'hourly', 'annual']),
  salary_show_as: z.enum(salaryShowAsOptions as [string, ...string[]]),
  summary: optionalString,
  description: z.string().trim().min(1, 'Description is required'),
  responsibilities: z.string().trim().min(1, 'Responsibilities are required'),
  qualifications: z.string().trim().min(1, 'Qualifications are required'),
  benefits: optionalString,
  apply_url: optionalString.refine(
    (v) => !v || /^https?:\/\//.test(v),
    'Must start with http:// or https://',
  ),
})

type FormValues = z.infer<typeof schema>

interface Props {
  mode: 'create' | 'edit'
  initial?: JobPosting
}

function defaultsFor(initial?: JobPosting): FormValues {
  return {
    slug: initial?.slug ?? '',
    title: initial?.title ?? '',
    department: initial?.department ?? 'sales',
    status: initial?.status ?? 'draft',
    employment_type: initial?.employment_type ?? 'full-time',
    work_setting: initial?.work_setting ?? 'in-person',
    location_city: initial?.location_city ?? '',
    location_state: initial?.location_state ?? '',
    salary_min: initial?.salary_min ?? '',
    salary_max: initial?.salary_max ?? '',
    salary_type: initial?.salary_type ?? 'none',
    salary_show_as: initial?.salary_show_as ?? 'range',
    summary: initial?.summary ?? '',
    description: initial?.description ?? '',
    responsibilities: initial?.responsibilities ?? '',
    qualifications: initial?.qualifications ?? '',
    benefits: initial?.benefits ?? '',
    apply_url: initial?.apply_url ?? '',
  }
}

export default function JobPostingForm({ mode, initial }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(initial),
  })

  const watched = watch()

  async function onSubmit(values: FormValues) {
    setError(null)
    const payload = {
      ...values,
      location_city: values.location_city || null,
      location_state: values.location_state || null,
      salary_min: values.salary_min || null,
      salary_max: values.salary_max || null,
      salary_type: values.salary_type === 'none' ? null : values.salary_type,
      summary: values.summary || null,
      benefits: values.benefits || null,
      apply_url: values.apply_url || null,
    }

    const url = mode === 'create' ? '/api/admin/careers' : `/api/admin/careers/${initial!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to save job posting.')
      return
    }

    router.push('/admin/careers')
    router.refresh()
  }

  async function onDelete() {
    if (!initial) return
    if (!confirm(`Soft-delete "${initial.title}"? It will disappear from public listings.`)) return
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/admin/careers/${initial.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to delete.')
      setDeleting(false)
      return
    }
    router.push('/admin/careers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register('title')} />
          {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" placeholder="senior-energy-sales-rep" {...register('slug')} />
          {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>}
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Select
            value={watched.department}
            onValueChange={(v) => setValue('department', v as JobDepartment, { shouldDirty: true })}
          >
            <SelectTrigger id="department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={watched.status}
            onValueChange={(v) => setValue('status', v as JobStatus, { shouldDirty: true })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="employment_type">Employment type</Label>
          <Select
            value={watched.employment_type}
            onValueChange={(v) =>
              setValue('employment_type', v as EmploymentType, { shouldDirty: true })
            }
          >
            <SelectTrigger id="employment_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {employmentTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="work_setting">Work setting</Label>
          <Select
            value={watched.work_setting}
            onValueChange={(v) => setValue('work_setting', v as WorkSetting, { shouldDirty: true })}
          >
            <SelectTrigger id="work_setting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workSettings.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="location_city">City</Label>
          <Input id="location_city" {...register('location_city')} />
        </div>
        <div>
          <Label htmlFor="location_state">State</Label>
          <Input id="location_state" maxLength={60} {...register('location_state')} />
        </div>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium text-foreground">Compensation</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="salary_min">Min</Label>
            <Input id="salary_min" placeholder="50000" {...register('salary_min')} />
            {errors.salary_min && (
              <p className="mt-1 text-xs text-destructive">{errors.salary_min.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="salary_max">Max</Label>
            <Input id="salary_max" placeholder="80000" {...register('salary_max')} />
            {errors.salary_max && (
              <p className="mt-1 text-xs text-destructive">{errors.salary_max.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="salary_type">Type</Label>
            <Select
              value={watched.salary_type}
              onValueChange={(v) =>
                setValue('salary_type', v as SalaryTypeChoice, { shouldDirty: true })
              }
            >
              <SelectTrigger id="salary_type">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {salaryTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SALARY_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="salary_show_as">Show as</Label>
            <Select
              value={watched.salary_show_as}
              onValueChange={(v) =>
                setValue('salary_show_as', v as SalaryShowAs, { shouldDirty: true })
              }
            >
              <SelectTrigger id="salary_show_as">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salaryShowAsOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="summary">Card blurb (1–2 sentences)</Label>
        <Textarea id="summary" rows={2} maxLength={500} {...register('summary')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (HTML allowed)</Label>
        <Textarea id="description" rows={6} {...register('description')} />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Plain text or HTML. Inline tags like &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;,
          and &lt;a&gt; render through the prose styles on the public page.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsibilities">Responsibilities (HTML allowed)</Label>
        <Textarea id="responsibilities" rows={6} {...register('responsibilities')} />
        {errors.responsibilities && (
          <p className="text-sm text-destructive">{errors.responsibilities.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualifications">Qualifications (HTML allowed)</Label>
        <Textarea id="qualifications" rows={6} {...register('qualifications')} />
        {errors.qualifications && (
          <p className="text-sm text-destructive">{errors.qualifications.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="benefits">Benefits (HTML allowed, optional)</Label>
        <Textarea id="benefits" rows={5} {...register('benefits')} />
      </div>

      <div>
        <Label htmlFor="apply_url">External apply URL (optional)</Label>
        <Input id="apply_url" placeholder="https://indeed.com/…" {...register('apply_url')} />
        {errors.apply_url && (
          <p className="mt-1 text-sm text-destructive">{errors.apply_url.message}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Leave blank to use the internal application form.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          {mode === 'edit' && (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={deleting}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 size-4" />
              {deleting ? 'Deleting…' : 'Soft delete'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || (!isDirty && mode === 'edit')}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : mode === 'create' ? (
              'Create job'
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
