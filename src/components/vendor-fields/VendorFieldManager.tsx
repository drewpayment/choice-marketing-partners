'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

interface FieldDefinition {
  id: number
  vendor_id: number
  field_key: string
  field_label: string
  source: 'builtin' | 'custom'
  display_order: number
  is_active: boolean
}

interface VendorFieldManagerProps {
  vendorId: number
  vendorName: string
}

/**
 * Auto-generate a slug from a label.
 * "Program Name" → "program_name"
 */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export default function VendorFieldManager({ vendorId, vendorName }: VendorFieldManagerProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [isConfigured, setIsConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldKey, setNewFieldKey] = useState('')
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null)
  const [editingLabelValue, setEditingLabelValue] = useState('')
  const { toast } = useToast()

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/vendors/${vendorId}/fields?includeInactive=true`)
      if (!res.ok) throw new Error('Failed to fetch fields')
      const data = await res.json()
      setFields(data.fields)
      setIsConfigured(data.isConfigured)
    } catch (error) {
      logger.error('Error fetching vendor fields:', error)
      toast({ title: 'Error', description: 'Failed to load field configuration', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [vendorId, toast])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleInitialize = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/vendors/${vendorId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
      })
      if (!res.ok) throw new Error('Failed to initialize')
      toast({ title: 'Success', description: 'Default fields initialized' })
      fetchFields()
    } catch (error) {
      logger.error('Error initializing vendor fields:', error)
      toast({ title: 'Error', description: 'Failed to initialize fields', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (field: FieldDefinition) => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: field.id, is_active: !field.is_active }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setFields(prev => prev.map(f => f.id === field.id ? { ...f, is_active: !f.is_active } : f))
    } catch (error) {
      logger.error('Error toggling field:', error)
      toast({ title: 'Error', description: 'Failed to update field', variant: 'destructive' })
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newFields.length) return

    // Swap display_order values
    const tempOrder = newFields[index].display_order
    newFields[index].display_order = newFields[targetIndex].display_order
    newFields[targetIndex].display_order = tempOrder

    // Swap positions in array
    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    setFields(newFields)

    // Save to backend
    try {
      const reorder = newFields.map((f, i) => ({ id: f.id, display_order: i + 1 }))
      const res = await fetch(`/api/vendors/${vendorId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder }),
      })
      if (!res.ok) throw new Error('Failed to reorder')
    } catch (error) {
      logger.error('Error reordering fields:', error)
      toast({ title: 'Error', description: 'Failed to save order', variant: 'destructive' })
      fetchFields() // revert on error
    }
  }

  const handleAddField = async () => {
    if (!newFieldLabel.trim()) return
    const key = newFieldKey.trim() || slugify(newFieldLabel)

    try {
      setSaving(true)
      const res = await fetch(`/api/vendors/${vendorId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_key: key, field_label: newFieldLabel.trim() }),
      })

      if (res.status === 409) {
        toast({ title: 'Duplicate', description: 'A field with this key already exists', variant: 'destructive' })
        return
      }
      if (!res.ok) throw new Error('Failed to create')

      toast({ title: 'Success', description: 'Custom field added' })
      setNewFieldLabel('')
      setNewFieldKey('')
      setAddDialogOpen(false)
      fetchFields()
    } catch (error) {
      logger.error('Error creating field:', error)
      toast({ title: 'Error', description: 'Failed to add field', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteField = async (field: FieldDefinition) => {
    if (!confirm(`Delete custom field "${field.field_label}"? Existing data in invoices won't be removed, but the column will stop showing on paystubs.`)) return

    try {
      const res = await fetch(`/api/vendors/${vendorId}/fields`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: field.id }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Success', description: 'Field deleted' })
      fetchFields()
    } catch (error) {
      logger.error('Error deleting field:', error)
      toast({ title: 'Error', description: 'Failed to delete field', variant: 'destructive' })
    }
  }

  const handleSaveLabel = async (field: FieldDefinition) => {
    if (!editingLabelValue.trim()) return
    try {
      const res = await fetch(`/api/vendors/${vendorId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: field.id, field_label: editingLabelValue.trim() }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setFields(prev => prev.map(f => f.id === field.id ? { ...f, field_label: editingLabelValue.trim() } : f))
      setEditingLabelId(null)
    } catch (error) {
      logger.error('Error updating label:', error)
      toast({ title: 'Error', description: 'Failed to update label', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-10"><p className="text-muted-foreground">Loading...</p></div>
  }

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-semibold mb-2">No Field Configuration</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            This vendor hasn&apos;t been configured yet. Initialize with the default paystub columns, then customize as needed.
          </p>
          <Button onClick={handleInitialize} disabled={saving}>
            {saving ? 'Initializing...' : 'Initialize Default Fields'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Paystub Column Configuration — {vendorName}</CardTitle>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure which columns appear on paystubs for this vendor. Use arrows to reorder, toggle to show/hide, click label to rename.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={`flex items-center gap-3 p-3 border rounded-lg ${
                  field.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleMove(index, 'down')} disabled={index === fields.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  {editingLabelId === field.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveLabel(field)
                          if (e.key === 'Escape') setEditingLabelId(null)
                        }}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" variant="outline" onClick={() => handleSaveLabel(field)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingLabelId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <span
                      className="font-medium cursor-pointer hover:underline"
                      onClick={() => {
                        setEditingLabelId(field.id)
                        setEditingLabelValue(field.field_label)
                      }}
                    >
                      {field.field_label}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">({field.field_key})</span>
                </div>

                <Badge variant={field.source === 'builtin' ? 'secondary' : 'outline'} className="flex-shrink-0">
                  {field.source}
                </Badge>

                <Switch
                  checked={field.is_active}
                  onCheckedChange={() => handleToggleActive(field)}
                />

                {field.source === 'custom' && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteField(field)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Custom Field Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
            <DialogDescription>
              Define a new column for this vendor&apos;s paystubs. The field key is used for CSV import mapping.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="field_label">Display Label</Label>
              <Input
                id="field_label"
                placeholder="e.g., Program"
                value={newFieldLabel}
                onChange={(e) => {
                  setNewFieldLabel(e.target.value)
                  if (!newFieldKey || newFieldKey === slugify(newFieldLabel)) {
                    setNewFieldKey(slugify(e.target.value))
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field_key">Field Key</Label>
              <Input
                id="field_key"
                placeholder="e.g., program"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Used as the internal identifier and CSV mapping target. Auto-generated from label.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddField} disabled={saving || !newFieldLabel.trim()}>
              {saving ? 'Adding...' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
