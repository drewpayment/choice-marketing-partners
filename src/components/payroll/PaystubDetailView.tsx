'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Mail, FileText, Edit, Printer, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/utils/logger'

interface PaystubDetailProps {
  paystub: {
    employee: {
      id: number
      name: string
      email: string
      sales_id1: string
      is_active: number
      is_admin: number
      is_mgr: number
    }
    vendor: {
      id: number
      name: string
      is_active: number
    }
    issueDate: string
    sales: Array<{
      invoice_id: number
      agentid: number
      amount: string
      first_name: string
      last_name: string
      address: string
      city: string
      vendor: string
      sale_date: Date
      issue_date: Date
    }>
    overrides: Array<{
      ovrid: number
      agentid: number
      name: string
      sales: number
      commission: string
      total: string
      issue_date: Date
    }>
    expenses: Array<{
      expid: number
      agentid: number
      type: string
      amount: string
      notes: string
      issue_date: Date
    }>
    totals: {
      sales: number
      overrides: number
      expenses: number
      netPay: number
    }
    isPaid?: boolean
    generatedAt?: string
    weekending?: string
  }
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
  returnUrl?: string
}

export default function PaystubDetailView({ paystub, userContext, returnUrl }: PaystubDetailProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSalesExpanded, setIsSalesExpanded] = useState(true)
  const [isOverridesExpanded, setIsOverridesExpanded] = useState(false)
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false)

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
  }

  // Convert YYYY-MM-DD to MM-DD-YYYY for invoice route
  const formatDateForInvoiceRoute = (dateStr: string): string => {
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`
    }
    return dateStr
  }

  interface CollapsibleSectionProps {
    title: string
    count: number
    isExpanded: boolean
    onToggle: () => void
    children: React.ReactNode
  }

  const CollapsibleSection = ({ title, count, isExpanded, onToggle, children }: CollapsibleSectionProps) => {
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onToggle()
      }
    }

    return (
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          role="button"
          aria-expanded={isExpanded}
          tabIndex={0}
        >
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center text-base md:text-lg">
              {title}
              <span className="ml-2 text-sm font-normal text-gray-500">({count})</span>
            </CardTitle>
            <svg
              className={cn(
                "h-5 w-5 text-gray-400 transition-transform",
                isExpanded ? "rotate-180" : ""
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            {children}
          </CardContent>
        )}
      </Card>
    )
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch(`/api/payroll/pdf/${paystub.employee.id}/${paystub.vendor.id}/${paystub.issueDate}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `paystub-${paystub.employee.name}-${paystub.issueDate}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Failed to generate PDF')
      }
    } catch (error) {
      logger.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendEmail = async () => {
    setIsSendingEmail(true)
    try {
      const response = await fetch(`/api/payroll/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: paystub.employee.id,
          vendorId: paystub.vendor.id,
          issueDate: paystub.issueDate,
          recipientEmail: paystub.employee.email,
        }),
      })

      if (response.ok) {
        alert('Email sent successfully!')
      } else {
        throw new Error('Failed to send email')
      }
    } catch (error) {
      logger.error('Email sending error:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sticky Mobile Header */}
      <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 p-4 shadow-sm mb-4">
        <Link href={returnUrl || "/payroll"}>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-semibold text-gray-900">{paystub.vendor.name}</h2>
            <p className="text-sm text-gray-600">{formatDate(paystub.issueDate)}</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(paystub.totals.netPay)}
            </div>
            <Badge variant={paystub.isPaid ? 'default' : 'secondary'} className="text-xs mt-1">
              {paystub.isPaid ? 'Paid' : 'Unpaid'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={returnUrl || "/payroll"}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payroll
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Paystub Details
              </h1>
              <p className="text-sm text-gray-500">
                {paystub.employee.name} - {paystub.vendor.name} - {formatDate(paystub.issueDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            {(userContext.isAdmin || userContext.isManager) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            )}
            {userContext.isAdmin && !paystub.isPaid && (
              <Link
                href={`/invoices/detail/${paystub.employee.id}/${paystub.vendor.id}/${formatDateForInvoiceRoute(paystub.issueDate)}${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Invoice
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Version
            </Button>

            {userContext.isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
                    logger.log('Delete invoice:', {
                      employeeId: paystub.employee.id,
                      vendorId: paystub.vendor.id,
                      issueDate: paystub.issueDate
                    })
                  }
                }}
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Invoice
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      <div className="md:hidden grid grid-cols-2 gap-2 px-4 mb-4">
        <Button
          variant="outline"
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF}
          className="w-full min-h-[44px]"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGeneratingPDF ? 'Generating...' : 'Download'}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="w-full min-h-[44px]"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-green-600">
              {formatCurrency(paystub.totals.sales)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {paystub.sales.length} transaction(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Overrides</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-blue-600">
              {formatCurrency(paystub.totals.overrides)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {paystub.overrides.length} override(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-red-600">
              {formatCurrency(paystub.totals.expenses)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {paystub.expenses.length} expense(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Net Pay</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-lg md:text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(paystub.totals.netPay)}
            </div>
            <div className="flex items-center mt-1">
              <Badge variant={paystub.isPaid ? 'default' : 'secondary'} className="text-xs">
                {paystub.isPaid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee and Vendor Info - Desktop Only */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <span className="text-sm">{paystub.employee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <span className="text-sm">{paystub.employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Agent ID:</span>
              <span className="text-sm">{paystub.employee.sales_id1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <Badge variant={paystub.employee.is_active ? 'default' : 'secondary'}>
                {paystub.employee.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <span className="text-sm">{paystub.vendor.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Vendor ID:</span>
              <span className="text-sm">{paystub.vendor.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Issue Date:</span>
              <span className="text-sm">{formatDate(paystub.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <Badge variant={paystub.vendor.is_active ? 'default' : 'secondary'}>
                {paystub.vendor.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Transactions */}
      {paystub.sales.length > 0 && (
        <CollapsibleSection
          title="Sales Transactions"
          count={paystub.sales.length}
          isExpanded={isSalesExpanded}
          onToggle={() => setIsSalesExpanded(!isSalesExpanded)}
        >
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Invoice</TableHead>
                  <TableHead className="hidden md:table-cell text-xs md:text-sm">Customer</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs md:text-sm">Location</TableHead>
                  <TableHead className="text-xs md:text-sm">Date</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.sales.map((sale) => (
                  <TableRow key={sale.invoice_id}>
                    <TableCell className="font-medium text-xs md:text-sm">#{sale.invoice_id}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs md:text-sm">
                      {sale.first_name} {sale.last_name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs md:text-sm">
                      {sale.address && `${sale.address}, `}{sale.city}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">{formatDate(sale.sale_date.toISOString().split('T')[0])}</TableCell>
                    <TableCell className="text-right font-medium text-xs md:text-sm">
                      {formatCurrency(sale.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>
      )}

      {/* Overrides */}
      {paystub.overrides.length > 0 && (
        <CollapsibleSection
          title="Override Commissions"
          count={paystub.overrides.length}
          isExpanded={isOverridesExpanded}
          onToggle={() => setIsOverridesExpanded(!isOverridesExpanded)}
        >
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">ID</TableHead>
                  <TableHead className="text-xs md:text-sm">Name</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Sales</TableHead>
                  <TableHead className="text-right hidden sm:table-cell text-xs md:text-sm">Commission</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.overrides.map((override) => (
                  <TableRow key={override.ovrid}>
                    <TableCell className="font-medium text-xs md:text-sm">#{override.ovrid}</TableCell>
                    <TableCell className="text-xs md:text-sm">{override.name}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm">{formatCurrency(override.sales)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-xs md:text-sm">{override.commission}</TableCell>
                    <TableCell className="text-right font-medium text-xs md:text-sm">
                      {formatCurrency(override.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>
      )}

      {/* Expenses */}
      {paystub.expenses.length > 0 && (
        <CollapsibleSection
          title="Expenses"
          count={paystub.expenses.length}
          isExpanded={isExpensesExpanded}
          onToggle={() => setIsExpensesExpanded(!isExpensesExpanded)}
        >
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">ID</TableHead>
                  <TableHead className="text-xs md:text-sm">Type</TableHead>
                  <TableHead className="hidden md:table-cell text-xs md:text-sm">Notes</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.expenses.map((expense) => (
                  <TableRow key={expense.expid}>
                    <TableCell className="font-medium text-xs md:text-sm">#{expense.expid}</TableCell>
                    <TableCell className="text-xs md:text-sm">{expense.type}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs md:text-sm">{expense.notes}</TableCell>
                    <TableCell className="text-right font-medium text-green-600 text-xs md:text-sm">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>
      )}

      {/* Generation Info */}
      {paystub.generatedAt && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-500">
              Paystub generated on {formatDate(paystub.generatedAt.split('T')[0])} at{' '}
              {new Date(paystub.generatedAt).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
