'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { toast } from 'sonner'

export interface EnrollmentFormValues {
  id?: number
  employeeId: number
  employeeName?: string
  vendorId: number
  vendorName?: string
  dailyRate: number
  isActive: boolean
}

type Vendor = { id: number; name: string }
type Employee = { id: number; name: string; email: string }

export default function EnrollmentFormDialog({
  open,
  onOpenChange,
  initial,
  lockEmployee,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<EnrollmentFormValues>
  /** When set, the employee picker is locked (used on employee detail page). */
  lockEmployee?: { id: number; name: string }
  onSaved: () => void
}) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [employeeId, setEmployeeId] = useState<number | undefined>(
    lockEmployee?.id ?? initial?.employeeId,
  )
  const [vendorId, setVendorId] = useState<number | undefined>(initial?.vendorId)
  const [dailyRate, setDailyRate] = useState<number>(initial?.dailyRate ?? 100)
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true)
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!initial?.id

  useEffect(() => {
    if (!open) return
    setEmployeeId(lockEmployee?.id ?? initial?.employeeId)
    setVendorId(initial?.vendorId)
    setDailyRate(initial?.dailyRate ?? 100)
    setIsActive(initial?.isActive ?? true)
  }, [open, initial, lockEmployee])

  useEffect(() => {
    if (!open) return
    Promise.all([
      lockEmployee
        ? Promise.resolve([{ id: lockEmployee.id, name: lockEmployee.name, email: '' }])
        : fetch('/api/employees?status=active&limit=100')
            .then((r) => r.json())
            .then((d) => (d.employees ?? []).map((e: { id: number; name: string; email: string }) => ({
              id: e.id,
              name: e.name,
              email: e.email,
            }))),
      fetch('/api/vendors?status=active')
        .then((r) => r.json())
        .then((d) => {
          const list = Array.isArray(d) ? d : (d.vendors ?? [])
          return list.map((v: { id?: number; vendor_id?: number; name?: string; vendor_name?: string }) => ({
            id: Number(v.id ?? v.vendor_id),
            name: String(v.name ?? v.vendor_name ?? ''),
          }))
        }),
    ])
      .then(([emps, vens]) => {
        setEmployees(emps)
        setVendors(vens)
      })
      .catch(() => toast.error('Failed to load options'))
  }, [open, lockEmployee])

  const submit = async () => {
    if (!employeeId || !vendorId) {
      toast.error('Choose an employee and vendor')
      return
    }
    setSubmitting(true)
    try {
      const url = isEdit
        ? `/api/admin/daily-pay/enrollments/${initial!.id}`
        : '/api/admin/daily-pay/enrollments'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit
        ? { dailyRate, isActive }
        : { employeeId, vendorId, dailyRate, isActive }
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save enrollment')
        return
      }
      toast.success(isEdit ? 'Enrollment updated' : 'Enrollment created')
      onOpenChange(false)
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit enrollment' : 'Add enrollment'}</DialogTitle>
          <DialogDescription>
            Daily-pay enrollments give an employee a per-vendor daily rate. Punches roll up to that
            week&apos;s paystub.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Employee</Label>
            {lockEmployee ? (
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
                {lockEmployee.name}
              </div>
            ) : (
              <TypeaheadSelect
                options={employees.map((e) => ({ key: e.id, value: `${e.name} · ${e.email}` }))}
                value={employeeId}
                onValueChange={(v) => setEmployeeId(typeof v === 'number' ? v : undefined)}
                placeholder="Select employee"
                searchPlaceholder="Search by name or email…"
                disabled={isEdit}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Vendor</Label>
            <TypeaheadSelect
              options={vendors.map((v) => ({ key: v.id, value: v.name }))}
              value={vendorId}
              onValueChange={(v) => setVendorId(typeof v === 'number' ? v : undefined)}
              placeholder="Select vendor"
              searchPlaceholder="Search vendors…"
              disabled={isEdit}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Daily rate</Label>
            <CurrencyInput value={dailyRate} onChange={setDailyRate} />
            <p className="text-xs text-muted-foreground">Amount paid per approved punch.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-input p-3">
            <div>
              <Label className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive enrollments cannot punch in or be approved.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create enrollment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
