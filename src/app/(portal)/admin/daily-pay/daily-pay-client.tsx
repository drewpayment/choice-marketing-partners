'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { Loader2, Trash2, Pencil, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

// Kept in sync with ADVANCE_METHODS in AdvanceRepository (server-only, not imported here).
const ADVANCE_METHODS = ['cash', 'ach', 'check', 'other'] as const
type AdvanceMethod = (typeof ADVANCE_METHODS)[number]

const METHOD_LABEL: Record<AdvanceMethod, string> = {
  cash: 'Cash',
  ach: 'ACH',
  check: 'Check',
  other: 'Other',
}

interface AgentOption {
  id: number
  name: string
}

interface VendorOption {
  id: number
  name: string
}

interface Advance {
  advance_id: number
  agentid: number
  vendor_id: number
  amount: number
  advance_date: string
  issue_date: string
  wkending: string
  method: string
  notes: string
}

const today = () => dayjs().format('YYYY-MM-DD')

// Most recent Saturday on/before today — a sensible default statement week-ending.
const defaultWeekEnding = () => {
  const d = dayjs()
  const daysSinceSaturday = (d.day() + 1) % 7 // Sat=0
  return d.subtract(daysSinceSaturday, 'day').format('YYYY-MM-DD')
}

// Recent issue dates arrive from /api/invoices as MM-DD-YYYY; normalize to ISO.
function toIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const m = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value
}

const CUSTOM_DATE = '__custom__'

