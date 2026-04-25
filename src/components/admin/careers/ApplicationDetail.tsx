'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  ApplicationStatus,
  JobApplicationWithJob,
} from '@/lib/repositories/JobApplicationRepository'

const STATUSES: ApplicationStatus[] = ['new', 'reviewing', 'contacted', 'rejected', 'hired']

export default function ApplicationDetail({
  application,
}: {
  application: JobApplicationWithJob
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [notes, setNotes] = useState<string>(application.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const dirty = status !== application.status || (notes ?? '') !== (application.notes ?? '')

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/careers/applications/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes: notes || null }),
    })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to save.')
      return
    }
    setSavedAt(new Date())
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground sm:self-end">
          Submitted{' '}
          <time dateTime={new Date(application.submitted_at).toISOString()}>
            {new Date(application.submitted_at).toLocaleString()}
          </time>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Internal notes</Label>
        <Textarea
          id="notes"
          rows={5}
          placeholder="Reactions, scheduled call dates, hiring manager feedback…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {savedAt && !dirty && (
          <span className="text-sm text-muted-foreground">
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
  )
}
