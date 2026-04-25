'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import JobCard from './JobCard'
import { formatDepartment } from './jobFormatters'
import type {
  JobPosting,
  JobDepartment,
} from '@/lib/repositories/JobPostingRepository'

interface Props {
  jobs: JobPosting[]
}

const ALL_DEPARTMENTS: JobDepartment[] = [
  'sales',
  'operations',
  'engineering',
  'marketing',
  'admin',
  'other',
]

export default function JobListings({ jobs }: Props) {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<'all' | JobDepartment>('all')

  const departments = useMemo(() => {
    const present = new Set(jobs.map((j) => j.department))
    return ALL_DEPARTMENTS.filter((d) => present.has(d))
  }, [jobs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((job) => {
      if (department !== 'all' && job.department !== department) return false
      if (!q) return true
      const haystack = [
        job.title,
        job.summary ?? '',
        job.location_city ?? '',
        job.location_state ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [jobs, search, department])

  return (
    <section id="open-roles" className="bg-muted py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Open roles
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Find your next role
          </h2>
        </div>

        <div className="mx-auto mb-8 flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title, location, or keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search jobs"
            />
          </div>
          {departments.length > 1 && (
            <Select
              value={department}
              onValueChange={(v) => setDepartment(v as 'all' | JobDepartment)}
            >
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter by department">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {formatDepartment(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-base font-semibold text-foreground">No matching roles</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {jobs.length === 0
                ? "We don't have any open roles right now — check back soon."
                : 'Try clearing filters or adjusting your search.'}
            </p>
          </div>
        ) : (
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {filtered.map((job) => (
              <motion.div
                key={job.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
