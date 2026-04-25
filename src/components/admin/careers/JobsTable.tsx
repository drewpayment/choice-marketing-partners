'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { JobPosting, JobStatus } from '@/lib/repositories/JobPostingRepository'

const STATUS_OPTIONS: Array<JobStatus | 'all'> = ['all', 'active', 'draft', 'filled', 'closed']

const STATUS_CLASS: Record<JobStatus, string> = {
  draft: 'bg-stone-100 text-stone-700',
  active: 'bg-emerald-100 text-emerald-700',
  filled: 'bg-violet-100 text-violet-700',
  closed: 'bg-rose-100 text-rose-700',
}

interface Props {
  jobs: JobPosting[]
}

export default function JobsTable({ jobs }: Props) {
  const [status, setStatus] = useState<JobStatus | 'all'>('all')

  const visible = useMemo(
    () => (status === 'all' ? jobs : jobs.filter((j) => j.status === status)),
    [jobs, status],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v as JobStatus | 'all')}>
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {visible.length} of {jobs.length}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No job postings yet.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{job.title}</div>
                    <div className="text-xs text-muted-foreground">{job.slug}</div>
                  </TableCell>
                  <TableCell className="capitalize">{job.department}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_CLASS[job.status]}>{job.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(job.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      {job.status === 'active' && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/careers/${job.slug}`} target="_blank">
                            <ExternalLink className="size-4" />
                            View
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/careers/${job.id}/edit`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
