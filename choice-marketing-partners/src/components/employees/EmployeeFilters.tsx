'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { X, Search } from 'lucide-react'

interface EmployeeFiltersProps {
  initialFilters: {
    search?: string
    status: 'active' | 'inactive' | 'all'
    role: 'admin' | 'manager' | 'employee' | 'all'
    hasUser?: boolean
    page: number
    limit: number
  }
}

export function EmployeeFilters({ initialFilters }: EmployeeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(initialFilters.search || '')
  const [status, setStatus] = useState(initialFilters.status)
  const [role, setRole] = useState(initialFilters.role)
  const [hasUser, setHasUser] = useState<string>(
    initialFilters.hasUser === true ? 'true' : 
    initialFilters.hasUser === false ? 'false' : 'all'
  )

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams)
    
    // Update search parameters
    if (search.trim()) {
      params.set('search', search.trim())
    } else {
      params.delete('search')
    }
    
    // Always set status parameter to ensure it's explicit
    params.set('status', status)
    
    if (role !== 'all') {
      params.set('role', role)
    } else {
      params.delete('role')
    }
    
    if (hasUser !== 'all') {
      params.set('hasUser', hasUser)
    } else {
      params.delete('hasUser')
    }
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    router.push(`/admin/employees?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('active')  // Default to active instead of all
    setRole('all')
    setHasUser('all')
    router.push('/admin/employees?status=active')  // Include active status in URL
  }

  const hasActiveFilters = search || status !== 'active' || role !== 'all' || hasUser !== 'all'

  return (
    <div className="rounded-lg border p-4">
      <div className="grid gap-4 md:grid-cols-5">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Name, email, sales ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters()}
              className="pl-8"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Role Filter */}
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Account Filter */}
        <div className="space-y-2">
          <Label>User Account</Label>
          <Select value={hasUser} onValueChange={setHasUser}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Has Account</SelectItem>
              <SelectItem value="false">No Account</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <div className="flex gap-2">
            <Button onClick={updateFilters} size="sm">
              Apply
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
