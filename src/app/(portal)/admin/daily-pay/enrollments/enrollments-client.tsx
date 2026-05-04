'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import EnrollmentFormDialog, { type EnrollmentFormValues } from '@/components/daily-pay/enrollment-form-dialog'

type EnrollmentRow = {
  id: number
  employeeId: number
  employeeName: string
  employeeEmail: string
  vendorId: number
  vendorName: string
  dailyRate: number
  isActive: boolean
  lastPunchAt: string | null
  totalPunches: number
}

type StatusFilter = 'active' | 'inactive' | 'all'

export default function EnrollmentsClient() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<EnrollmentFormValues> | null>(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/daily-pay/enrollments?${params}`)
      const data = await res.json()
      setEnrollments(data.enrollments ?? [])
    } catch {
      toast.error('Failed to load enrollments')
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

  const counts = useMemo(() => {
    const active = enrollments.filter((e) => e.isActive).length
    const inactive = enrollments.length - active
    const uniqueEmployees = new Set(enrollments.filter((e) => e.isActive).map((e) => e.employeeId)).size
    const uniqueVendors = new Set(enrollments.filter((e) => e.isActive).map((e) => e.vendorId)).size
    const avgRate =
      active === 0
        ? 0
        : enrollments.filter((e) => e.isActive).reduce((s, e) => s + e.dailyRate, 0) / active
    return { active, inactive, uniqueEmployees, uniqueVendors, avgRate }
  }, [enrollments])

  const onDeactivate = async (id: number) => {
    if (!confirm('Deactivate this enrollment? The employee will no longer be able to punch in for this vendor.')) return
    const res = await fetch(`/api/admin/daily-pay/enrollments/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to deactivate')
      return
    }
    toast.success('Enrollment deactivated')
    refresh()
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight text-[var(--ink-900)]">Enrollments</div>
          <div className="mt-1 text-sm text-[var(--ink-500)]">
            Control who can punch in for which vendor and at what daily rate.
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add enrollment
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Active enrollments" value={String(counts.active)} sub={`${counts.uniqueEmployees} unique employees`} />
        <Kpi label="Vendors with daily pay" value={String(counts.uniqueVendors)} sub="active enrollments" />
        <Kpi label="Avg daily rate" value={`$${counts.avgRate.toFixed(2)}`} sub="across active" />
        <Kpi label="Inactive" value={String(counts.inactive)} sub="historical only" />
      </div>

      {/* Filters */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <FilterPills active={status} onChange={setStatus} counts={counts} />
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

      <div className="overflow-hidden rounded-lg border border-[var(--ink-200)] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--ink-200)] bg-[var(--ink-50)]">
              <Th>Employee</Th>
              <Th>Vendor</Th>
              <Th>Daily rate</Th>
              <Th>Last punch</Th>
              <Th>Total punches</Th>
              <Th>Status</Th>
              <Th>{''}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-[var(--ink-500)]">
                  Loading…
                </td>
              </tr>
            ) : enrollments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-[var(--ink-500)]">
                  No enrollments found.
                </td>
              </tr>
            ) : (
              enrollments.map((e) => (
                <tr key={e.id} className="border-b border-[var(--ink-100)] last:border-b-0">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink-100)] text-xs font-bold text-[var(--ink-600)]">
                        {initials(e.employeeName)}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--ink-900)]">{e.employeeName}</div>
                        <div className="text-xs text-[var(--ink-500)]">{e.employeeEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-[var(--ink-700)]">{e.vendorName}</td>
                  <td className="px-3.5 py-3 font-semibold tabular-nums text-[var(--ink-900)]">
                    ${e.dailyRate.toFixed(2)}
                  </td>
                  <td className="px-3.5 py-3 text-[var(--ink-700)]">
                    {e.lastPunchAt ? new Date(e.lastPunchAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3.5 py-3 tabular-nums text-[var(--ink-700)]">{e.totalPunches}</td>
                  <td className="px-3.5 py-3">
                    {e.isActive ? (
                      <Pill tone="green">Active</Pill>
                    ) : (
                      <Pill tone="neutral">Inactive</Pill>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditing({
                            id: e.id,
                            employeeId: e.employeeId,
                            employeeName: e.employeeName,
                            vendorId: e.vendorId,
                            vendorName: e.vendorName,
                            dailyRate: e.dailyRate,
                            isActive: e.isActive,
                          })
                          setShowForm(true)
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[var(--ink-200)] px-2 py-1 text-xs text-[var(--ink-700)] hover:bg-[var(--ink-50)]"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      {e.isActive && (
                        <button
                          onClick={() => onDeactivate(e.id)}
                          className="inline-flex items-center gap-1 rounded border border-[var(--ink-200)] px-2 py-1 text-xs text-[var(--status-red-600)] hover:bg-[var(--status-red-50)]"
                          aria-label="Deactivate"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EnrollmentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        initial={editing ?? undefined}
        onSaved={() => refresh()}
      />
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[var(--ink-200)] bg-white p-3.5 shadow-sm">
      <div className="text-[11px] font-medium text-[var(--ink-500)]">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--ink-900)]">{value}</div>
      <div className="mt-0.5 text-[11px] text-[var(--ink-500)]">{sub}</div>
    </div>
  )
}

function FilterPills({
  active,
  onChange,
  counts,
}: {
  active: StatusFilter
  onChange: (s: StatusFilter) => void
  counts: { active: number; inactive: number }
}) {
  const tabs: { k: StatusFilter; l: string; c: number | null }[] = [
    { k: 'active', l: 'Active', c: counts.active },
    { k: 'inactive', l: 'Inactive', c: counts.inactive },
    { k: 'all', l: 'All', c: counts.active + counts.inactive },
  ]
  return (
    <div className="flex items-center gap-1.5">
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
            {t.c != null && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  isA ? 'bg-white/20 text-white' : 'bg-[var(--ink-100)] text-[var(--ink-700)]'
                }`}
              >
                {t.c}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
      {children}
    </th>
  )
}

function Pill({ tone, children }: { tone: 'green' | 'neutral' | 'amber' | 'red'; children: React.ReactNode }) {
  const map = {
    green: 'bg-[var(--status-green-50)] text-[#065f46]',
    amber: 'bg-[var(--status-amber-50)] text-[#92400e]',
    red: 'bg-[var(--status-red-50)] text-[#991b1b]',
    neutral: 'bg-[var(--ink-100)] text-[var(--ink-700)]',
  }[tone]
  const dot = {
    green: 'var(--status-green-600)',
    amber: 'var(--status-amber-600)',
    red: 'var(--status-red-600)',
    neutral: 'var(--ink-500)',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${map}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {children}
    </span>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
