'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/utils/date'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/utils/logger'

interface PayrollFiltersProps {
  initialFilters: {
    employeeId?: number
    vendorId?: number
    issueDate?: string
    startDate?: string
    endDate?: string
    status?: string
    scope?: string
  }
  userContext?: {
    isAdmin: boolean
    isManager: boolean
  }
  /**
   * Whether the viewer has direct reports. Resolved server-side from
   * `managedEmployeeIds` — without reports "My team" is a dead option, so that
   * one choice is dropped from the toggle.
   */
  hasReports?: boolean
}

export default function PayrollFilters({ initialFilters, userContext, hasReports }: PayrollFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Derived from the URL rather than local state so it stays correct after
  // back/forward navigation and any other filter push.
  const scopeParam = searchParams.get('scope')
  const activeScope = scopeParam === 'mine' || scopeParam === 'team' ? scopeParam : 'all'

  // Shown to every elevated viewer, not just those with reports: the dashboard
  // links admins and report-less managers to ?scope=mine, and without the
  // toggle that would be a silent, unescapable filter. "My team" is the only
  // option that needs reports to be meaningful.
  const isElevated = Boolean(userContext?.isAdmin || userContext?.isManager)
  const scopeOptions = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'My pay' },
    ...(hasReports ? [{ value: 'team', label: 'My team' }] : []),
  ]

  const [filters, setFilters] = useState(initialFilters)
  const [quickFilter, setQuickFilter] = useState<string>('all')
  const [agents, setAgents] = useState<Array<{ id: number; name: string; sales_id1: string }>>([])
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([])
  const [issueDates, setIssueDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Sync quick filter state with URL params on page load
  useEffect(() => {
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      setQuickFilter('all')
      return
    }

    // Calculate what preset matches current URL params
    const now = new Date()
    const currentEndDate = now.toISOString().split('T')[0]

    // Check for "This Year" preset
    const yearStart = `${new Date().getFullYear()}-01-01`
    if (startDate === yearStart) {
      setQuickFilter('thisYear')
      return
    }

    // Check for "Last 30 Days" preset
    const date30 = new Date()
    date30.setDate(date30.getDate() - 30)
    const last30Start = date30.toISOString().split('T')[0]
    if (startDate === last30Start && endDate === currentEndDate) {
      setQuickFilter('last30')
      return
    }

    // Check for "Last 90 Days" preset
    const date90 = new Date()
    date90.setDate(date90.getDate() - 90)
    const last90Start = date90.toISOString().split('T')[0]
    if (startDate === last90Start && endDate === currentEndDate) {
      setQuickFilter('last90')
      return
    }

    // If dates don't match any preset, default to 'all'
    setQuickFilter('all')
  }, [searchParams])

  // Load filter options (skip for employees who only use quick filters)
  useEffect(() => {
    // Employees don't need filter options - they only use quick filter buttons
    if (!userContext?.isAdmin && !userContext?.isManager) {
      setLoading(false)
      return
    }

    async function loadFilterOptions() {
      try {
        const [agentsResponse, vendorsResponse, issueDatesResponse] = await Promise.all([
          fetch('/api/payroll/agents'),
          fetch('/api/payroll/vendors'),
          fetch('/api/payroll/issue-dates')
        ])

        if (agentsResponse.ok && vendorsResponse.ok && issueDatesResponse.ok) {
          const [agentsData, vendorsData, issueDatesData] = await Promise.all([
            agentsResponse.json(),
            vendorsResponse.json(),
            issueDatesResponse.json()
          ])

          setAgents(agentsData)
          setVendors(vendorsData)
          setIssueDates(issueDatesData)
        } else {
          logger.error('Failed to load filter options')
        }
      } catch (error) {
        logger.error('Error loading filter options:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFilterOptions()
  }, [userContext?.isAdmin, userContext?.isManager])

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined
    }
    
    setFilters(newFilters)
    
    // Update URL search params
    const params = new URLSearchParams(searchParams)
    
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    router.push(`/payroll?${params.toString()}`)
  }

  const handleScopeChange = (scope: string) => {
    const params = new URLSearchParams(searchParams)

    if (scope === 'mine' || scope === 'team') {
      params.set('scope', scope)
    } else {
      params.delete('scope')
    }

    // The row count changes with the scope, so an old page number can land the
    // viewer past the end of the narrowed list.
    params.delete('page')

    router.push(`/payroll?${params.toString()}`)
  }

  const clearFilters = () => {
    setFilters({})
    router.push('/payroll')
  }

  const handleQuickFilter = (preset: string) => {
    setQuickFilter(preset)

    const now = new Date()
    let startDate = ''
    let endDate = now.toISOString().split('T')[0]

    switch(preset) {
      case 'last30':
        const date30 = new Date()
        date30.setDate(date30.getDate() - 30)
        startDate = date30.toISOString().split('T')[0]
        break
      case 'last90':
        const date90 = new Date()
        date90.setDate(date90.getDate() - 90)
        startDate = date90.toISOString().split('T')[0]
        break
      case 'thisYear':
        startDate = `${new Date().getFullYear()}-01-01`
        break
      case 'all':
      default:
        startDate = ''
        endDate = ''
    }

    const params = new URLSearchParams(searchParams)
    if (startDate) {
      params.set('startDate', startDate)
      params.set('endDate', endDate)
    } else {
      params.delete('startDate')
      params.delete('endDate')
    }

    router.push(`/payroll?${params.toString()}`)
  }

  // Count only meaningful, non-default filters (status 'all' is the default;
  // page/limit are pagination, not filters).
  const activeFilterCount =
    [
      filters.employeeId,
      filters.vendorId,
      filters.issueDate,
      filters.startDate,
      filters.endDate,
    ].filter(Boolean).length +
    (filters.status && filters.status !== 'all' ? 1 : 0) +
    // Counted whenever the toggle is rendered, so an active scope is never
    // invisible to a viewer who has the control to clear it.
    (isElevated && activeScope !== 'all' ? 1 : 0)

  if (loading) {
    return (
      <div className="bg-card shadow rounded-lg animate-pulse">
        <div className="p-6 space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
          Filter Payroll Data
        </h3>

        {/* Own-vs-team scope toggle (elevated viewers only) */}
        {isElevated && (
          <div className="mb-4">
            {/* Not a <label>: it names a radio-style group, not a form control. */}
            <span
              id="payroll-scope-label"
              className="text-sm font-medium text-foreground mb-2 block"
            >
              Show
            </span>
            <div
              role="group"
              aria-labelledby="payroll-scope-label"
              className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1"
            >
              {scopeOptions.map((option) => {
                const isActive = activeScope === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleScopeChange(option.value)}
                    className={`min-h-11 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Employee-only Quick Filters */}
        {!userContext?.isAdmin && !userContext?.isManager ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Time Period
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={quickFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('all')}
                >
                  All Time
                </Button>
                <Button
                  variant={quickFilter === 'last30' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('last30')}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant={quickFilter === 'last90' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('last90')}
                >
                  Last 90 Days
                </Button>
                <Button
                  variant={quickFilter === 'thisYear' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('thisYear')}
                >
                  This Year
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Manager/Admin Full Filters */
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Employee Filter */}
              <div>
                <Label htmlFor="employee" className="text-sm font-medium text-foreground">
                  Employee
                </Label>
                <TypeaheadSelect
                  options={[
                    { key: '', value: 'All Employees' },
                    ...agents.map(agent => ({
                      key: String(agent.id),
                      value: `${agent.name} (${agent.sales_id1})`
                    }))
                  ]}
                  value={String(filters.employeeId || '')}
                  onValueChange={(value) => handleFilterChange('employeeId', String(value || ''))}
                  placeholder="All Employees"
                  className="mt-1"
                />
              </div>

              {/* Vendor Filter */}
              <div>
                <Label htmlFor="vendor" className="text-sm font-medium text-foreground">
                  Vendor
                </Label>
                <Select
                  value={String(filters.vendorId || 'all')}
                  onValueChange={(value) => handleFilterChange('vendorId', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={String(vendor.id)}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issue Date Filter */}
              <div>
                <Label htmlFor="issueDate" className="text-sm font-medium text-foreground">
                  Issue Date
                </Label>
                <Select
                  value={filters.issueDate || 'all'}
                  onValueChange={(value) => handleFilterChange('issueDate', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    {issueDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {formatDate(date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Label htmlFor="status" className="text-sm font-medium text-foreground">
                  Status
                </Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium text-foreground">
                  Start Date
                </Label>
                <Input
                  type="date"
                  id="startDate"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
                  End Date
                </Label>
                <Input
                  type="date"
                  id="endDate"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </>
        )}

        {/* Filter Actions */}
        <div className="mt-4 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="text-sm"
          >
            Clear Filters
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {activeFilterCount > 0 && (
              <span>
                {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
