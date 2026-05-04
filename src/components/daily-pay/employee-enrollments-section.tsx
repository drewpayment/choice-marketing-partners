'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import EnrollmentFormDialog, { type EnrollmentFormValues } from './enrollment-form-dialog'

type EnrollmentRow = {
  id: number
  employeeId: number
  employeeName: string
  vendorId: number
  vendorName: string
  dailyRate: number
  isActive: boolean
  lastPunchAt: string | null
  totalPunches: number
}

export default function EmployeeEnrollmentsSection({
  employeeId,
  employeeName,
}: {
  employeeId: number
  employeeName: string
}) {
  const [rows, setRows] = useState<EnrollmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<EnrollmentFormValues> | null>(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/daily-pay/enrollments?status=all`,
      )
      const data = await res.json()
      const list: EnrollmentRow[] = (data.enrollments ?? []).filter(
        (r: EnrollmentRow) => r.employeeId === employeeId,
      )
      setRows(list)
    } catch {
      toast.error('Failed to load enrollments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  return (
    <Card className="border-[var(--teal-100)] shadow-[0_0_0_3px_var(--teal-50)]">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--teal-50)]">
            <MapPin className="h-4 w-4 text-[var(--teal-700)]" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base font-bold">
              Daily Pay Enrollments
              <span className="rounded bg-[var(--teal-100)] px-1.5 py-px text-[9px] font-bold text-[var(--teal-700)]">
                NEW
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Vendors this employee can punch in for
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing({ employeeId, employeeName, dailyRate: 100, isActive: true })
            setShowForm(true)
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add enrollment
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No daily-pay enrollments. Add one to allow this employee to punch in.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--ink-50)]">
                <Th>Vendor</Th>
                <Th>Daily rate</Th>
                <Th>Status</Th>
                <Th>Last punch</Th>
                <Th>Total punches</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--ink-100)]">
                  <td className="px-4 py-3 font-semibold text-[var(--ink-700)]">{r.vendorName}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-[var(--ink-900)]">
                    ${r.dailyRate.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {r.isActive ? (
                      <Pill tone="green">Active</Pill>
                    ) : (
                      <Pill tone="neutral">Inactive</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-700)]">
                    {r.lastPunchAt ? new Date(r.lastPunchAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--ink-700)]">{r.totalPunches}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing({
                          id: r.id,
                          employeeId: r.employeeId,
                          employeeName,
                          vendorId: r.vendorId,
                          vendorName: r.vendorName,
                          dailyRate: r.dailyRate,
                          isActive: r.isActive,
                        })
                        setShowForm(true)
                      }}
                      className="inline-flex items-center gap-1 rounded border border-[var(--ink-200)] px-2 py-1 text-xs text-[var(--ink-700)] hover:bg-[var(--ink-50)]"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <EnrollmentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        initial={editing ?? undefined}
        lockEmployee={{ id: employeeId, name: employeeName }}
        onSaved={() => refresh()}
      />
    </Card>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--ink-500)]">
      {children}
    </th>
  )
}

function Pill({ tone, children }: { tone: 'green' | 'neutral'; children: React.ReactNode }) {
  const map = {
    green: 'bg-[var(--status-green-50)] text-[#065f46]',
    neutral: 'bg-[var(--ink-100)] text-[var(--ink-700)]',
  }[tone]
  const dot = {
    green: 'var(--status-green-600)',
    neutral: 'var(--ink-500)',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${map}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {children}
    </span>
  )
}
