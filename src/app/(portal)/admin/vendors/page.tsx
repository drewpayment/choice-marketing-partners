'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

interface Vendor {
  id: number
  name: string
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customFieldsEnabled, setCustomFieldsEnabled] = useState(false)
  const { toast } = useToast()

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/vendors?${params}`)
      if (!response.ok) throw new Error('Failed to fetch vendors')
      
      const data = await response.json()
      setVendors(data.vendors)
    } catch (error) {
      logger.error('Error fetching vendors:', error)
      toast({
        title: 'Error',
        description: 'Failed to load vendors',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
    // Check feature flag for custom fields
    fetch('/api/feature-flags/vendor_custom_fields')
      .then(res => res.json())
      .then(data => setCustomFieldsEnabled(data.enabled ?? false))
      .catch(() => setCustomFieldsEnabled(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // Filter vendors based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVendors(vendors)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(query)
    )
    setFilteredVendors(filtered)
  }, [vendors, searchQuery])

  // Toggle vendor active status
  const handleToggleActive = async (vendor: Vendor) => {
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !vendor.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update vendor')

      toast({
        title: 'Success',
        description: `Vendor ${vendor.is_active ? 'deactivated' : 'activated'} successfully`,
      })

      fetchVendors()
    } catch (error) {
      logger.error('Error updating vendor:', error)
      toast({
        title: 'Error',
        description: 'Failed to update vendor status',
        variant: 'destructive',
      })
    }
  }

  // Add new vendor
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newVendorName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Vendor name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVendorName.trim() }),
      })

      const data = await response.json()

      if (response.status === 409) {
        toast({
          title: 'Duplicate Vendor',
          description: 'A vendor with this name already exists',
          variant: 'destructive',
        })
        return
      }

      if (!response.ok) throw new Error(data.error || 'Failed to create vendor')

      toast({
        title: 'Success',
        description: 'Vendor added successfully',
      })

      setNewVendorName('')
      setIsAddDialogOpen(false)
      fetchVendors()
    } catch (error) {
      logger.error('Error adding vendor:', error)
      toast({
        title: 'Error',
        description: 'Failed to add vendor',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendors and their active status
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddVendor}>
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>
                  Enter the vendor name. The vendor will be active by default.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Vendor Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter vendor name"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    maxLength={300}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Vendor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'No vendors found matching your search' : 'No vendors found'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Vendor
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px] text-center">Active</TableHead>
                <TableHead className="w-[180px]">Last Updated</TableHead>
                {customFieldsEnabled && <TableHead className="w-[140px]">Fields</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.is_active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={vendor.is_active}
                      onCheckedChange={() => handleToggleActive(vendor)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vendor.updated_at
                      ? new Date(vendor.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </TableCell>
                  {customFieldsEnabled && (
                    <TableCell>
                      <Link href={`/admin/vendors/${vendor.id}/fields`}>
                        <Button variant="outline" size="sm">
                          <Settings2 className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filteredVendors.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredVendors.length} of {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
