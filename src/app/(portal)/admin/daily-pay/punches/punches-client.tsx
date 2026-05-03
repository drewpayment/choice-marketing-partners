'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Clock, MapPin, Search, Undo2, X } from 'lucide-react'
import DoublePunchConfirmDialog from '@/components/daily-pay/double-punch-confirm-dialog'
import ReverseConfirmDialog from '@/components/daily-pay/reverse-confirm-dialog'

const PunchMap = dynamic(() => import('@/components/daily-pay/punch-map'), { ssr: false })

type Punch = {
  id: number
  employeeId: number
  employeeName: string
  vendorId: number
  vendorName: string
  punchedAt: string
  workDate: string
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  status: 'pending' | 'approved' | 'declined' | 'auto_rejected'
  decidedBy: number | null
  decidedByName: string | null
  decidedAt: string | null
  declineReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string | null
  amount: number | null
  payRecordReversedAt: string | null
}

type StatusFilter = 'pending' | 'approved' | 'declined' | 'all'

const STATUS_LABEL: Record<Punch['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  auto_rejected: 'Auto-rejected',
}

function statusToneClasses(status: Punch['status']) {
  switch (status) {
    case 'approved':
      return 'bg-[var(--status-green-50)] text-[#065f46]'
    case 'pending':
      return 'bg-[var(--status-amber-50)] text-[#92400e]'
    case 'declined':
      return 'bg-[var(--status-red-50)] text-[#991b1b]'
    case 'auto_rejected':
      return 'bg-[var(--ink-100)] text-[var(--ink-700)]'
  }
}

function statusDot(status: Punch['status']) {
  switch (status) {
    case 'approved':
      return 'var(--status-green-600)'
    case 'pending':
      return 'var(--status-amber-600)'
    case 'declined':
      return 'var(--status-red-600)'
    case 'auto_rejected':
      return 'var(--ink-500)'
  }
}

