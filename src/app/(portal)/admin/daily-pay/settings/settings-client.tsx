'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Settings = {
  id: number
  isAutoCutoffEnabled: boolean
  cutoffDayOfWeek: number
  cutoffTimeLocal: string
  cutoffTimezone: string
  updatedBy: number | null
  updatedAt: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIMEZONES = [
  'America/Detroit',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
]

export default function SettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [draft, setDraft] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/daily-pay/settings')
    const data = await res.json()
    setSettings(data.settings)
    setDraft(data.settings)
  }

  const loadPending = async () => {
    try {
      const res = await fetch('/api/admin/daily-pay/punches?status=pending')
      const data = await res.json()
      setPendingCount(data.counts?.pending ?? 0)
    } catch {
      setPendingCount(null)
    }
  }

  useEffect(() => {
    load()
    loadPending()
  }, [])

  const dirty = useMemo(() => {
    if (!settings || !draft) return false
    return (
      settings.isAutoCutoffEnabled !== draft.isAutoCutoffEnabled ||
      settings.cutoffDayOfWeek !== draft.cutoffDayOfWeek ||
      settings.cutoffTimeLocal !== draft.cutoffTimeLocal ||
      settings.cutoffTimezone !== draft.cutoffTimezone
    )
  }, [settings, draft])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/daily-pay/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          isAutoCutoffEnabled: draft.isAutoCutoffEnabled,
          cutoffDayOfWeek: draft.cutoffDayOfWeek,
          cutoffTimeLocal: draft.cutoffTimeLocal,
          cutoffTimezone: draft.cutoffTimezone,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save settings')
        return
      }
      const data = await res.json()
      setSettings(data.settings)
      setDraft(data.settings)
      toast.success('Settings saved')
    } finally {
      setSaving(false)
    }
  }

  if (!draft || !settings) {
    return (
      <div className="rounded-lg border border-[var(--ink-200)] bg-white p-6 text-sm text-[var(--ink-500)] shadow-sm">
        Loading…
      </div>
    )
  }

  const nextCutoff = computeNextCutoff(draft.cutoffDayOfWeek, draft.cutoffTimeLocal, draft.cutoffTimezone)

  return (
    <div>
      <div className="mb-5">
        <div className="text-2xl font-bold tracking-tight text-[var(--ink-900)]">Cutoff settings</div>
        <div className="mt-1 text-sm text-[var(--ink-500)]">
          Configure when pending punches auto-reject and what timezone the day boundary uses.
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-[var(--ink-200)] bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-bold text-[var(--ink-900)]">Auto-reject policy</div>

          <div className="flex items-center justify-between border-b border-[var(--ink-100)] py-2.5">
            <div>
              <Label className="text-sm font-semibold text-[var(--ink-900)]">
                Enable hourly auto-reject cron
              </Label>
              <p className="mt-1 max-w-[460px] text-xs leading-relaxed text-[var(--ink-500)]">
                Once a pay week closes, any unreviewed punch is set to{' '}
                <code className="rounded bg-[var(--ink-100)] px-1 py-px font-mono text-[11px]">
                  auto_rejected
                </code>
                . Idempotent — safe to re-run.
              </p>
            </div>
            <Switch
              checked={draft.isAutoCutoffEnabled}
              onCheckedChange={(v) => setDraft({ ...draft, isAutoCutoffEnabled: v })}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">Cutoff day of week</Label>
              <Select
                value={String(draft.cutoffDayOfWeek)}
                onValueChange={(v) => setDraft({ ...draft, cutoffDayOfWeek: Number(v) })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[10.5px] text-[var(--ink-500)]">0=Sun .. 6=Sat in DB</p>
            </div>

            <div>
              <Label className="text-xs font-semibold">Local cutoff time</Label>
              <Input
                value={draft.cutoffTimeLocal}
                onChange={(e) => setDraft({ ...draft, cutoffTimeLocal: e.target.value })}
                placeholder="HH:MM:SS"
                className="mt-1.5 tabular-nums"
              />
              <p className="mt-1 text-[10.5px] text-[var(--ink-500)]">HH:MM:SS, 24-hour</p>
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-xs font-semibold">Canonical timezone</Label>
            <Select
              value={draft.cutoffTimezone}
              onValueChange={(v) => setDraft({ ...draft, cutoffTimezone: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10.5px] text-[var(--ink-500)]">
              Used for both work_date derivation and cutoff. Server-side only — never trust the client clock.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[var(--ink-100)] pt-3.5">
            <div className="text-[11px] text-[var(--ink-500)]">
              Last updated{' '}
              <strong className="text-[var(--ink-700)]">
                {new Date(settings.updatedAt).toLocaleString()}
              </strong>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(settings)} disabled={!dirty || saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--ink-200)] bg-white p-4 shadow-sm">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
              Next cutoff
            </div>
            <div className="text-2xl font-bold tabular-nums text-[var(--ink-900)]">
              {nextCutoff.dateLabel}
            </div>
            <div className="mt-0.5 text-xs text-[var(--ink-500)]">
              {draft.cutoffTimeLocal} in {draft.cutoffTimezone}
              {nextCutoff.relative ? ` · ${nextCutoff.relative}` : ''}
            </div>
            {pendingCount != null && pendingCount > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-[var(--status-amber-50)] px-2.5 py-2 text-[11px] text-[#92400e]">
                <AlertTriangle className="h-3.5 w-3.5 text-[var(--status-amber-600)]" />
                <span>
                  <strong>{pendingCount} pending</strong> punch{pendingCount === 1 ? '' : 'es'} will
                  auto-reject if not reviewed.
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--ink-200)] bg-white p-4 shadow-sm">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
              Cron schedule
            </div>
            <pre className="overflow-auto rounded-md bg-[var(--ink-900)] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#e2e8f0]">
              {`# vercel.json
"crons": [{
  "path": "/api/cron/daily-pay-cutoff",
  "schedule": "0 * * * *"
}]`}
            </pre>
            <div className="mt-2 text-[11px] leading-relaxed text-[var(--ink-500)]">
              Static schedule (every hour); the route reads runtime config above and acts only when
              the configured cutoff has just been crossed.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function computeNextCutoff(day: number, time: string, timezone: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(new Date())
    const map: Record<string, string> = {}
    for (const p of parts) map[p.type] = p.value
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    const localDow = weekdayMap[map.weekday]
    const localTime = `${map.hour}:${map.minute}:00`
    let daysUntil = (day - localDow + 7) % 7
    if (daysUntil === 0 && localTime >= time) daysUntil = 7
    const next = new Date()
    next.setDate(next.getDate() + daysUntil)
    const dateLabel = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(next)
    const relative = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil}d`
    return { dateLabel, relative }
  } catch {
    return { dateLabel: '—', relative: '' }
  }
}
