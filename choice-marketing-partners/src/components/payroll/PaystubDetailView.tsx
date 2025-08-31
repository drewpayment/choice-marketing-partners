'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Mail, FileText, Edit, Printer, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
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
      console.error('PDF generation error:', error)
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
      console.error('Email sending error:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          
          {/* Print Version button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Version
          </Button>

          {/* Admin-only Delete Invoice button */}
          {userContext.isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
                  // TODO: Implement delete functionality
                  console.log('Delete invoice:', {
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paystub.totals.sales)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {paystub.sales.length} transaction(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(paystub.totals.overrides)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {paystub.overrides.length} override(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(paystub.totals.expenses)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {paystub.expenses.length} expense(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

      {/* Employee and Vendor Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <Card>
          <CardHeader>
            <CardTitle>Sales Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.sales.map((sale) => (
                  <TableRow key={sale.invoice_id}>
                    <TableCell className="font-medium">#{sale.invoice_id}</TableCell>
                    <TableCell>
                      {sale.first_name} {sale.last_name}
                    </TableCell>
                    <TableCell>
                      {sale.address && `${sale.address}, `}{sale.city}
                    </TableCell>
                    <TableCell>{formatDate(sale.sale_date.toISOString().split('T')[0])}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Overrides */}
      {paystub.overrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Override Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Override ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.overrides.map((override) => (
                  <TableRow key={override.ovrid}>
                    <TableCell className="font-medium">#{override.ovrid}</TableCell>
                    <TableCell>{override.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(override.sales)}</TableCell>
                    <TableCell className="text-right">{override.commission}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(override.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expenses */}
      {paystub.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.expenses.map((expense) => (
                  <TableRow key={expense.expid}>
                    <TableCell className="font-medium">#{expense.expid}</TableCell>
                    <TableCell>{expense.type}</TableCell>
                    <TableCell>{expense.notes}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
