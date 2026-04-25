import Link from 'next/link'
import { ArrowRight, MapPin, Briefcase } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { JobPosting } from '@/lib/repositories/JobPostingRepository'
import {
  formatDepartment,
  formatEmployment,
  formatLocation,
  formatSalary,
} from './jobFormatters'

export default function JobCard({ job }: { job: JobPosting }) {
  const salary = formatSalary(job)
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <Badge variant="secondary" className="bg-cyan-50 text-primary hover:bg-cyan-100">
          {formatDepartment(job.department)}
        </Badge>
        {salary && (
          <span className="text-sm font-semibold text-amber-700">{salary}</span>
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary">
        {job.title}
      </h3>
      {job.summary && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {job.summary}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {formatLocation(job)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="size-3.5" />
          {formatEmployment(job.employment_type)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View role
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  )
}
