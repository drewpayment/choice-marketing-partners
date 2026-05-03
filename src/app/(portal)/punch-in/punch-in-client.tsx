'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, AlertTriangle, CheckCircle2, Locate, Mail, Info, RefreshCw } from 'lucide-react'

type EnrollmentLite = {
  id: number
  vendorId: number
  vendorName: string
  dailyRate: number
  lastPunchAt: string | null
}

type PunchLite = {
  id: number
  vendorName: string
  punchedAt: string
  status: 'pending' | 'approved' | 'declined' | 'auto_rejected'
  amount: number | null
  workDate?: string
}

type Props = {
  initial: {
    employeeName: string
    timezone: string
    enrollments: EnrollmentLite[]
    todayPunches: PunchLite[]
    recentPunches: PunchLite[]
  }
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; latitude: number; longitude: number; accuracy: number }
  | { status: 'denied' }
  | { status: 'error'; message: string }

const STATUS_LABEL: Record<PunchLite['status'], string> = {
  pending: 'Pending review',
  approved: 'Approved',
  declined: 'Declined',
  auto_rejected: 'Auto-rejected',
}

function statusToneClasses(status: PunchLite['status']) {
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

function statusDotColor(status: PunchLite['status']) {
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

function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

function formatDate(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

function StatusPill({ status }: { status: PunchLite['status'] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: undefined }}
    >
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${statusToneClasses(status)}`}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDotColor(status) }} />
        {STATUS_LABEL[status]}
      </span>
    </span>
  )
}

function PunchHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="border-b border-[var(--ink-200)] bg-white px-5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
        Choice Marketing Partners
      </div>
      <div className="mt-0.5 text-lg font-bold tracking-tight text-[var(--ink-900)]">{subtitle}</div>
    </div>
  )
}

export default function PunchInClient({ initial }: Props) {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<EnrollmentLite[]>(initial.enrollments)
  const [todayPunches, setTodayPunches] = useState<PunchLite[]>(initial.todayPunches)
  const [recentPunches, setRecentPunches] = useState<PunchLite[]>(initial.recentPunches)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(
    initial.enrollments[0]?.id ?? null,
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [justPunchedId, setJustPunchedId] = useState<number | null>(null)

  const selectedEnrollment = useMemo(
    () => enrollments.find((e) => e.id === selectedEnrollmentId) ?? enrollments[0] ?? null,
    [enrollments, selectedEnrollmentId],
  )

  const hasEnrollments = enrollments.length > 0
  const hasMultipleEnrollments = enrollments.length > 1
  const hasActiveTodayPunch = todayPunches.some((p) => p.status === 'pending' || p.status === 'approved')

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: 'Geolocation is not supported in this browser.' })
      return
    }
    setGeo({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: 'ready',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ status: 'denied' })
        } else {
          setGeo({ status: 'error', message: err.message || 'Could not determine your location.' })
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    if (hasEnrollments && geo.status === 'idle') {
      requestLocation()
    }
  }, [hasEnrollments, geo.status])

  const refreshState = async () => {
    try {
      const res = await fetch('/api/punch/today', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setTodayPunches(data.todayPunches ?? [])
      setRecentPunches(data.recentPunches ?? [])
      if (Array.isArray(data.enrollments)) {
        setEnrollments(data.enrollments)
      }
    } catch {
      /* noop */
    }
    router.refresh()
  }

  const submitPunch = async () => {
    if (!selectedEnrollment) {
      toast.error('Choose a vendor before punching in.')
      return
    }
    if (geo.status !== 'ready') {
      toast.error('Waiting on location.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedEnrollment.vendorId,
          latitude: geo.latitude,
          longitude: geo.longitude,
          accuracyMeters: geo.accuracy,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Could not record punch.')
        return
      }
      setJustPunchedId(data.id)
      toast.success("You're punched in. Awaiting review.")
      await refreshState()
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render branches ──
  if (!hasEnrollments) {
    return <NotEnrolledScreen />
  }

  if (justPunchedId) {
    const just = todayPunches.find((p) => p.id === justPunchedId) ?? {
      id: justPunchedId,
      vendorName: selectedEnrollment?.vendorName ?? '',
      punchedAt: new Date().toISOString(),
      status: 'pending' as const,
      amount: selectedEnrollment?.dailyRate ?? null,
    }
    return (
      <SuccessScreen
        punch={just}
        timezone={initial.timezone}
        latitude={geo.status === 'ready' ? geo.latitude : null}
        longitude={geo.status === 'ready' ? geo.longitude : null}
        accuracy={geo.status === 'ready' ? geo.accuracy : null}
        onDone={() => setJustPunchedId(null)}
      />
    )
  }

  if (geo.status === 'denied') {
    return <DeniedScreen onRetry={requestLocation} />
  }

  if (hasActiveTodayPunch && !pickerOpen) {
    return (
      <AlreadyPunchedScreen
        todayPunches={todayPunches}
        timezone={initial.timezone}
        onPunchAgain={() => setPickerOpen(true)}
      />
    )
  }

  // Default / Locating shared screen — both render the main punch panel
  return (
    <DefaultScreen
      employeeName={initial.employeeName}
      timezone={initial.timezone}
      enrollments={enrollments}
      selectedEnrollment={selectedEnrollment}
      onSelectEnrollment={setSelectedEnrollmentId}
      hasMultipleEnrollments={hasMultipleEnrollments}
      geo={geo}
      onRetryLocation={requestLocation}
      submitting={submitting}
      onSubmit={submitPunch}
      todayPunches={todayPunches}
      recentPunches={recentPunches}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-screens
// ─────────────────────────────────────────────────────────────────────────

function PunchCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto flex min-h-[calc(100vh-7rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--ink-200)] bg-[#F2F2F7] shadow-md md:max-w-[520px] ${className}`}
    >
      {children}
    </div>
  )
}

