'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PayrollSummary } from '@/lib/repositories/PayrollRepository'
import { formatDate } from '@/lib/utils/date'
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
  const [sortField, setSortField] = useState<keyof PayrollSummary>('issueDate')
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
      <div className="bg-white shadow rounded-lg">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll data</h3>
          <p className="mt-1 text-sm text-gray-500">
            No payroll data found for the selected criteria.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payroll Data
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Showing {data.length} of {pagination.total} payroll entries
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('employeeName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Employee</span>
                  {sortField === 'employeeName' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('vendorName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Vendor</span>
                  {sortField === 'vendorName' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('issueDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Issue Date</span>
                  {sortField === 'issueDate' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalSales')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Sales</span>
                  {sortField === 'totalSales' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalOverrides')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Overrides</span>
                  {sortField === 'totalOverrides' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalExpenses')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Expenses</span>
                  {sortField === 'totalExpenses' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
                      ↑
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('netPay')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Net Pay</span>
                  {sortField === 'netPay' && (
                    <span className={sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-900 rotate-180'}>
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
                  <div className="text-xs text-gray-500">
                    Agent: {item.agentId}
                  </div>
                </TableCell>
                <TableCell>{item.vendorName}</TableCell>
                <TableCell>{formatDate(item.issueDate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalSales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalOverrides)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalExpenses)}</TableCell>
                <TableCell className="text-right">
                  <span className={`font-medium ${item.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(item.netPay)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/payroll/${item.employeeId}/${item.vendorId}/${item.issueDate}?returnUrl=${encodeURIComponent(buildReturnUrl())}`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    View Details
                  </Link>
                  {(userContext.isAdmin || userContext.isManager) && (
                    <button
                      className="text-green-600 hover:text-green-900"
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

      {/* Pagination */}
      {(pagination.totalPages > 1 || pagination.total > pagination.limit) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center text-sm text-gray-700">
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

      {/* Summary */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Page Entries: {data.length}
          </span>
          <div className="flex space-x-6">
            <span>
              Page Sales: {formatCurrency(data.reduce((sum, item) => sum + item.totalSales, 0))}
            </span>
            <span>
              Page Overrides: {formatCurrency(data.reduce((sum, item) => sum + item.totalOverrides, 0))}
            </span>
            <span>
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
