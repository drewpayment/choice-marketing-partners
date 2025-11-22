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
  }
  userContext?: {
    isAdmin: boolean
    isManager: boolean
  }
}

export default function PayrollFilters({ initialFilters, userContext }: PayrollFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg animate-pulse">
        <div className="p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Filter Payroll Data
        </h3>
        
        {/* Employee-only Quick Filters */}
        {!userContext?.isAdmin && !userContext?.isManager ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
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
                <Label htmlFor="employee" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="vendor" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="issueDate" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
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
          
          <div className="text-sm text-gray-500">
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span>
                {Object.values(filters).filter(Boolean).length} filter(s) applied
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