function PunchButton({
  ready,
  loading,
  onClick,
}: {
  ready: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!ready || loading}
      className="relative flex h-40 w-40 cursor-pointer flex-col items-center justify-center rounded-full text-white shadow-[0_16px_36px_rgba(13,138,138,0.35)] outline-none ring-8 ring-[rgba(13,138,138,0.08)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: 'radial-gradient(circle at 30% 25%, #0d8a8a 0%, #075959 100%)',
      }}
      aria-label="Punch in"
    >
      <MapPin className="h-8 w-8" strokeWidth={2} />
      <div className="mt-1.5 text-base font-bold tracking-[0.4px]">
        {loading ? 'PUNCHING…' : 'PUNCH IN'}
      </div>
      <div className="mt-0.5 text-[10px] opacity-80">Tap and hold to confirm</div>
    </button>
  )
}

function GpsBadge({ geo, onRetry }: { geo: GeoState; onRetry: () => void }) {
  if (geo.status === 'ready') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
        <Locate className="h-3 w-3 text-[var(--status-green-600)]" />
        Location ready · ±{geo.accuracy}m accuracy
      </div>
    )
  }
  if (geo.status === 'locating') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
        <Locate className="h-3 w-3 animate-pulse text-[var(--teal-600)]" />
        Locating…
      </div>
    )
  }
  if (geo.status === 'error') {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-[11px] text-[var(--status-red-600)]"
      >
        <AlertTriangle className="h-3 w-3" />
        {geo.message} — tap to retry
      </button>
    )
  }
  return (
    <button
      onClick={onRetry}
      className="flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]"
    >
      <Locate className="h-3 w-3 text-[var(--ink-400)]" />
      Get location
    </button>
  )
}