export default function DailyPayClient() {
  const { toast } = useToast()

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [issueDates, setIssueDates] = useState<string[]>([])
  // Statements for the currently selected agent+vendor pair (most recent first),
  // used to populate the issue-date dropdown and auto-fill week-ending.
  const [pairStatements, setPairStatements] = useState<
    { issueDate: string; weekendDate: string | null }[]
  >([])
  const [lookupsLoading, setLookupsLoading] = useState(true)

  // Form state
  const [agentId, setAgentId] = useState<number | undefined>(undefined)
  const [vendorId, setVendorId] = useState<string>('')
  const [amount, setAmount] = useState(0)
  const [amountTouched, setAmountTouched] = useState(false)
  const [advanceDate, setAdvanceDate] = useState(today())
  const [method, setMethod] = useState<AdvanceMethod>('cash')
  const [notes, setNotes] = useState('')
  const [issueDateChoice, setIssueDateChoice] = useState('')
  const [customIssueDate, setCustomIssueDate] = useState('')
  const [wkending, setWkending] = useState(defaultWeekEnding())
  const [submitting, setSubmitting] = useState(false)

  // Recent list
  const [advances, setAdvances] = useState<Advance[]>([])
  const [listLoading, setListLoading] = useState(false)

  // Edit / delete dialogs
  const [editing, setEditing] = useState<Advance | null>(null)
  const [deleting, setDeleting] = useState<Advance | null>(null)

  const resolvedIssueDate =
    issueDateChoice === CUSTOM_DATE ? customIssueDate : issueDateChoice

  // <= 0 (or a negative entry) is invalid; surfaced inline once the field is touched.
  const amountInvalid = !(amount > 0)

  // Prefer the selected pair's own statements; fall back to the global recent dates.
  const issueDateOptions =
    pairStatements.length > 0 ? pairStatements.map(s => s.issueDate) : issueDates

  const handleIssueDateChange = (value: string) => {
    setIssueDateChoice(value)
    if (value !== CUSTOM_DATE) {
      const match = pairStatements.find(s => s.issueDate === value)
      if (match?.weekendDate) setWkending(match.weekendDate)
    }
  }

  // Load agents / vendors / issue dates (same source as the statement builder).
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/invoices')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setAgents(json.data.agents || [])
            setVendors(json.data.vendors || [])
            const dates: string[] = (json.data.issueDates || []).map(toIso)
            setIssueDates(dates)
            if (dates.length > 0) setIssueDateChoice(dates[0])
          }
        }
      } catch (error) {
        logger.error('Failed to load daily-pay lookups:', error)
      } finally {
        setLookupsLoading(false)
      }
    }
    load()
  }, [])

  const loadAdvances = useCallback(async () => {
    if (!agentId) {
      setAdvances([])
      return
    }
    setListLoading(true)
    try {
      const params = new URLSearchParams({ agentId: String(agentId) })
      if (vendorId) params.set('vendorId', vendorId)
      const res = await fetch(`/api/advances?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setAdvances((json.data || []).slice(0, 20))
      }
    } catch (error) {
      logger.error('Failed to load advances:', error)
    } finally {
      setListLoading(false)
    }
  }, [agentId, vendorId])

  useEffect(() => {
    loadAdvances()
  }, [loadAdvances])

  // Load the selected agent+vendor pair's recent statements for the issue-date
  // dropdown. Falls back to the global recent dates when the pair has none.
  useEffect(() => {
    if (!agentId || !vendorId) {
      setPairStatements([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const params = new URLSearchParams({
          employeeId: String(agentId),
          vendorId,
          limit: '8',
        })
        const res = await fetch(`/api/payroll?${params.toString()}`)
        if (!res.ok) {
          if (!cancelled) setPairStatements([])
          return
        }
        const json = await res.json()
        const rows = (json.data || []) as Array<{
          issueDate: string
          weekendDate: string | null
        }>
        // API already orders most-recent first; dedupe by issue date.
        const seen = new Set<string>()
        const statements: { issueDate: string; weekendDate: string | null }[] = []
        for (const r of rows) {
          const iso = toIso(r.issueDate)
          if (seen.has(iso)) continue
          seen.add(iso)
          statements.push({
            issueDate: iso,
            weekendDate: r.weekendDate ? toIso(r.weekendDate) : null,
          })
        }
        if (!cancelled) setPairStatements(statements)
      } catch (error) {
        logger.error('Failed to load statements for pair:', error)
        if (!cancelled) setPairStatements([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [agentId, vendorId])

  // When the pair's statements load, default to the most recent and auto-fill
  // week-ending from that statement.
  useEffect(() => {
    if (pairStatements.length === 0) return
    const [latest] = pairStatements
    setIssueDateChoice(latest.issueDate)
    if (latest.weekendDate) setWkending(latest.weekendDate)
  }, [pairStatements])

  const resetForm = () => {
    setAmount(0)
    setAmountTouched(false)
    setAdvanceDate(today())
    setMethod('cash')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!agentId) {
      toast({ title: 'Select an agent', variant: 'destructive' })
      return
    }
    if (!vendorId) {
      toast({ title: 'Select a vendor', variant: 'destructive' })
      return
    }
    if (amountInvalid) {
      setAmountTouched(true)
      toast({ title: 'Enter an amount greater than $0', variant: 'destructive' })
      return
    }
    if (!advanceDate) {
      toast({ title: 'Select the date paid', variant: 'destructive' })
      return
    }
    if (!resolvedIssueDate) {
      toast({ title: 'Select the statement issue date', variant: 'destructive' })
      return
    }
    if (!wkending) {
      toast({ title: 'Select the week ending', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          vendorId: parseInt(vendorId),
          amount: Math.abs(amount),
          advanceDate,
          issueDate: resolvedIssueDate,
          wkending,
          method,
          notes,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to record daily pay')
      }
      toast({ title: 'Daily pay recorded', description: `${METHOD_LABEL[method]} payment saved.` })
      resetForm()
      loadAdvances()
    } catch (error) {
      toast({
        title: 'Could not record daily pay',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/advances/${deleting.advance_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete')
      }
      toast({ title: 'Daily pay deleted' })
      setDeleting(null)
      loadAdvances()
    } catch (error) {
      toast({
        title: 'Could not delete',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const agentOptions = agents.map(a => ({ key: a.id, value: a.name }))

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Pay Entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record cash or transfers paid to an agent during the week. These are subtracted from the
          agent&apos;s net pay on the matching statement.
        </p>
      </div>

      {/* Entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Record daily pay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Agent</Label>
              <TypeaheadSelect
                options={agentOptions}
                value={agentId}
                onValueChange={v =>
                  setAgentId(v === undefined ? undefined : typeof v === 'number' ? v : parseInt(v))
                }
                placeholder="Select agent"
                searchPlaceholder="Search agents..."
                disabled={lookupsLoading}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId} disabled={lookupsLoading}>
                <SelectTrigger id="vendor" className="min-h-11">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <CurrencyInput
                value={amount}
                onChange={v => {
                  setAmount(v)
                  setAmountTouched(true)
                }}
                placeholder="$0.00"
                className={
                  amountTouched && amountInvalid
                    ? 'min-h-11 tabular-nums border-destructive focus-visible:ring-destructive'
                    : 'min-h-11 tabular-nums'
                }
              />
              {amountTouched && amountInvalid && (
                <p className="text-xs text-destructive" role="alert">
                  Amount must be greater than $0
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advanceDate">Date paid</Label>
              <Input
                id="advanceDate"
                type="date"
                value={advanceDate}
                onChange={e => setAdvanceDate(e.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method">Method</Label>
              <Select value={method} onValueChange={v => setMethod(v as AdvanceMethod)}>
                <SelectTrigger id="method" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADVANCE_METHODS.map(m => (
                    <SelectItem key={m} value={m}>
                      {METHOD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Statement issue date</Label>
              <Select value={issueDateChoice} onValueChange={handleIssueDateChange}>
                <SelectTrigger id="issueDate" className="min-h-11">
                  <SelectValue placeholder="Select issue date" />
                </SelectTrigger>
                <SelectContent>
                  {issueDateOptions.map(d => (
                    <SelectItem key={d} value={d}>
                      {dayjs(d).format('MM/DD/YYYY')}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_DATE} className="font-medium text-primary">
                    Custom date…
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {issueDateChoice === CUSTOM_DATE && (
              <div className="space-y-1.5">
                <Label htmlFor="customIssueDate">Custom issue date</Label>
                <Input
                  id="customIssueDate"
                  type="date"
                  value={customIssueDate}
                  onChange={e => setCustomIssueDate(e.target.value)}
                  className="min-h-11"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wkending">Week ending</Label>
              <Input
                id="wkending"
                type="date"
                value={wkending}
                onChange={e => setWkending(e.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Friday cash draw"
                className="min-h-11"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting} className="min-h-11">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Record daily pay'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent daily pay */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Recent daily pay
            {agentId && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({advances.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!agentId ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <HandCoins className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              Select an agent to view their recent daily pay.
            </div>
          ) : listLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : advances.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No daily pay recorded for this agent yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {advances.map(advance => (
                <div key={advance.advance_id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {dayjs(advance.advance_date).format('MM/DD/YYYY')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {METHOD_LABEL[(advance.method as AdvanceMethod)] ?? advance.method}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Statement {dayjs(advance.issue_date).format('MM/DD/YYYY')}
                      {advance.notes ? ` · ${advance.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(advance.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      aria-label="Edit"
                      onClick={() => setEditing(advance)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-destructive hover:text-destructive"
                      aria-label="Delete"
                      onClick={() => setDeleting(advance)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <EditAdvanceDialog
          advance={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            loadAdvances()
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this daily pay entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    deleting.amount
                  )}{' '}
                  paid {dayjs(deleting.advance_date).format('MM/DD/YYYY')}. This cannot be undone and
                  will change the agent&apos;s net pay.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface EditAdvanceDialogProps {
  advance: Advance
  onClose: () => void
  onSaved: () => void
}

function EditAdvanceDialog({ advance, onClose, onSaved }: EditAdvanceDialogProps) {
  const { toast } = useToast()
  const [amount, setAmount] = useState(advance.amount)
  const [amountTouched, setAmountTouched] = useState(false)
  const [advanceDate, setAdvanceDate] = useState(advance.advance_date)
  const [method, setMethod] = useState<AdvanceMethod>(
    (ADVANCE_METHODS.includes(advance.method as AdvanceMethod)
      ? advance.method
      : 'other') as AdvanceMethod
  )
  const [notes, setNotes] = useState(advance.notes ?? '')
  const [saving, setSaving] = useState(false)

  const amountInvalid = !(amount > 0)

  const handleSave = async () => {
    if (amountInvalid) {
      setAmountTouched(true)
      toast({ title: 'Enter an amount greater than $0', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/advances/${advance.advance_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.abs(amount), advanceDate, method, notes }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update')
      }
      toast({ title: 'Daily pay updated' })
      onSaved()
    } catch (error) {
      toast({
        title: 'Could not update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit daily pay</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Amount</Label>
            <CurrencyInput
              value={amount}
              onChange={v => {
                setAmount(v)
                setAmountTouched(true)
              }}
              className={
                amountTouched && amountInvalid
                  ? 'min-h-11 tabular-nums border-destructive focus-visible:ring-destructive'
                  : 'min-h-11 tabular-nums'
              }
            />
            {amountTouched && amountInvalid && (
              <p className="text-xs text-destructive" role="alert">
                Amount must be greater than $0
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Date paid</Label>
            <Input
              id="edit-date"
              type="date"
              value={advanceDate}
              onChange={e => setAdvanceDate(e.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-method">Method</Label>
            <Select value={method} onValueChange={v => setMethod(v as AdvanceMethod)}>
              <SelectTrigger id="edit-method" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADVANCE_METHODS.map(m => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-11"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
