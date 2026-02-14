'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PayrollSummary } from '@/lib/repositories/PayrollRepository'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  } from '@/components/ui/pagination'

interface PayrollListProps {
  data: PayrollSummary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
}

export default function PayrollList({ data, pagination, userContext }: PayrollListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sortField, setSortField] = useState<keyof PayrollSummary>('lastUpdated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Build returnUrl from current search params to preserve filters
  const buildReturnUrl = () => {
    const currentParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      currentParams.set(key, value)
    })
    const paramString = currentParams.toString()
    return paramString ? `/payroll?${paramString}` : '/payroll'
  }

  const handleSort = (field: keyof PayrollSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    router.push(`/payroll?${params.toString()}`)
  }

  const generatePageNumbers = () => {
    const pages = []
    const { page, totalPages } = pagination
    
    // Always show first page
    if (totalPages > 0) pages.push(1)
    
    // Show ellipsis if there's a gap
    if (page > 3) pages.push('...')
    
    // Show pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) pages.push(i)
    }
    
    // Show ellipsis if there's a gap
    if (page < totalPages - 2) pages.push('...')
    
    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages)
    
    return pages
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    // Special handling for date fields (issueDate and lastUpdated)
    if (sortField === 'issueDate' || sortField === 'lastUpdated') {
      const aDate = new Date(aValue as string).getTime()
      const bDate = new Date(bValue as string).getTime()
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (data.length === 0) {
    return (
      <div className="bg-card shadow rounded-lg">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">No payroll data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No payroll data found for the selected criteria.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card shadow overflow-hidden sm:rounded-lg">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-foreground">
          Payroll Data
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} payroll entries
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('employeeName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Employee</span>
                  {sortField === 'employeeName' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('vendorName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Vendor</span>
                  {sortField === 'vendorName' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('issueDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Issue Date</span>
                  {sortField === 'issueDate' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('totalSales')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Sales</span>
                  {sortField === 'totalSales' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('totalOverrides')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Overrides</span>
                  {sortField === 'totalOverrides' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('totalExpenses')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Expenses</span>
                  {sortField === 'totalExpenses' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('netPay')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Net Pay</span>
                  {sortField === 'netPay' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('lastUpdated')}
              >
                <div className="flex items-center space-x-1">
                  <span>Last Updated</span>
                  {sortField === 'lastUpdated' && (
                    <span className={sortDirection === 'asc' ? 'text-foreground' : 'text-foreground rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={`${item.employeeId}-${item.vendorId}-${item.issueDate}`}>
                <TableCell className="font-medium">
                  {item.employeeName}
                  <div className="text-xs text-muted-foreground">
                    Agent: {item.agentId}
                  </div>
                </TableCell>
                <TableCell>{item.vendorName}</TableCell>
                <TableCell>{formatDate(item.issueDate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalOverrides)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalExpenses)}</TableCell>
                <TableCell className="text-right">
                  <span className={`font-medium ${item.netPay >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(item.netPay)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-foreground">
                    {new Date(item.lastUpdated).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.lastUpdated).toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/payroll/${item.employeeId}/${item.vendorId}/${item.issueDate}?returnUrl=${encodeURIComponent(buildReturnUrl())}`}
                    className="text-primary hover:text-primary mr-4"
                  >
                    View Details
                  </Link>
                  {(userContext.isAdmin || userContext.isManager) && (
                    <button
                      className="text-primary hover:text-primary"
                      onClick={() => {
                        // TODO: Implement email functionality
                        alert('Email functionality will be implemented in TASK-306')
                      }}
                    >
                      Send Email
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (Employees Only) */}
      {!userContext.isAdmin && !userContext.isManager && (
        <div className="md:hidden space-y-3 p-4">
          {sortedData.map((item) => (
            <Link
              key={`${item.employeeId}-${item.vendorId}-${item.issueDate}`}
              href={`/payroll/${item.employeeId}/${item.vendorId}/${item.issueDate}?returnUrl=${encodeURIComponent(buildReturnUrl())}`}
              className="block"
              aria-label={`View payroll details for ${item.vendorName}, ${formatDate(item.issueDate)}, net pay ${formatCurrency(item.netPay)}`}
            >
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow active:bg-muted">
                  {/* Vendor Name - Primary */}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {item.vendorName}
                    </h3>
                    <svg
                      className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Issue Date */}
                  <div className="text-sm text-muted-foreground mb-3">
                    {formatDate(item.issueDate)}
                  </div>

                  {/* Net Pay - Highlighted */}
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-sm font-medium text-foreground">Net Pay</span>
                    <span className={`text-xl font-bold ${item.netPay >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(item.netPay)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          }
        </div>
      )}

      {/* Mobile Table Fallback (Managers/Admins on Mobile) */}
      {(userContext.isAdmin || userContext.isManager) && (
        <div className="md:hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Employee</TableHead>
                <TableHead className="text-sm">Vendor</TableHead>
                <TableHead className="text-right text-sm">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => (
                <TableRow key={`${item.employeeId}-${item.vendorId}-${item.issueDate}`}>
                  <TableCell className="font-medium text-sm">
                    {item.employeeName}
                  </TableCell>
                  <TableCell className="text-sm">{item.vendorName}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/payroll/${item.employeeId}/${item.vendorId}/${item.issueDate}?returnUrl=${encodeURIComponent(buildReturnUrl())}`}
                      className="text-sm font-medium text-primary"
                    >
                      {formatCurrency(item.netPay)}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {(pagination.totalPages > 1 || pagination.total > pagination.limit) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border sm:px-6">
          <div className="flex items-center text-sm text-foreground">
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </span>
          </div>
          {pagination.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                {pagination.hasPrev && (
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(pagination.page - 1)
                      }}
                    />
                  </PaginationItem>
                )}
                
                {generatePageNumbers().map((pageNum, index) => (
                  <PaginationItem key={index}>
                    {pageNum === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={pageNum === pagination.page}
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pageNum as number)
                        }}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                {pagination.hasNext && (
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(pagination.page + 1)
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Summary - Responsive */}
      <div className="bg-muted px-4 py-3 border-t border-border sm:px-6">
        {/* Mobile Summary (Employees) */}
        {!userContext.isAdmin && !userContext.isManager && (
          <div className="md:hidden flex justify-between items-center text-sm text-muted-foreground">
            <span>Total Entries: {data.length}</span>
            <span className="font-medium">
              Page Net Pay: {formatCurrency(data.reduce((sum, item) => sum + item.netPay, 0))}
            </span>
          </div>
        )}

        {/* Desktop Summary (All) & Mobile Summary (Managers/Admins) */}
        <div className={cn(
          "justify-between items-center text-sm text-muted-foreground",
          !userContext.isAdmin && !userContext.isManager ? "hidden md:flex" : "flex"
        )}>
          <span>
            Page Entries: {data.length}
          </span>
          <div className="flex flex-wrap gap-4">
            <span className="hidden lg:inline">
              Page Sales: {formatCurrency(data.reduce((sum, item) => sum + item.totalSales, 0))}
            </span>
            <span className="hidden lg:inline">
              Page Overrides: {formatCurrency(data.reduce((sum, item) => sum + item.totalOverrides, 0))}
            </span>
            <span className="hidden lg:inline">
              Page Expenses: {formatCurrency(data.reduce((sum, item) => sum + item.totalExpenses, 0))}
            </span>
            <span className="font-medium">
              Page Net Pay: {formatCurrency(data.reduce((sum, item) => sum + item.netPay, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