function DefaultScreen({
  employeeName,
  timezone,
  enrollments,
  selectedEnrollment,
  onSelectEnrollment,
  hasMultipleEnrollments,
  geo,
  onRetryLocation,
  submitting,
  onSubmit,
  todayPunches,
  recentPunches,
}: {
  employeeName: string
  timezone: string
  enrollments: EnrollmentLite[]
  selectedEnrollment: EnrollmentLite | null
  onSelectEnrollment: (id: number) => void
  hasMultipleEnrollments: boolean
  geo: GeoState
  onRetryLocation: () => void
  submitting: boolean
  onSubmit: () => void
  todayPunches: PunchLite[]
  recentPunches: PunchLite[]
}) {
  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  const firstName = employeeName.split(' ')[0] || ''

  return (
    <div className="px-4 py-6 md:px-8">
      {/* Greeting (web variant) */}
      <div className="mx-auto hidden max-w-[920px] md:mb-6 md:block">
        <div className="text-xs font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
          Daily Punch
        </div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--ink-900)]">
          Good morning, {firstName || 'there'}
        </div>
        <div className="mt-1 text-sm text-[var(--ink-500)]">
          Punch in to record today&apos;s daily incentive. Admins review and approve punches.
        </div>
      </div>

      <div className="mx-auto grid max-w-[920px] gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-[var(--ink-200)] bg-white shadow-sm">
          <PunchHeader subtitle="Daily punch" />

          <div className="px-5 py-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
              Today, {today}
            </div>
            <button
              onClick={() => hasMultipleEnrollments && onSelectEnrollment(0)}
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--ink-200)] bg-white p-3.5 text-left disabled:cursor-default"
              disabled={!hasMultipleEnrollments}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--teal-50)]">
                <MapPin className="h-4.5 w-4.5 text-[var(--teal-700)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--ink-900)]">
                  {selectedEnrollment?.vendorName ?? 'No vendor'}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--ink-500)]">
                  ${selectedEnrollment?.dailyRate.toFixed(2) ?? '0.00'} / day · vendor
                </div>
              </div>
              {hasMultipleEnrollments && (
                <span className="text-xs text-[var(--teal-700)]">Change</span>
              )}
            </button>

            {hasMultipleEnrollments && (
              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--ink-200)] bg-white">
                {enrollments.map((e) => {
                  const sel = e.id === selectedEnrollment?.id
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectEnrollment(e.id)}
                      className={`flex w-full items-center gap-3 border-b border-[var(--ink-100)] px-3.5 py-3 text-left last:border-b-0 ${
                        sel ? 'bg-[var(--teal-50)]' : ''
                      }`}
                    >
                      <div
                        className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          sel ? 'border-[var(--teal-600)]' : 'border-[var(--ink-300)]'
                        }`}
                      >
                        {sel && <div className="h-2 w-2 rounded-full bg-[var(--teal-600)]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--ink-900)]">{e.vendorName}</div>
                      </div>
                      <div className="text-xs font-semibold tabular-nums text-[var(--ink-700)]">
                        ${e.dailyRate.toFixed(2)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--ink-200)] bg-gradient-to-b from-[var(--teal-50)] to-white px-4 py-7">
              {geo.status === 'locating' ? (
                <LocatingAnimation />
              ) : (
                <PunchButton ready={geo.status === 'ready'} loading={submitting} onClick={onSubmit} />
              )}
              <GpsBadge geo={geo} onRetry={onRetryLocation} />
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
              <Info className="h-3 w-3 text-[var(--ink-400)]" />
              Your location is only captured at punch time. Pending punches expire at the configured cutoff.
            </div>
          </div>
        </div>

        {/* Side column — only shows when there are recent punches or weekly progress (web only) */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--ink-200)] bg-white p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
              Today&apos;s status
            </div>
            <div className="mt-2">
              {todayPunches.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-100)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-700)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-500)]" />
                  Not punched yet
                </span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {todayPunches.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ink-700)]">
                        <strong className="tabular-nums">{formatTime(p.punchedAt, timezone)}</strong> ·{' '}
                        {p.vendorName}
                      </span>
                      <StatusPill status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {recentPunches.length > 0 && (
            <div className="rounded-xl border border-[var(--ink-200)] bg-white p-4 shadow-sm">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
                Recent
              </div>
              <div className="flex flex-col">
                {recentPunches.slice(0, 5).map((p, i, arr) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between py-2 text-xs ${
                      i < arr.length - 1 ? 'border-b border-[var(--ink-100)]' : ''
                    }`}
                  >
                    <div className="text-[var(--ink-800)]">
                      <span className="tabular-nums">{formatDate(p.punchedAt, timezone)}</span>
                      <span className="ml-2 text-[var(--ink-500)]">{p.vendorName}</span>
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LocatingAnimation() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <div className="absolute inset-0 animate-pulse rounded-full bg-[var(--teal-50)] opacity-80" />
      <div className="absolute inset-4 animate-pulse rounded-full bg-[var(--teal-100)] opacity-60" />
      <div className="absolute inset-9 rounded-full border-2 border-[var(--teal-600)] bg-[var(--teal-50)]" />
      <Locate className="relative h-7 w-7 text-[var(--teal-700)]" strokeWidth={2} />
    </div>
  )
}

function DeniedScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <PunchCard>
      <PunchHeader subtitle="Daily punch" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-[var(--status-red-50)] p-3.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white">
            <AlertTriangle className="h-4 w-4 text-[var(--status-red-600)]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#991b1b]">Location blocked</div>
            <div className="mt-1 text-xs leading-relaxed text-[#7f1d1d]">
              We can&apos;t record your punch without coordinates. Enable location for this site, then tap retry.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ink-200)] bg-white p-3.5">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
            How to fix
          </div>
          <ol className="list-inside list-decimal space-y-1 text-xs text-[var(--ink-700)]">
            <li>Open browser settings</li>
            <li>
              Find <strong>Site permissions</strong> → Location
            </li>
            <li>Allow this site</li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry location
          </Button>
        </div>
      </div>
    </PunchCard>
  )
}

function SuccessScreen({
  punch,
  timezone,
  latitude,
  longitude,
  accuracy,
  onDone,
}: {
  punch: PunchLite
  timezone: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  onDone: () => void
}) {
  return (
    <PunchCard>
      <PunchHeader subtitle="Daily punch" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-200 bg-[var(--status-green-50)]">
            <CheckCircle2 className="h-12 w-12 text-[var(--status-green-600)]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--ink-900)]">You&apos;re punched in</div>
            <div className="mt-1 text-xs text-[var(--ink-500)]">Your punch is awaiting admin review.</div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ink-200)] bg-white p-3">
          {[
            ['Vendor', punch.vendorName],
            ['Time', formatTime(punch.punchedAt, timezone)],
            ['Date', formatDate(punch.punchedAt, timezone)],
            [
              'Location',
              latitude !== null && longitude !== null
                ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)} · ±${accuracy ?? 0}m`
                : '—',
            ],
          ].map(([k, v], i, a) => (
            <div
              key={k}
              className={`flex items-center justify-between py-1.5 ${
                i < a.length - 1 ? 'border-b border-[var(--ink-100)]' : ''
              }`}
            >
              <div className="text-[11px] text-[var(--ink-500)]">{k}</div>
              <div className="text-[11px] font-medium tabular-nums text-[var(--ink-800)]">{v}</div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[var(--ink-100)] pt-2">
            <div className="text-[11px] text-[var(--ink-500)]">Status</div>
            <StatusPill status={punch.status} />
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    </PunchCard>
  )
}

function AlreadyPunchedScreen({
  todayPunches,
  timezone,
  onPunchAgain,
}: {
  todayPunches: PunchLite[]
  timezone: string
  onPunchAgain: () => void
}) {
  return (
    <PunchCard>
      <PunchHeader subtitle="Daily punch" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-[var(--status-amber-50)] p-3.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white">
            <AlertTriangle className="h-4 w-4 text-[var(--status-amber-600)]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#92400e]">Already punched today</div>
            <div className="mt-1 text-xs leading-relaxed text-[#78350f]">
              Admins approve one punch per day; a second one needs admin confirmation.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ink-200)] bg-white p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
            Today&apos;s punches
          </div>
          <div className="flex flex-col gap-2">
            {todayPunches.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <div className="text-[var(--ink-700)]">
                  <Clock className="mr-1.5 inline h-3 w-3 text-[var(--ink-400)]" />
                  <span className="font-bold tabular-nums">{formatTime(p.punchedAt, timezone)}</span>{' '}
                  · {p.vendorName}
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={onPunchAgain}>
            Punch again anyway
          </Button>
        </div>
      </div>
    </PunchCard>
  )
}

function NotEnrolledScreen() {
  return (
    <PunchCard>
      <PunchHeader subtitle="Daily punch" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ink-100)]">
            <Info className="h-7 w-7 text-[var(--ink-500)]" />
          </div>
          <div>
            <div className="text-base font-bold text-[var(--ink-900)]">Not enrolled</div>
            <div className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-[var(--ink-500)]">
              You&apos;re not enrolled in the daily-pay program for any vendor. Contact an admin to be added.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ink-200)] bg-white p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--ink-700)]">
            Need help?
          </div>
          <div className="text-xs leading-relaxed text-[var(--ink-600)]">
            Email{' '}
            <span className="font-semibold text-[var(--teal-700)]">
              payroll@choicemarketingpartners.com
            </span>{' '}
            with your vendor and start date.
          </div>
        </div>

        <a
          href="mailto:payroll@choicemarketingpartners.com"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[var(--ink-200)] bg-white text-sm font-semibold text-[var(--ink-700)]"
        >
          <Mail className="h-3.5 w-3.5" />
          Contact payroll
        </a>
      </div>
    </PunchCard>
  )
}
