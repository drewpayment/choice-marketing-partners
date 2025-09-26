'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/utils/date'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PayrollFiltersProps {
  initialFilters: {
    employeeId?: number
    vendorId?: number
    issueDate?: string
    startDate?: string
    endDate?: string
    status?: string
  }
}

export default function PayrollFilters({ initialFilters }: PayrollFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState(initialFilters)
  const [agents, setAgents] = useState<Array<{ id: number; name: string; sales_id1: string }>>([])
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([])
  const [issueDates, setIssueDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Load filter options
  useEffect(() => {
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
          console.error('Failed to load filter options')
        }
      } catch (error) {
        console.error('Error loading filter options:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFilterOptions()
  }, []) // Removed userContext dependency since we get it from session in API

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
