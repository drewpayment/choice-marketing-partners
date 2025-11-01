'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TypeaheadSelect } from '@/components/ui/typeahead-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchIcon, FilterIcon, DownloadIcon } from 'lucide-react'
import dayjs from 'dayjs'

export interface InvoiceSearchFilters {
  // Invoice identification
  invoiceId?: number
  
  // Agent/Employee filters
  agentId?: number
  agentIds?: number[]
  
  // Vendor filters
  vendor?: string
  vendorId?: number
  
  // Date range filters
  saleDateFrom?: string // MM-DD-YYYY format
  saleDateTo?: string   // MM-DD-YYYY format
  issueDateFrom?: string // MM-DD-YYYY format
  issueDateTo?: string   // MM-DD-YYYY format
  wkendingFrom?: string  // MM-DD-YYYY format
  wkendingTo?: string    // MM-DD-YYYY format
  changedDateFrom?: string // MM-DD-YYYY format
  changedDateTo?: string   // MM-DD-YYYY format
  
  // Customer information
  customerName?: string  // Search first_name + last_name
  city?: string
  address?: string
  
  // Amount filters
  amountFrom?: number
  amountTo?: number
  amountChanged?: boolean // Only show records where amount changed
  
  // Status filters
  status?: string
  statusChanged?: boolean // Only show records where status changed
  
  // Change information
  changedBy?: number
  actionType?: 'UPDATE' | 'DELETE'
  
  // Pagination
  page?: number
  limit?: number
}

interface InvoiceSearchFormProps {
  onSearch: (filters: InvoiceSearchFilters) => void
  onClear: () => void
  isLoading?: boolean
  availableAgents?: Array<{ id: number; name: string }>
  availableVendors?: Array<{ id: number; name: string }>
  availableStatuses?: string[]
}

export const InvoiceSearchForm: React.FC<InvoiceSearchFormProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  availableAgents = [],
  availableVendors = [],
  availableStatuses = ['Active', 'Charged Back', 'Cancelled', 'Pending', 'Refunded']
}) => {
  const [filters, setFilters] = useState<InvoiceSearchFilters>({
    page: 1,
    limit: 50
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Handle form field updates
  const updateFilter = (key: keyof InvoiceSearchFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  // Handle date input formatting (MM-DD-YYYY)
  const handleDateChange = (key: keyof InvoiceSearchFilters, value: string) => {
    // Convert from YYYY-MM-DD (HTML input) to MM-DD-YYYY (our format)
    if (value) {
      const formattedDate = dayjs(value).format('MM-DD-YYYY')
      updateFilter(key, formattedDate)
    } else {
      updateFilter(key, undefined)
    }
  }

  // Convert MM-DD-YYYY to YYYY-MM-DD for HTML date inputs
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return ''
    return dayjs(dateStr, 'MM-DD-YYYY').format('YYYY-MM-DD')
  }

  const handleSearch = () => {
    // Remove empty values and 'all' placeholder values
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '' && value !== null && value !== 'all') {
        acc[key as keyof InvoiceSearchFilters] = value
      }
      return acc
    }, {} as InvoiceSearchFilters)

    onSearch(cleanFilters)
  }

  const handleClear = () => {
    setFilters({ page: 1, limit: 50 })
    onClear()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon className="h-5 w-5" />
          Invoice Search & Investigation
        </CardTitle>
        <CardDescription>
          Search for invoices and view audit trails for chargeback investigations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              placeholder="First or Last Name"
              value={filters.customerName || ''}
              onChange={(e) => updateFilter('customerName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Customer City"
              value={filters.city || ''}
              onChange={(e) => updateFilter('city', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={filters.status || ''} 
              onValueChange={(value) => updateFilter('status', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Agent and Vendor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agentId">Agent</Label>
            <TypeaheadSelect
              options={[
                { key: 'all', value: 'All Agents' },
                ...availableAgents.map(agent => ({ key: agent.id, value: agent.name }))
              ]}
              value={filters.agentId?.toString() || 'all'}
              onValueChange={(value) => updateFilter('agentId', value === 'all' ? undefined : parseInt(value as string))}
              placeholder="Select Agent"
              searchPlaceholder="Search agents..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendorId">Vendor</Label>
            <Select 
              value={filters.vendorId?.toString() || ''} 
              onValueChange={(value) => updateFilter('vendorId', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {availableVendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sale Date Range</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={formatDateForInput(filters.saleDateFrom)}
                onChange={(e) => handleDateChange('saleDateFrom', e.target.value)}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={formatDateForInput(filters.saleDateTo)}
                onChange={(e) => handleDateChange('saleDateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Change Date Range</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={formatDateForInput(filters.changedDateFrom)}
                onChange={(e) => handleDateChange('changedDateFrom', e.target.value)}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={formatDateForInput(filters.changedDateTo)}
                onChange={(e) => handleDateChange('changedDateTo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mb-4"
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </Button>

          {showAdvanced && (
            <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
              {/* Amount Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Min Amount"
                      value={filters.amountFrom || ''}
                      onChange={(e) => updateFilter('amountFrom', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max Amount"
                      value={filters.amountTo || ''}
                      onChange={(e) => updateFilter('amountTo', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionType">Change Type</Label>
                  <Select 
                    value={filters.actionType || ''} 
                    onValueChange={(value) => updateFilter('actionType', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Changes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Changes</SelectItem>
                      <SelectItem value="UPDATE">Updates</SelectItem>
                      <SelectItem value="DELETE">Deletions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="statusChanged"
                    checked={filters.statusChanged || false}
                    onCheckedChange={(checked) => updateFilter('statusChanged', checked || undefined)}
                  />
                  <Label htmlFor="statusChanged">Only show status changes</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="amountChanged"
                    checked={filters.amountChanged || false}
                    onCheckedChange={(checked) => updateFilter('amountChanged', checked || undefined)}
                  />
                  <Label htmlFor="amountChanged">Only show amount changes</Label>
                </div>
              </div>

              {/* Additional Date Ranges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Date Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={formatDateForInput(filters.issueDateFrom)}
                      onChange={(e) => handleDateChange('issueDateFrom', e.target.value)}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={formatDateForInput(filters.issueDateTo)}
                      onChange={(e) => handleDateChange('issueDateTo', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Week Ending Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={formatDateForInput(filters.wkendingFrom)}
                      onChange={(e) => handleDateChange('wkendingFrom', e.target.value)}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={formatDateForInput(filters.wkendingTo)}
                      onChange={(e) => handleDateChange('wkendingTo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t">
          <Button 
            onClick={handleSearch} 
            disabled={isLoading}
            className="flex-1 md:flex-none"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            {isLoading ? 'Searching...' : 'Search Invoices'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear Filters
          </Button>

          <Button 
            variant="outline" 
            onClick={() => {/* Export functionality */}}
            disabled={isLoading}
            className="ml-auto"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Filter Summary */}
        {Object.keys(filters).filter(key => 
          key !== 'page' && key !== 'limit' && 
          filters[key as keyof InvoiceSearchFilters] !== undefined &&
          filters[key as keyof InvoiceSearchFilters] !== ''
        ).length > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (key === 'page' || key === 'limit' || value === undefined || value === '') return null
                return (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}