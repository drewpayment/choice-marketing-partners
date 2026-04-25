'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
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
import type {
  ApplicationStatus,
  JobApplicationWithJob,
} from '@/lib/repositories/JobApplicationRepository'

const STATUS_OPTIONS: Array<ApplicationStatus | 'all'> = [
  'all',
  'new',
  'reviewing',
  'contacted',
  'rejected',
  'hired',
]

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  new: 'bg-cyan-100 text-cyan-700',
  reviewing: 'bg-amber-100 text-amber-700',
  contacted: 'bg-violet-100 text-violet-700',
  rejected: 'bg-rose-100 text-rose-700',
  hired: 'bg-emerald-100 text-emerald-700',
}

export default function ApplicationsTable({
  applications,
}: {
  applications: JobApplicationWithJob[]
}) {
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all')

  const visible = useMemo(
    () =>
      status === 'all' ? applications : applications.filter((a) => a.status === status),
    [applications, status],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus | 'all')}>
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
          {visible.length} of {applications.length}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No applications match this filter.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{app.applicant_name}</div>
                    <div className="text-xs text-muted-foreground">{app.applicant_email}</div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/careers/${app.job_posting_id}/edit`}
                      className="text-primary hover:underline"
                    >
                      {app.job_title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_CLASS[app.status]}>{app.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(app.submitted_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      {app.resume_url && (
                        <Button asChild variant="ghost" size="sm">
                          <a href={app.resume_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" />
                            Resume
                          </a>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/careers/applications/${app.id}`}>Open</Link>
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
