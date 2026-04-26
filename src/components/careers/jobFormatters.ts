import type {
  JobPosting,
  EmploymentType,
  WorkSetting,
  JobDepartment,
} from '@/lib/repositories/JobPostingRepository'

const DEPARTMENT_LABELS: Record<JobDepartment, string> = {
  sales: 'Sales',
  operations: 'Operations',
  engineering: 'Engineering',
  marketing: 'Marketing',
  admin: 'Administration',
  other: 'Other',
}

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  seasonal: 'Seasonal',
}

const WORK_SETTING_LABELS: Record<WorkSetting, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  'in-person': 'On-site',
}

export function formatDepartment(value: JobDepartment): string {
  return DEPARTMENT_LABELS[value] ?? value
}

export function formatEmployment(value: EmploymentType): string {
  return EMPLOYMENT_LABELS[value] ?? value
}

export function formatWorkSetting(value: WorkSetting): string {
  return WORK_SETTING_LABELS[value] ?? value
}

export function formatLocation(job: Pick<JobPosting, 'location_city' | 'location_state' | 'work_setting'>): string {
  if (job.work_setting === 'remote' && !job.location_city && !job.location_state) {
    return 'Remote'
  }
  const parts = [job.location_city, job.location_state].filter(Boolean)
  const place = parts.join(', ')
  if (!place) return formatWorkSetting(job.work_setting)
  if (job.work_setting === 'hybrid') return `${place} • Hybrid`
  if (job.work_setting === 'remote') return `${place} • Remote`
  return place
}

function formatMoney(value: string | null, type: 'hourly' | 'annual' | null): string | null {
  if (!value) return null
  const num = Number(value)
  if (Number.isNaN(num)) return null
  if (type === 'hourly') {
    return `$${num.toFixed(2)}/hr`
  }
  // annual or unknown — abbreviate to $###k for readability
  if (num >= 1000) {
    const k = Math.round(num / 1000)
    return `$${k}k`
  }
  return `$${num.toLocaleString('en-US')}`
}

export function formatSalary(
  job: Pick<JobPosting, 'salary_min' | 'salary_max' | 'salary_type' | 'salary_show_as'>,
): string | null {
  if (job.salary_show_as === 'hidden') return null
  const min = formatMoney(job.salary_min, job.salary_type)
  const max = formatMoney(job.salary_max, job.salary_type)
  if (!min && !max) return null

  switch (job.salary_show_as) {
    case 'starting-at':
      return min ? `Starting at ${min}` : null
    case 'up-to':
      return max ? `Up to ${max}` : null
    case 'exact':
      return min ?? max
    case 'range':
    default:
      if (min && max) return `${min} – ${max}`
      return min ?? max ?? null
  }
}
