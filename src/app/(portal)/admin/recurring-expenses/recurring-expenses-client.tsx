'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2, Pencil, Repeat, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const
type Frequency = (typeof FREQUENCIES)[number]
const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

interface AgentOption {
  id: number
  name: string
}
interface VendorOption {
  id: number
  name: string
}

interface Template {
  id: number
  agentid: number
  vendor_id: number
  type: string
  amount: number
  notes: string
  frequency: Frequency
  start_date: string
  end_date: string | null
  is_active: number
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function RecurringExpensesClient() {
  const { toast } = useToast()

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)

  const [agentId, setAgentId] = useState<number | undefined>(undefined)
  const [templates, setTemplates] = useState<Template[]>([])
  const [listLoading, setListLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)

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
      } finally {
        setLookupsLoading(false)
      }
    }
    load()
  }, [])

  const loadTemplates = useCallback(async () => {
    if (!agentId) {
      setTemplates([])
      return
    }
    setListLoading(true)
    try {
      const res = await fetch(`/api/scheduled-expenses?agentId=${agentId}`)
      if (res.ok) {
        const json = await res.json()
        setTemplates(json.data || [])
      }
    } catch (error) {
      logger.error('Failed to load templates:', error)
    } finally {
      setListLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const vendorName = (id: number) => vendors.find(v => v.id === id)?.name ?? `Vendor ${id}`

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
      toast({ title: t.is_active ? 'Template paused' : 'Template resumed' })
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
      toast({ title: 'Template deleted' })
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

  const agentOptions = agents.map(a => ({ key: a.id, value: a.name }))

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recurring Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates that auto-populate on an agent&apos;s pay statement each week they&apos;re due.
          Negative amounts are deductions.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-end justify-between gap-3 space-y-0">
          <div className="w-full max-w-xs space-y-1.5">
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
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
            disabled={!agentId}
            className="min-h-11"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add template
          </Button>
        </CardHeader>
        <CardContent>
          {!agentId ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Repeat className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              Select an agent to view and manage recurring expense templates.
            </div>
          ) : listLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No recurring templates for this agent yet.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{t.type}</span>
                      <Badge variant="secondary" className="text-xs">
                        {FREQUENCY_LABEL[t.frequency]}
                      </Badge>
                      {!t.is_active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Paused
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {vendorName(t.vendor_id)} · {dayjs(t.start_date).format('MM/DD/YYYY')}
                      {t.end_date ? ` – ${dayjs(t.end_date).format('MM/DD/YYYY')}` : ' – ongoing'}
                      {t.notes ? ` · ${t.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        t.amount < 0 ? 'text-destructive' : 'text-foreground'
                      }`}
                    >
                      {money(t.amount)}
                    </span>
                    <div className="flex items-center gap-1.5" title={t.is_active ? 'Active' : 'Paused'}>
                      <Switch
                        checked={!!t.is_active}
                        onCheckedChange={() => togglePause(t)}
                        aria-label={t.is_active ? 'Pause template' : 'Resume template'}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
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
                      className="h-11 w-11 text-destructive hover:text-destructive"
                      aria-label="Delete"
                      onClick={() => setDeleting(t)}
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

      {dialogOpen && agentId && (
        <TemplateDialog
          agentId={agentId}
          vendors={vendors}
          template={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false)
            loadTemplates()
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recurring template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  &quot;{deleting.type}&quot; ({money(deleting.amount)}, {FREQUENCY_LABEL[deleting.frequency]}).
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

const schema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  type: z.string().trim().min(1, 'Type is required'),
  amount: z.number().refine(v => v !== 0, 'Amount cannot be zero'),
  frequency: z.enum(FREQUENCIES),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

interface TemplateDialogProps {
  agentId: number
  vendors: VendorOption[]
  template: Template | null
  onClose: () => void
  onSaved: () => void
}

function TemplateDialog({ agentId, vendors, template, onClose, onSaved }: TemplateDialogProps) {
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
      vendorId: template ? String(template.vendor_id) : '',
      type: template?.type ?? '',
      amount: template?.amount ?? 0,
      frequency: template?.frequency ?? 'weekly',
      startDate: template?.start_date ?? dayjs().format('YYYY-MM-DD'),
      endDate: template?.end_date ?? '',
      notes: template?.notes ?? '',
    },
  })

  const watched = watch()

  const onSubmit = async (values: FormValues) => {
    try {
      const url = isEdit ? `/api/scheduled-expenses/${template!.id}` : '/api/scheduled-expenses'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit
        ? {
            vendorId: parseInt(values.vendorId),
            type: values.type,
            amount: values.amount,
            frequency: values.frequency,
            startDate: values.startDate,
            endDate: values.endDate || null,
            notes: values.notes || '',
          }
        : {
            agentId,
            vendorId: parseInt(values.vendorId),
            type: values.type,
            amount: values.amount,
            frequency: values.frequency,
            startDate: values.startDate,
            endDate: values.endDate || null,
            notes: values.notes || '',
          }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || 'Failed to save template')
      }
      toast({ title: isEdit ? 'Template updated' : 'Template created' })
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
          <DialogTitle>{isEdit ? 'Edit recurring template' : 'New recurring template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-start">Start date</Label>
              <Input id="tmpl-start" type="date" {...register('startDate')} className="min-h-11" />
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
                'Create template'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
