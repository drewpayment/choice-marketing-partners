'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  Trash2,
  Pencil,
  Repeat,
  Plus,
  History,
  Info,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DialogDescription,
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
import { cn } from '@/lib/utils'

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'monthly_weekday'] as const
type Frequency = (typeof FREQUENCIES)[number]
const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  monthly_weekday: 'Monthly (day of week)',
}

// monthly_week: 1=first … 4=fourth, 5=last
const ORDINALS: { value: string; label: string }[] = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '5', label: 'Last' },
]
// monthly_weekday: 0=Sunday … 6=Saturday (matches JS Date.getDay())
const WEEKDAYS: { value: string; label: string }[] = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

/** Human-readable cadence, e.g. "First Monday of month" for monthly_weekday. */
function cadenceLabel(t: Pick<Template, 'frequency' | 'monthly_week' | 'monthly_weekday'>): string {
  if (t.frequency === 'monthly_weekday' && t.monthly_week != null && t.monthly_weekday != null) {
    const ord = ORDINALS.find(o => o.value === String(t.monthly_week))?.label ?? ''
    const day = WEEKDAYS.find(w => w.value === String(t.monthly_weekday))?.label ?? ''
    return `${ord} ${day} of month`.trim()
  }
  return FREQUENCY_LABEL[t.frequency]
}

// Date-only parsing: dayjs('YYYY-MM-DD') parses at local midnight, avoiding the
// UTC off-by-one that `new Date('YYYY-MM-DD')` introduces. Never use new Date here.
const fmtDate = (d: string, format: string) => dayjs(d).format(format)

/** "Next applies" copy + whether it should render muted. */
function nextAppliesLabel(next: NextDue): { text: string; muted: boolean } {
  switch (next.kind) {
    case 'every_week':
      return { text: 'Every statement week', muted: false }
    case 'week_window':
      return { text: `Week of ${fmtDate(next.start, 'MMM D')}–${fmtDate(next.end, 'MMM D')}`, muted: false }
    case 'date':
      return { text: fmtDate(next.date, 'ddd, MMM D'), muted: false }
    case 'ended':
      return { text: 'Ended', muted: true }
    case 'paused':
      return { text: 'Paused', muted: true }
    default:
      return { text: '—', muted: true }
  }
}

/** "Last applied" copy + whether it should render muted. */
function lastAppliedLabel(last: LastApplied): { text: string; hint: string | null; muted: boolean } {
  if (!last) return { text: 'Never', hint: null, muted: true }
  const weeks = dayjs().startOf('day').diff(dayjs(last.wkending).startOf('day'), 'week')
  const hint =
    weeks < 0
      ? 'upcoming week'
      : weeks === 0
        ? 'this week'
        : weeks === 1
          ? '1 week ago'
          : `${weeks} weeks ago`
  return { text: `Wk ending ${fmtDate(last.wkending, 'MMM D')}`, hint, muted: false }
}

interface AgentOption {
  id: number
  name: string
}
interface VendorOption {
  id: number
  name: string
}

type NextDue =
  | { kind: 'every_week' }
  | { kind: 'week_window'; start: string; end: string }
  | { kind: 'date'; date: string }
  | { kind: 'ended' }
  | { kind: 'paused' }

type LastApplied = { issue_date: string; wkending: string; applied_at: string } | null

interface Template {
  id: number
  agentid: number
  vendor_id: number
  type: string
  amount: number
  notes: string
  frequency: Frequency
  monthly_week: number | null
  monthly_weekday: number | null
  start_date: string
  end_date: string | null
  is_active: number
  agent_name?: string
  vendor_name?: string
  last_applied?: LastApplied
  next_due?: NextDue
}

