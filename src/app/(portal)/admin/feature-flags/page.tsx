'use client'

import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'

interface Override {
  id: number
  flag_id: number
  context_type: 'user' | 'role' | 'subscriber'
  context_value: string
  is_enabled: number
}

interface FeatureFlag {
  id: number
  name: string
  description: string | null
  is_enabled: number
  rollout_percentage: number
  environment: string
  overrides: Override[]
}

const ENV_COLORS: Record<string, string> = {
  production: 'bg-blue-50 text-blue-700',
  staging: 'bg-green-50 text-green-700',
  development: 'bg-yellow-50 text-yellow-700',
  all: 'bg-purple-50 text-purple-700',
}

const OVERRIDE_COLORS: Record<string, string> = {
  role: 'bg-green-50 text-green-700',
  user: 'bg-blue-50 text-blue-700',
  subscriber: 'bg-orange-50 text-orange-700',
}

export default function FeatureFlagsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = useState<number | null>(null)

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newEnv, setNewEnv] = useState('production')
  const [newPct, setNewPct] = useState(0)
  const [newEnabled, setNewEnabled] = useState(false)

  const [ovType, setOvType] = useState<'user' | 'role' | 'subscriber'>('role')
  const [ovValue, setOvValue] = useState('')
  const [ovEnabled, setOvEnabled] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<{ id: number; name: string; email: string; user_id: number | null }[]>([])
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [selectedUserLabel, setSelectedUserLabel] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.isSuperAdmin) {
      router.replace('/admin')
      return
    }
    fetchFlags()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  useEffect(() => {
    if (ovType !== 'user' || userSearch.length < 2) {
      setUserResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(userSearch)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setUserResults(data.employees ?? [])
          setUserSearchOpen(true)
        }
      } catch {
        // ignore search errors
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [userSearch, ovType])

  function resetOverrideForm() {
    setOvType('role')
    setOvValue('')
    setOvEnabled(true)
    setUserSearch('')
    setUserResults([])
    setUserSearchOpen(false)
    setSelectedUserLabel('')
  }

  async function resolveUserNames(loadedFlags: FeatureFlag[]) {
    const ids = loadedFlags
      .flatMap((f) => f.overrides)
      .filter((o) => o.context_type === 'user')
      .map((o) => o.context_value)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((v) => parseInt(v, 10))
      .filter((n) => !isNaN(n))
    if (ids.length === 0) return
    try {
      const res = await fetch(`/api/employees/resolve-uids?uids=${ids.join(',')}`)
      if (!res.ok) return
      const map: Record<string, string> = await res.json()
      // keys come back as numbers from JSON; convert to strings to match context_value
      const stringMap: Record<string, string> = {}
      for (const [k, v] of Object.entries(map)) stringMap[k] = v
      if (Object.keys(stringMap).length > 0) {
        setUserNames((prev) => ({ ...prev, ...stringMap }))
      }
    } catch {
      // non-critical — falls back to displaying the raw id
    }
  }

  async function fetchFlags() {
    try {
      const res = await fetch('/api/admin/feature-flags')
      if (!res.ok) throw new Error('Failed to load flags')
      const loaded: FeatureFlag[] = await res.json()
      setFlags(loaded)
      resolveUserNames(loaded)
    } catch (error) {
      logger.error('Error fetching flags:', error)
      toast({ title: 'Error', description: 'Failed to load feature flags', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function toggleEnabled(flag: FeatureFlag) {
    try {
      await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !flag.is_enabled }),
      })
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, is_enabled: flag.is_enabled ? 0 : 1 } : f))
    } catch (error) {
      logger.error('Error toggling flag:', error)
      toast({ title: 'Error', description: 'Failed to update flag', variant: 'destructive' })
    }
  }

  async function saveEdit(flag: FeatureFlag, patch: Partial<FeatureFlag>) {
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const updated = await res.json()
      setFlags((prev) => prev.map((f) => f.id === flag.id ? updated : f))
      toast({ title: 'Saved' })
    } catch (error) {
      logger.error('Error saving flag:', error)
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    }
  }

  async function createFlag() {
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, is_enabled: newEnabled, rollout_percentage: newPct, environment: newEnv }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setShowNewDialog(false)
      setNewName(''); setNewDesc(''); setNewEnv('production'); setNewPct(0); setNewEnabled(false)
      await fetchFlags()
      toast({ title: 'Flag created' })
    } catch (error) {
      logger.error('Error creating flag:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create flag', variant: 'destructive' })
    }
  }

  async function addOverride(flagId: number) {
    try {
      const res = await fetch(`/api/admin/feature-flags/${flagId}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_type: ovType, context_value: ovValue, is_enabled: ovEnabled }),
      })
      const updated = await res.json()
      setFlags((prev) => prev.map((f) => f.id === flagId ? updated : f))
      if (ovType === 'user' && selectedUserLabel && ovValue) {
        const name = selectedUserLabel.split(' (')[0]
        setUserNames((prev) => ({ ...prev, [ovValue]: name }))
      }
      setShowOverrideDialog(null)
      resetOverrideForm()
      toast({ title: 'Override added' })
    } catch (error) {
      logger.error('Error adding override:', error)
      toast({ title: 'Error', description: 'Failed to add override', variant: 'destructive' })
    }
  }

  async function deleteOverride(flagId: number, overrideId: number) {
    try {
      await fetch(`/api/admin/feature-flags/${flagId}/overrides`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override_id: overrideId }),
      })
      setFlags((prev) => prev.map((f) =>
        f.id === flagId ? { ...f, overrides: f.overrides.filter((o) => o.id !== overrideId) } : f
      ))
    } catch (error) {
      logger.error('Error deleting override:', error)
      toast({ title: 'Error', description: 'Failed to delete override', variant: 'destructive' })
    }
  }

  if (loading) return <div className="container mx-auto py-10"><p className="text-muted-foreground">Loading...</p></div>

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Feature Flags</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Super Admin
            </span>
          </div>
          <p className="text-muted-foreground">Control feature rollouts by environment, role, tenant, and percentage</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Flag
        </Button>
      </div>

      <Card>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[220px] max-w-[300px]">Flag Name</TableHead>
              <TableHead className="w-[120px]">Environment</TableHead>
              <TableHead className="w-[200px]">Rollout</TableHead>
              <TableHead className="w-[160px]">Overrides</TableHead>
              <TableHead className="w-[80px]">Enabled</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => (
              <React.Fragment key={flag.id}>
                <TableRow key={flag.id}>
                  <TableCell className="max-w-[300px]">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default">
                            <p className="font-mono text-sm font-medium">{flag.name}</p>
                            {flag.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{flag.description}</p>}
                          </div>
                        </TooltipTrigger>
                        {flag.description && (
                          <TooltipContent side="bottom" align="start" className="max-w-sm">
                            <p className="text-sm">{flag.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ENV_COLORS[flag.environment] ?? 'bg-stone-100 text-stone-600'}`}>
                      {flag.environment}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${flag.rollout_percentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{flag.rollout_percentage}% of users</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {flag.overrides.slice(0, 2).map((o) => (
                        <span key={o.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OVERRIDE_COLORS[o.context_type]}`}>
                          {o.context_type}
                        </span>
                      ))}
                      {flag.overrides.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                          +{flag.overrides.length - 2}
                        </span>
                      )}
                      {flag.overrides.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!flag.is_enabled}
                      onCheckedChange={() => toggleEnabled(flag)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === flag.id ? null : flag.id)}
                    >
                      {expandedId === flag.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>

                {expandedId === flag.id && (
                  <TableRow key={`${flag.id}-edit`} className="bg-muted/30">
                    <TableCell colSpan={6} className="p-6">
                      <div className="border-2 border-primary/30 rounded-lg p-5 bg-card space-y-5">
                        <h3 className="font-semibold text-sm">Editing: <span className="font-mono">{flag.name}</span></h3>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Environment</Label>
                              <Select
                                defaultValue={flag.environment}
                                onValueChange={(v) => saveEdit(flag, { environment: v })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['production', 'staging', 'development', 'all'].map((e) => (
                                    <SelectItem key={e} value={e}>{e}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs text-muted-foreground">Rollout Percentage</Label>
                                <span className="font-mono text-sm font-semibold text-primary">{flag.rollout_percentage}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                defaultValue={flag.rollout_percentage}
                                className="w-full accent-primary"
                                onMouseUp={(e) => saveEdit(flag, { rollout_percentage: Number((e.target as HTMLInputElement).value) })}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Overrides</Label>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowOverrideDialog(flag.id)}>
                                <Plus className="h-3 w-3 mr-1" /> Add Override
                              </Button>
                            </div>
                            {flag.overrides.map((o) => (
                              <div key={o.id} className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OVERRIDE_COLORS[o.context_type]}`}>
                                  {o.context_type}
                                </span>
                                <span className="text-xs flex-1 truncate">
                                  {o.context_type === 'user'
                                    ? (userNames[o.context_value] ?? o.context_value)
                                    : o.context_value}
                                </span>
                                <Switch checked={!!o.is_enabled} onCheckedChange={async (v) => {
                                  await fetch(`/api/admin/feature-flags/${flag.id}/overrides`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ context_type: o.context_type, context_value: o.context_value, is_enabled: v }),
                                  })
                                  setFlags((prev) => prev.map((f) =>
                                    f.id === flag.id
                                      ? { ...f, overrides: f.overrides.map((ov) => ov.id === o.id ? { ...ov, is_enabled: v ? 1 : 0 } : ov) }
                                      : f
                                  ))
                                }} />
                                <button onClick={() => deleteOverride(flag.id, o.id)} className="text-destructive hover:opacity-70">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {flag.overrides.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No overrides — rollout percentage applies to all users</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
            {flags.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No feature flags yet. Create your first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name <span className="text-muted-foreground text-xs">(lowercase, hyphens only)</span></Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="enable-my-feature" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What does this flag control?" className="mt-1" />
            </div>
            <div>
              <Label>Environment</Label>
              <Select value={newEnv} onValueChange={setNewEnv}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['production', 'staging', 'development', 'all'].map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <Label>Rollout Percentage</Label>
                <span className="font-mono text-sm text-primary">{newPct}%</span>
              </div>
              <input type="range" min={0} max={100} value={newPct} onChange={(e) => setNewPct(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} />
              <Label>Enabled immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={createFlag} disabled={!newName}>Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOverrideDialog !== null} onOpenChange={(o) => { if (!o) { setShowOverrideDialog(null); resetOverrideForm() } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Override</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={ovType} onValueChange={(v) => { setOvType(v as 'user' | 'role' | 'subscriber'); setOvValue(''); setUserSearch(''); setUserResults([]); setSelectedUserLabel('') }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="subscriber">Subscriber ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              {ovType === 'role' && (
                <Select value={ovValue} onValueChange={setOvValue}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a role…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="manager">manager</SelectItem>
                    <SelectItem value="subscriber">subscriber</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {ovType === 'user' && (
                <div className="relative mt-1">
                  <Input
                    value={selectedUserLabel || userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setSelectedUserLabel('')
                      setOvValue('')
                      setUserSearchOpen(true)
                    }}
                    placeholder="Search by name or email…"
                  />
                  {userSearchOpen && userResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {userResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            const id = String(emp.user_id ?? emp.id)
                            setOvValue(id)
                            setSelectedUserLabel(`${emp.name} (${emp.email})`)
                            setUserSearch('')
                            setUserResults([])
                            setUserSearchOpen(false)
                          }}
                        >
                          <span className="font-medium">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">{emp.email}</span>
                          {emp.user_id && <span className="font-mono text-xs text-muted-foreground">id: {emp.user_id}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {ovValue && (
                    <p className="mt-1 text-xs text-muted-foreground font-mono">uid: {ovValue}</p>
                  )}
                </div>
              )}
              {ovType === 'subscriber' && (
                <Input value={ovValue} onChange={(e) => setOvValue(e.target.value)} placeholder="subscriber ID" className="mt-1" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ovEnabled} onCheckedChange={setOvEnabled} />
              <Label>Enabled for this override</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOverrideDialog(null); resetOverrideForm() }}>Cancel</Button>
            <Button onClick={() => addOverride(showOverrideDialog!)} disabled={!ovValue}>Add Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
