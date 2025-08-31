'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/utils/date'

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
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700">
              Employee
            </label>
            <select
              id="employee"
              value={filters.employeeId || ''}
              onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Employees</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.sales_id1})
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
              Vendor
            </label>
            <select
              id="vendor"
              value={filters.vendorId || ''}
              onChange={(e) => handleFilterChange('vendorId', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Issue Date Filter */}
          <div>
            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700">
              Issue Date
            </label>
            <select
              id="issueDate"
              value={filters.issueDate || ''}
              onChange={(e) => handleFilterChange('issueDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Dates</option>
              {issueDates.map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
          
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