interface Application {
  id: number
  issue_date: string
  wkending: string
  amount: number
  applied_at: string
  applied_by_name: string | null
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

type StatusFilter = 'active' | 'paused' | 'all'

export default function RecurringExpensesClient() {
  const { toast } = useToast()

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])

  const [templates, setTemplates] = useState<Template[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)
  const [historyFor, setHistoryFor] = useState<Template | null>(null)

  // Lookups (agents + vendors) for the create/edit dialog.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/invoices')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setAgents(json.data.agents || [])
            setVendors(json.data.vendors || [])
          }
        }
      } catch (error) {
        logger.error('Failed to load lookups:', error)
      }
    }
    load()
  }, [])

  // Landing: ALL templates the user may see (no agentId — see contract).
  const loadTemplates = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch('/api/scheduled-expenses')
      if (res.ok) {
        const json = await res.json()
        setTemplates(json.data || [])
      } else {
        setTemplates([])
      }
    } catch (error) {
      logger.error('Failed to load templates:', error)
      setTemplates([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const vendorName = (t: Template) => t.vendor_name ?? vendors.find(v => v.id === t.vendor_id)?.name ?? `Vendor ${t.vendor_id}`
  const agentName = (t: Template) => t.agent_name ?? agents.find(a => a.id === t.agentid)?.name ?? `Agent ${t.agentid}`

  const counts = useMemo(() => {
    let active = 0
    let paused = 0
    for (const t of templates) {
      if (t.is_active) active++
      else paused++
    }
    return { active, paused, all: templates.length }
  }, [templates])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter(t => {
      if (statusFilter === 'active' && !t.is_active) return false
      if (statusFilter === 'paused' && t.is_active) return false
      if (!q) return true
      return (
        agentName(t).toLowerCase().includes(q) ||
        vendorName(t).toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, statusFilter, search, agents, vendors])

  const togglePause = async (t: Template) => {
    try {
      const res = await fetch(`/api/scheduled-expenses/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !t.is_active }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update')
      }
      toast({ title: t.is_active ? 'Rule paused' : 'Rule resumed' })
      loadTemplates()
    } catch (error) {
      toast({
        title: 'Could not update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/scheduled-expenses/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete')
      }
      toast({ title: 'Rule deleted' })
      setDeleting(null)
      loadTemplates()
    } catch (error) {
      toast({
        title: 'Could not delete',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const chip = (value: StatusFilter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setStatusFilter(value)}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
        statusFilter === value
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs tabular-nums',
          statusFilter === value ? 'bg-primary-foreground/20' : 'bg-muted'
        )}
      >
        {count}
      </span>
    </button>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Expenses</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Rules that auto-populate on an agent&apos;s pay statement each week they&apos;re due.
            Negative amounts are deductions.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="min-h-11 shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          New rule
        </Button>
      </div>

      {/* One-time explainer: how/when rules get applied. */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p>
          A rule is applied automatically when an admin builds a pay statement for a week the rule
          lands in — it injects into the statement builder for you. &quot;Last applied&quot; shows the
          most recent statement it landed on; open a rule&apos;s history to see every time it&apos;s
          been applied.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {chip('active', 'Active', counts.active)}
              {chip('paused', 'Paused', counts.paused)}
              {chip('all', 'All', counts.all)}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter agent, vendor, type…"
                className="min-h-11 pl-9"
              />
            </div>
          </div>

          {listLoading ? (
            <TableSkeleton />
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <Repeat className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No recurring expense rules yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a rule to auto-populate an agent&apos;s pay statements.
              </p>
              <Button
                className="mt-4 min-h-11"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New rule
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No rules match the current filter.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Expense</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Cadence</TableHead>
                      <TableHead>Next applies</TableHead>
                      <TableHead>Last applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(t => {
                      const next = nextAppliesLabel(t.next_due ?? (t.is_active ? { kind: 'every_week' } : { kind: 'paused' }))
                      const last = lastAppliedLabel(t.last_applied ?? null)
                      return (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{agentName(t)}</div>
                            <div className="text-xs text-muted-foreground">{vendorName(t)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{t.type}</span>
                              {!t.is_active && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>
                              )}
                            </div>
                            {t.notes && (
                              <div className="text-xs text-muted-foreground">{t.notes}</div>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              t.amount < 0 ? 'text-destructive/80' : 'text-foreground'
                            )}
                          >
                            {money(t.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{cadenceLabel(t)}</TableCell>
                          <TableCell className={next.muted ? 'text-muted-foreground' : 'text-foreground'}>
                            {next.text}
                          </TableCell>
                          <TableCell className={last.muted ? 'text-muted-foreground' : 'text-foreground'}>
                            {last.text}
                            {last.hint && (
                              <span className="ml-1 text-xs text-muted-foreground">({last.hint})</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Switch
                                checked={!!t.is_active}
                                onCheckedChange={() => togglePause(t)}
                                aria-label={t.is_active ? 'Pause rule' : 'Resume rule'}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="View history"
                                onClick={() => setHistoryFor(t)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Edit"
                                onClick={() => {
                                  setEditing(t)
                                  setDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label="Delete"
                                onClick={() => setDeleting(t)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map(t => {
                  const next = nextAppliesLabel(t.next_due ?? (t.is_active ? { kind: 'every_week' } : { kind: 'paused' }))
                  const last = lastAppliedLabel(t.last_applied ?? null)
                  return (
                    <div key={t.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{t.type}</span>
                            {!t.is_active && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {agentName(t)} · {vendorName(t)}
                          </p>
                          {t.notes && <p className="mt-0.5 text-xs text-muted-foreground">{t.notes}</p>}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 text-sm font-semibold tabular-nums',
                            t.amount < 0 ? 'text-destructive/80' : 'text-foreground'
                          )}
                        >
                          {money(t.amount)}
                        </span>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Cadence</dt>
                          <dd className="text-foreground">{cadenceLabel(t)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Next applies</dt>
                          <dd className={next.muted ? 'text-muted-foreground' : 'text-foreground'}>{next.text}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Last applied</dt>
                          <dd className={last.muted ? 'text-muted-foreground' : 'text-foreground'}>
                            {last.text}
                            {last.hint && <span className="ml-1 text-muted-foreground">({last.hint})</span>}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!t.is_active}
                            onCheckedChange={() => togglePause(t)}
                            aria-label={t.is_active ? 'Pause rule' : 'Resume rule'}
                          />
                          <span className="text-xs text-muted-foreground">
                            {t.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="View history"
                            onClick={() => setHistoryFor(t)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(t)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive hover:text-destructive"
                            aria-label="Delete"
                            onClick={() => setDeleting(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <TemplateDialog
          agents={agents}
          vendors={vendors}
          template={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false)
            loadTemplates()
          }}
        />
      )}

      {historyFor && (
        <HistoryDialog
          template={historyFor}
          agentName={agentName(historyFor)}
          onClose={() => setHistoryFor(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recurring rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  &quot;{deleting.type}&quot; ({money(deleting.amount)}, {cadenceLabel(deleting)}).
                  Existing statements are unaffected; it just won&apos;t populate future ones.
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

function TableSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="hidden gap-3 border-b border-border pb-2 md:flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 flex-1 rounded bg-muted" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="h-5 flex-1 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
    </div>
  )
}

function HistoryDialog({
  template,
  agentName,
  onClose,
}: {
  template: Template
  agentName: string
  onClose: () => void
}) {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setErrored(false)
      try {
        const res = await fetch(`/api/scheduled-expenses/${template.id}/applications`)
        if (!res.ok) throw new Error('Failed to load history')
        const json = await res.json()
        if (!cancelled) setApps(json.data || [])
      } catch (error) {
        logger.error('Failed to load applications:', error)
        if (!cancelled) setErrored(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [template.id])

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application history</DialogTitle>
          <DialogDescription>
            {template.type} · {agentName} · {money(template.amount)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-2" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : errored ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Couldn&apos;t load history. Please try again.
          </div>
        ) : apps.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Not applied yet — this rule injects automatically when a statement is built for a
            matching week.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    Wk ending {fmtDate(a.wkending, 'MMM D, YYYY')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Issued {fmtDate(a.issue_date, 'MMM D, YYYY')}
                    {' · applied '}
                    {dayjs(a.applied_at).format('MMM D, YYYY')}
                    {a.applied_by_name ? ` by ${a.applied_by_name}` : ''}
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold tabular-nums',
                    a.amount < 0 ? 'text-destructive/80' : 'text-foreground'
                  )}
                >
                  {money(a.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const schema = z
  .object({
    agentId: z.string().min(1, 'Select an agent'),
    vendorId: z.string().min(1, 'Select a vendor'),
    type: z.string().trim().min(1, 'Type is required'),
    amount: z.number().refine(v => v !== 0, 'Amount cannot be zero'),
    frequency: z.enum(FREQUENCIES),
    monthlyWeek: z.string().optional().or(z.literal('')),
    monthlyWeekday: z.string().optional().or(z.literal('')),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    // For monthly_weekday both the ordinal and weekday are required.
    if (val.frequency === 'monthly_weekday') {
      if (!val.monthlyWeek) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['monthlyWeek'], message: 'Select a week' })
      }
      if (!val.monthlyWeekday) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['monthlyWeekday'], message: 'Select a day' })
      }
    }
  })
type FormValues = z.infer<typeof schema>

interface TemplateDialogProps {
  agents: AgentOption[]
  vendors: VendorOption[]
  template: Template | null
  onClose: () => void
  onSaved: () => void
}

function TemplateDialog({ agents, vendors, template, onClose, onSaved }: TemplateDialogProps) {
  const { toast } = useToast()
  const isEdit = !!template

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      agentId: template ? String(template.agentid) : '',
      vendorId: template ? String(template.vendor_id) : '',
      type: template?.type ?? '',
      amount: template?.amount ?? 0,
      frequency: template?.frequency ?? 'weekly',
      monthlyWeek: template?.monthly_week != null ? String(template.monthly_week) : '',
      monthlyWeekday: template?.monthly_weekday != null ? String(template.monthly_weekday) : '',
      startDate: template?.start_date ?? dayjs().format('YYYY-MM-DD'),
      endDate: template?.end_date ?? '',
      notes: template?.notes ?? '',
    },
  })

  const watched = watch()
  const agentOptions = agents.map(a => ({ key: a.id, value: a.name }))

  const onSubmit = async (values: FormValues) => {
    try {
      const url = isEdit ? `/api/scheduled-expenses/${template!.id}` : '/api/scheduled-expenses'
      const method = isEdit ? 'PATCH' : 'POST'
      const isMonthlyWeekday = values.frequency === 'monthly_weekday'
      // Send numbers for monthly_weekday, explicit null otherwise so the backend
      // clears the columns for every other frequency.
      const monthlyWeek = isMonthlyWeekday && values.monthlyWeek ? parseInt(values.monthlyWeek) : null
      const monthlyWeekday =
        isMonthlyWeekday && values.monthlyWeekday !== '' && values.monthlyWeekday != null
          ? parseInt(values.monthlyWeekday)
          : null
      const common = {
        vendorId: parseInt(values.vendorId),
        type: values.type,
        amount: values.amount,
        frequency: values.frequency,
        monthlyWeek,
        monthlyWeekday,
        startDate: values.startDate,
        endDate: values.endDate || null,
        notes: values.notes || '',
      }
      // agentId is only sent on create — PATCH doesn't reassign the agent.
      const body = isEdit ? common : { ...common, agentId: parseInt(values.agentId) }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || 'Failed to save rule')
      }
      toast({ title: isEdit ? 'Rule updated' : 'Rule created' })
      onSaved()
    } catch (error) {
      toast({
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit recurring rule' : 'New recurring rule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Agent</Label>
              {isEdit ? (
                <Input
                  value={template?.agent_name ?? agents.find(a => a.id === template?.agentid)?.name ?? `Agent ${template?.agentid}`}
                  disabled
                  className="min-h-11"
                />
              ) : (
                <>
                  <TypeaheadSelect
                    options={agentOptions}
                    value={watched.agentId ? parseInt(watched.agentId) : undefined}
                    onValueChange={v =>
                      setValue('agentId', v == null ? '' : String(v), { shouldValidate: true })
                    }
                    placeholder="Select agent"
                    searchPlaceholder="Search agents..."
                    className="min-h-11"
                  />
                  {errors.agentId && (
                    <p className="text-xs text-destructive">{errors.agentId.message}</p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-vendor">Vendor</Label>
              <Select
                value={watched.vendorId}
                onValueChange={v => setValue('vendorId', v, { shouldValidate: true })}
              >
                <SelectTrigger id="tmpl-vendor" className="min-h-11">
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
              {errors.vendorId && (
                <p className="text-xs text-destructive">{errors.vendorId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-type">Type</Label>
              <Input id="tmpl-type" placeholder="e.g. Equipment lease" {...register('type')} className="min-h-11" />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-amount">Amount (negative = deduction)</Label>
              <CurrencyInput
                value={watched.amount}
                onChange={v => setValue('amount', v, { shouldValidate: true })}
                className="min-h-11 tabular-nums"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-frequency">Frequency</Label>
              <Select
                value={watched.frequency}
                onValueChange={v => setValue('frequency', v as Frequency, { shouldValidate: true })}
              >
                <SelectTrigger id="tmpl-frequency" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABEL[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {watched.frequency === 'monthly_weekday' && (
              <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-monthly-week">Week</Label>
                  <Select
                    value={watched.monthlyWeek || ''}
                    onValueChange={v => setValue('monthlyWeek', v, { shouldValidate: true })}
                  >
                    <SelectTrigger id="tmpl-monthly-week" className="min-h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDINALS.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.monthlyWeek && (
                    <p className="text-xs text-destructive">{errors.monthlyWeek.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-monthly-weekday">Day of week</Label>
                  <Select
                    value={watched.monthlyWeekday || ''}
                    onValueChange={v => setValue('monthlyWeekday', v, { shouldValidate: true })}
                  >
                    <SelectTrigger id="tmpl-monthly-weekday" className="min-h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map(w => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.monthlyWeekday && (
                    <p className="text-xs text-destructive">{errors.monthlyWeekday.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-start">Start date</Label>
              <Input id="tmpl-start" type="date" {...register('startDate')} className="min-h-11" />
              {watched.frequency === 'monthly_weekday' && (
                <p className="text-xs text-muted-foreground">
                  Only applies on or after this date; it doesn&apos;t set the recurrence day.
                </p>
              )}
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-end">End date (optional)</Label>
              <Input id="tmpl-end" type="date" {...register('endDate')} className="min-h-11" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tmpl-notes">Notes (optional)</Label>
              <Input id="tmpl-notes" {...register('notes')} className="min-h-11" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Create rule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