function StatusPill({ status }: { status: Punch['status'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${statusToneClasses(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot(status) }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function PunchesClient() {
  const [punches, setPunches] = useState<Punch[]>([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0, declined: 0, auto_rejected: 0 })
  const [status, setStatus] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDouble, setConfirmDouble] = useState<Punch | null>(null)
  const [confirmReverse, setConfirmReverse] = useState<Punch | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const refresh = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/daily-pay/punches?${params}`)
      const data = await res.json()
      const list: Punch[] = data.punches ?? []
      setPunches(list)
      setCounts(data.counts ?? { pending: 0, approved: 0, declined: 0, auto_rejected: 0 })
      if (selectedId == null && list.length > 0) setSelectedId(list[0].id)
      if (selectedId && !list.find((p) => p.id === selectedId)) {
        setSelectedId(list[0]?.id ?? null)
      }
    } catch {
      toast.error('Failed to load punches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    const id = setTimeout(() => {
      refresh()
    }, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Auto-scroll selected row into view
  useEffect(() => {
    if (selectedId == null) return
    const el = rowRefs.current[selectedId]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const selected = useMemo(
    () => punches.find((p) => p.id === selectedId) ?? null,
    [punches, selectedId],
  )

  const mapPins = useMemo(
    () =>
      punches
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => ({
          id: p.id,
          latitude: p.latitude!,
          longitude: p.longitude!,
          status: p.status,
          label: p.employeeName,
        })),
    [punches],
  )

  const approve = async (p: Punch, confirmDoubleFlag = false) => {
    const res = await fetch(`/api/admin/daily-pay/punches/${p.id}/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmDouble: confirmDoubleFlag }),
    })
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}))
      if (data.error === 'requires_confirmation') {
        setConfirmDouble(p)
        return
      }
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Could not approve punch')
      return
    }
    toast.success('Approved')
    refresh()
  }

  const decline = async (p: Punch) => {
    const res = await fetch(`/api/admin/daily-pay/punches/${p.id}/decline`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Could not decline punch')
      return
    }
    toast.success('Declined')
    refresh()
  }

  const reverse = async (p: Punch) => {
    const res = await fetch(`/api/admin/daily-pay/punches/${p.id}/reverse`, { method: 'POST' })
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}))
      toast.error(
        data.error === 'paystub_already_paid'
          ? 'Paystub is already paid — cannot reverse.'
          : 'Cannot reverse this punch right now.',
      )
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to reverse')
      return
    }
    toast.success('Reversed')
    refresh()
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight text-[var(--ink-900)]">Punch audit</div>
          <div className="mt-1 text-sm text-[var(--ink-500)]">
            Review where employees punched in. Click any pin or row to inspect.
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Pending review" value={String(counts.pending)} sub="Awaiting decision" tone="amber" />
        <Kpi label="Approved" value={String(counts.approved)} sub="In current view" />
        <Kpi label="Declined" value={String(counts.declined)} sub="In current view" />
        <Kpi label="Auto-rejected" value={String(counts.auto_rejected)} sub="In current view" />
      </div>

      {/* Filters */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <FilterPills active={status} counts={counts} onChange={setStatus} />
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--ink-400)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or vendor…"
            className="h-9 w-64 pl-8"
          />
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-[1.4fr_1fr]">
        <PunchMap pins={mapPins} selectedId={selectedId} onSelect={setSelectedId} height={560} />

        <div className="flex h-[560px] flex-col gap-3">
          {selected && (
            <PunchInspector
              punch={selected}
              onApprove={() => approve(selected)}
              onDecline={() => decline(selected)}
              onReverse={() => setConfirmReverse(selected)}
            />
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--ink-200)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--ink-100)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
              <span>Punches · {punches.length}</span>
              <span className="font-medium normal-case tracking-normal text-[var(--ink-500)]">
                Sorted by time ↓
              </span>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-[var(--ink-500)]">Loading…</div>
              ) : punches.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--ink-500)]">No punches found.</div>
              ) : (
                punches.map((p) => (
                  <div
                    key={p.id}
                    ref={(el) => {
                      rowRefs.current[p.id] = el
                    }}
                    onClick={() => setSelectedId(p.id)}
                    className={`flex cursor-pointer gap-2.5 border-b border-[var(--ink-100)] p-3.5 last:border-b-0 transition-colors ${
                      p.id === selectedId
                        ? 'border-l-[3px] border-l-[var(--teal-600)] bg-[var(--teal-50)]'
                        : 'border-l-[3px] border-l-transparent hover:bg-[var(--ink-50)]'
                    }`}
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ink-100)] text-[11px] font-bold text-[var(--ink-600)]">
                      {initials(p.employeeName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="truncate text-[12.5px] font-semibold text-[var(--ink-900)]">
                          {p.employeeName}
                        </div>
                        <StatusPill status={p.status} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
                        <Clock className="h-3 w-3 text-[var(--ink-400)]" />
                        <span className="tabular-nums">{formatTime(p.punchedAt)}</span>
                        <span>·</span>
                        <span>{p.vendorName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
                        <MapPin className="h-3 w-3 text-[var(--ink-400)]" />
                        <span>
                          {p.latitude != null && p.longitude != null
                            ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                            : 'No location'}
                          {p.accuracyMeters != null ? ` · ±${p.accuracyMeters}m` : ''}
                        </span>
                        <span className="ml-auto font-semibold tabular-nums text-[var(--ink-700)]">
                          {p.amount != null ? `$${p.amount.toFixed(2)}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmDouble && (
        <DoublePunchConfirmDialog
          open={!!confirmDouble}
          onOpenChange={(o) => !o && setConfirmDouble(null)}
          employeeName={confirmDouble.employeeName}
          workDate={confirmDouble.workDate}
          vendorName={confirmDouble.vendorName}
          amount={confirmDouble.amount ?? 0}
          onConfirm={async () => {
            const p = confirmDouble
            setConfirmDouble(null)
            await approve(p, true)
          }}
        />
      )}

      {confirmReverse && (
        <ReverseConfirmDialog
          open={!!confirmReverse}
          onOpenChange={(o) => !o && setConfirmReverse(null)}
          amount={confirmReverse.amount ?? 0}
          onConfirm={async () => {
            const p = confirmReverse
            setConfirmReverse(null)
            await reverse(p)
          }}
        />
      )}
    </div>
  )
}

function PunchInspector({
  punch,
  onApprove,
  onDecline,
  onReverse,
}: {
  punch: Punch
  onApprove: () => void
  onDecline: () => void
  onReverse: () => void
}) {
  const isApproved = punch.status === 'approved' && !punch.payRecordReversedAt
  const isPending = punch.status === 'pending'

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--ink-200)] bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-[var(--ink-100)] px-4 py-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--teal-50)] text-xs font-bold text-[var(--teal-700)]">
          {initials(punch.employeeName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[var(--ink-900)]">{punch.employeeName}</div>
          <div className="text-[11.5px] text-[var(--ink-500)]">
            Employee #{punch.employeeId} · {punch.vendorName}
          </div>
        </div>
        <StatusPill status={punch.status} />
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11.5px]">
          <KV k="Punched at" v={`${formatDate(punch.punchedAt)} · ${formatTime(punch.punchedAt)}`} />
          <KV k="Work date" v={formatWorkDate(punch.workDate)} />
          <KV
            k="Coordinates"
            v={
              punch.latitude != null && punch.longitude != null
                ? `${punch.latitude.toFixed(4)}, ${punch.longitude.toFixed(4)}`
                : '—'
            }
          />
          <KV k="Accuracy" v={punch.accuracyMeters != null ? `±${punch.accuracyMeters} meters` : '—'} />
          <KV k="Daily rate" v={punch.amount != null ? `$${punch.amount.toFixed(2)}` : '—'} />
          {punch.decidedByName && <KV k="Decided by" v={punch.decidedByName} />}
        </div>

        {(punch.ipAddress || punch.userAgent) && (
          <div className="mt-3 rounded-md border border-[var(--ink-100)] bg-[var(--ink-50)] p-2.5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
              Forensic context
            </div>
            <div className="font-mono text-[10.5px] leading-relaxed text-[var(--ink-700)]">
              {punch.ipAddress && <div>ip: {punch.ipAddress}</div>}
              {punch.userAgent && <div className="truncate">ua: {punch.userAgent}</div>}
            </div>
          </div>
        )}

        <div className="mt-3.5 flex gap-2">
          {isPending && (
            <>
              <Button
                onClick={onApprove}
                className="flex-1 bg-[var(--status-green-600)] hover:bg-[#047857]"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Approve {punch.amount != null ? `· $${punch.amount.toFixed(2)}` : ''}
              </Button>
              <Button variant="outline" onClick={onDecline}>
                <X className="mr-1.5 h-3.5 w-3.5 text-[var(--status-red-600)]" />
                Decline
              </Button>
            </>
          )}
          {isApproved && (
            <Button variant="outline" onClick={onReverse} className="flex-1">
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Reverse approval
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
        {k}
      </div>
      <div className="mt-0.5 font-medium tabular-nums text-[var(--ink-900)]">{v}</div>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: 'amber' | 'red'
}) {
  return (
    <div className="rounded-lg border border-[var(--ink-200)] bg-white p-3.5 shadow-sm">
      <div className="text-[11px] font-medium text-[var(--ink-500)]">{label}</div>
      <div
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{
          color:
            tone === 'amber'
              ? 'var(--status-amber-600)'
              : tone === 'red'
                ? 'var(--status-red-600)'
                : 'var(--ink-900)',
        }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--ink-500)]">{sub}</div>
    </div>
  )
}

function FilterPills({
  active,
  counts,
  onChange,
}: {
  active: StatusFilter
  counts: { pending: number; approved: number; declined: number; auto_rejected: number }
  onChange: (s: StatusFilter) => void
}) {
  const tabs: { k: StatusFilter; l: string; c: number }[] = [
    { k: 'pending', l: 'Pending review', c: counts.pending },
    { k: 'approved', l: 'Approved', c: counts.approved },
    { k: 'declined', l: 'Declined', c: counts.declined },
    { k: 'all', l: 'All', c: counts.pending + counts.approved + counts.declined + counts.auto_rejected },
  ]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs.map((t) => {
        const isA = t.k === active
        return (
          <button
            key={t.k}
            onClick={() => onChange(t.k)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isA
                ? 'border border-[var(--ink-900)] bg-[var(--ink-900)] text-white'
                : 'border border-[var(--ink-200)] bg-white text-[var(--ink-700)] hover:bg-[var(--ink-50)]'
            }`}
          >
            {t.l}
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${
                isA ? 'bg-white/20 text-white' : 'bg-[var(--ink-100)] text-[var(--ink-700)]'
              }`}
            >
              {t.c}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
    new Date(iso),
  )
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function formatWorkDate(s: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(s + 'T00:00:00'),
  )
}
