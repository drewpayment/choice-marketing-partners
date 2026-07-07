'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { PaystubDeleteDialog, type DeletionPreview } from '@/components/payroll/PaystubDeleteDialog'
import { useToast } from '@/hooks/use-toast'

interface FieldConfig {
  field_key: string
  field_label: string
  source: 'builtin' | 'custom'
  display_order: number
}

const DEFAULT_FIELD_CONFIG: FieldConfig[] = [
  { field_key: 'invoice_id', field_label: 'Invoice', source: 'builtin', display_order: 0 },
  { field_key: 'full_name', field_label: 'Customer', source: 'builtin', display_order: 1 },
  { field_key: 'city', field_label: 'Location', source: 'builtin', display_order: 2 },
  { field_key: 'sale_date', field_label: 'Date', source: 'builtin', display_order: 3 },
  { field_key: 'amount', field_label: 'Amount', source: 'builtin', display_order: 4 },
]

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
      custom_fields?: Record<string, string>
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
    advances?: Array<{
      advance_id: number
      agentid: number
      vendor_id: number
      amount: number
      advance_date: string
      issue_date: string
      wkending: string
      method: string
      notes: string
    }>
    totals: {
      sales: number
      overrides: number
      expenses: number
      advances?: number
      netPay: number
    }
    isPaid?: boolean
    generatedAt?: string
    weekending?: string
    fieldConfig?: FieldConfig[]
  }
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
  returnUrl?: string
}

interface CollapsibleSectionProps {
  title: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

// Hoisted to module scope so it is not recreated on every parent render
// (which would remount its subtree and reset any local state).
function CollapsibleSection({ title, count, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle()
    }
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted transition-colors"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
      >
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-base md:text-lg">
            {title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>
          </CardTitle>
          <svg
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
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

export default function PaystubDetailView({ paystub, userContext, returnUrl }: PaystubDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePreview, setDeletePreview] = useState<DeletionPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSalesExpanded, setIsSalesExpanded] = useState(true)
  const [isOverridesExpanded, setIsOverridesExpanded] = useState(false)
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false)
  const [isAdvancesExpanded, setIsAdvancesExpanded] = useState(false)

  const advances = paystub.advances ?? []
  const advancesTotal = paystub.totals.advances ?? 0
  // "Earned this week" is everything credited before daily pay is netted out.
  const earnedThisWeek = paystub.totals.sales + paystub.totals.overrides + paystub.totals.expenses

  const handleDeleteClick = async () => {
    setDeleteDialogOpen(true)
    setIsLoadingPreview(true)
    setDeletePreview(null)

    try {
      const response = await fetch(
        `/api/admin/payroll/${paystub.employee.id}/${paystub.vendor.id}/${paystub.issueDate}/preview`
      )
      if (!response.ok) {
        throw new Error('Preview request failed')
      }
      const data = await response.json()
      setDeletePreview(data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load deletion preview.',
        variant: 'destructive',
      })
      setDeleteDialogOpen(false)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleConfirmDelete = async (reason: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/admin/payroll/${paystub.employee.id}/${paystub.vendor.id}/${paystub.issueDate}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: 'Deletion failed',
          description: data.error || 'Failed to delete pay statement.',
          variant: 'destructive',
        })
        throw new Error(data.error)
      }

      toast({
        title: 'Pay statement deleted',
        description: 'The pay statement and all related records have been removed.',
      })
      router.push(returnUrl || '/payroll')
    } catch (error) {
      logger.error('Delete paystub error:', error)
      setIsDeleting(false)
      throw error
    }
  }

  // Use vendor field config if available, otherwise fall back to hardcoded defaults
  const activeFieldConfig = paystub.fieldConfig?.length ? paystub.fieldConfig : DEFAULT_FIELD_CONFIG

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
  }

  const formatMethod = (method: string): string => {
    const m = (method || 'other').toLowerCase()
    if (m === 'ach') return 'ACH'
    return m.charAt(0).toUpperCase() + m.slice(1)
  }

  // Convert YYYY-MM-DD to MM-DD-YYYY for invoice route
  const formatDateForInvoiceRoute = (dateStr: string): string => {
    const parts = dateStr.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`
    }
    return dateStr
  }

  // Extract a value from a sale row for a built-in field key
  const getBuiltinValue = (sale: Record<string, unknown>, key: string): string => {
    switch (key) {
      case 'sale_date': return formatDate(String(sale.sale_date ?? ''))
      case 'full_name': return `${sale.first_name ?? ''} ${sale.last_name ?? ''}`.trim()
      case 'first_name': return String(sale.first_name ?? '')
      case 'last_name': return String(sale.last_name ?? '')
      case 'address': return String(sale.address ?? '')
      case 'city': return String(sale.city ?? '')
      case 'status': return String(sale.status ?? '')
      case 'amount': return formatCurrency(sale.amount as string | number)
      case 'invoice_id': return `#${sale.invoice_id}`
      case 'vendor': return String(sale.vendor ?? '')
      default: return ''
    }
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch(
        `/api/payroll/pdf/${paystub.employee.id}/${paystub.vendor.id}/${paystub.issueDate}`
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const safeName = paystub.employee.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
        a.download = `paystub_${safeName}_${paystub.issueDate}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Failed to generate PDF')
      }
    } catch (error) {
      logger.error('PDF generation error:', error)
      toast({
        title: 'Download failed',
        description: 'Could not generate the paystub PDF. Please try again.',
        variant: 'destructive',
      })
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
        toast({
          title: 'Email sent',
          description: 'The pay statement was emailed successfully.',
        })
      } else {
        throw new Error('Failed to send email')
      }
    } catch (error) {
      logger.error('Email sending error:', error)
      toast({
        title: 'Email failed',
        description: 'Could not send the pay statement email. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sticky Mobile Header */}
      <div className="md:hidden sticky top-0 z-10 bg-card border-b border-border p-4 shadow-sm mb-4">
        <Link href={returnUrl || "/payroll"}>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-semibold text-foreground">{paystub.vendor.name}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(paystub.issueDate)}</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-primary' : 'text-destructive'}`}>
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
              <h1 className="text-2xl font-bold text-foreground">
                Paystub Details
              </h1>
              <p className="text-sm text-muted-foreground">
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
                  className="bg-primary/10 hover:bg-primary/10 border-primary text-primary"
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
              className="bg-muted hover:bg-muted border-border text-foreground"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Version
            </Button>

            {userContext.isAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteClick}
                className="bg-destructive/10 hover:bg-destructive/10 border-destructive text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Invoice'}
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
        {userContext.isAdmin && (
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={handleDeleteClick}
            className="col-span-2 w-full min-h-[44px] bg-destructive/10 hover:bg-destructive/20 border-destructive text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Invoice'}
          </Button>
        )}
      </div>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-primary">
              {formatCurrency(paystub.totals.sales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paystub.sales.length} transaction(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Overrides</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-primary">
              {formatCurrency(paystub.totals.overrides)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paystub.overrides.length} override(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-lg md:text-2xl font-bold ${paystub.totals.expenses < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {formatCurrency(paystub.totals.expenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paystub.expenses.length} adjustment(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className={`text-lg md:text-2xl font-bold ${paystub.totals.netPay >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(paystub.totals.netPay)}
            </div>
            <div className="flex items-center mt-1">
              <Badge variant={paystub.isPaid ? 'default' : 'secondary'} className="text-xs">
                {paystub.isPaid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
            <p className="hidden md:block text-xs text-muted-foreground mt-2">
              {advancesTotal > 0
                ? 'Sales + Overrides + Adjustments − Daily Pay = Net Pay'
                : 'Sales + Overrides + Adjustments = Net Pay'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Net-pay reconciliation — only when daily pay was taken this week */}
      {advancesTotal > 0 && (
        <div className="px-4 md:px-0">
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Earned this week
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {formatCurrency(earnedThisWeek)}
                  </p>
                  <p className="text-xs text-muted-foreground">Sales + Overrides + Adjustments</p>
                </div>
                <div className="text-muted-foreground hidden sm:block" aria-hidden="true">→</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Daily pay received
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-destructive">
                    −{formatCurrency(advancesTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {advances.length} payment{advances.length === 1 ? '' : 's'} already paid out
                  </p>
                </div>
                <div className="text-muted-foreground hidden sm:block" aria-hidden="true">→</div>
                <div className="min-w-0 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Net deposit
                  </p>
                  <p
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      paystub.totals.netPay >= 0 ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {formatCurrency(paystub.totals.netPay)}
                  </p>
                  <p className="text-xs text-muted-foreground">Remaining to be deposited</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <span className="text-sm">{paystub.employee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Email:</span>
              <span className="text-sm">{paystub.employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Agent ID:</span>
              <span className="text-sm">{paystub.employee.sales_id1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
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
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <span className="text-sm">{paystub.vendor.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Vendor ID:</span>
              <span className="text-sm">{paystub.vendor.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Issue Date:</span>
              <span className="text-sm">{formatDate(paystub.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <Badge variant={paystub.vendor.is_active ? 'default' : 'secondary'}>
                {paystub.vendor.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Transactions — Dynamic Columns */}
      {paystub.sales.length > 0 && (
        <CollapsibleSection
          title="Sales Transactions"
          count={paystub.sales.length}
          isExpanded={isSalesExpanded}
          onToggle={() => setIsSalesExpanded(!isSalesExpanded)}
        >
          {/* Mobile: two-line rows so nothing hides behind horizontal scroll */}
          <div className="sm:hidden divide-y divide-border">
            {paystub.sales.map((sale) => {
              const row = sale as unknown as Record<string, unknown>
              const name = getBuiltinValue(row, 'full_name') || getBuiltinValue(row, 'invoice_id')
              const amount = getBuiltinValue(row, 'amount')
              const date = getBuiltinValue(row, 'sale_date')
              const secondary = getBuiltinValue(row, 'city') || getBuiltinValue(row, 'invoice_id')
              return (
                <div key={sale.invoice_id} className="py-3 first:pt-0">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="text-sm font-medium text-foreground truncate min-w-0">{name}</span>
                    <span className="text-sm font-medium tabular-nums shrink-0">{amount}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{date}</span>
                    {secondary ? (
                      <span className="text-xs text-muted-foreground truncate">{secondary}</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop / tablet: full table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeFieldConfig.map((field) => (
                    <TableHead
                      key={field.field_key}
                      className={cn(
                        "text-xs md:text-sm",
                        field.field_key === 'amount' && "text-right"
                      )}
                    >
                      {field.field_label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.sales.map((sale) => (
                  <TableRow key={sale.invoice_id}>
                    {activeFieldConfig.map((field) => {
                      const value = field.source === 'builtin'
                        ? getBuiltinValue(sale as unknown as Record<string, unknown>, field.field_key)
                        : (sale.custom_fields?.[field.field_key] ?? '')

                      return (
                        <TableCell
                          key={field.field_key}
                          className={cn(
                            "text-xs md:text-sm",
                            field.field_key === 'amount' && "text-right font-medium tabular-nums",
                            field.field_key === 'invoice_id' && "font-medium"
                          )}
                        >
                          {value}
                        </TableCell>
                      )
                    })}
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
          {/* Mobile: two-line rows */}
          <div className="sm:hidden divide-y divide-border">
            {paystub.overrides.map((override) => (
              <div key={override.ovrid} className="py-3 first:pt-0">
                <div className="flex justify-between items-baseline gap-3">
                  <span className="text-sm font-medium text-foreground truncate min-w-0">{override.name}</span>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatCurrency(override.total)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {Math.trunc(Number(override.sales) || 0)} sale(s)
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {override.commission}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / tablet: full table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">ID</TableHead>
                  <TableHead className="text-xs md:text-sm">Name</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Sales</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Commission</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paystub.overrides.map((override) => (
                  <TableRow key={override.ovrid}>
                    <TableCell className="font-medium text-xs md:text-sm">#{override.ovrid}</TableCell>
                    <TableCell className="text-xs md:text-sm">{override.name}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm tabular-nums">{Math.trunc(Number(override.sales) || 0)}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm tabular-nums">{override.commission}</TableCell>
                    <TableCell className="text-right font-medium text-xs md:text-sm tabular-nums">
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
          title="Adjustments & Reimbursements"
          count={paystub.expenses.length}
          isExpanded={isExpensesExpanded}
          onToggle={() => setIsExpensesExpanded(!isExpensesExpanded)}
        >
          {/* Mobile: two-line rows */}
          <div className="sm:hidden divide-y divide-border">
            {paystub.expenses.map((expense) => {
              const amt = parseFloat(expense.amount) || 0
              return (
                <div key={expense.expid} className="py-3 first:pt-0">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="text-sm font-medium text-foreground truncate min-w-0">{expense.type}</span>
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums shrink-0",
                        amt < 0 ? "text-destructive" : "text-foreground"
                      )}
                    >
                      {formatCurrency(amt)}
                    </span>
                  </div>
                  {expense.notes ? (
                    <div className="mt-0.5">
                      <span className="text-xs text-muted-foreground">{expense.notes}</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Desktop / tablet: full table */}
          <div className="hidden sm:block overflow-x-auto">
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
                {paystub.expenses.map((expense) => {
                  const amt = parseFloat(expense.amount) || 0
                  return (
                    <TableRow key={expense.expid}>
                      <TableCell className="font-medium text-xs md:text-sm">#{expense.expid}</TableCell>
                      <TableCell className="text-xs md:text-sm">{expense.type}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs md:text-sm">{expense.notes}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium text-xs md:text-sm tabular-nums",
                          amt < 0 ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {formatCurrency(amt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>
      )}

      {/* Daily Pay Received (advances) */}
      {advances.length > 0 && (
        <CollapsibleSection
          title="Daily Pay Received"
          count={advances.length}
          isExpanded={isAdvancesExpanded}
          onToggle={() => setIsAdvancesExpanded(!isAdvancesExpanded)}
        >
          {/* Mobile: two-line rows */}
          <div className="sm:hidden divide-y divide-border">
            {advances.map((advance) => (
              <div key={advance.advance_id} className="py-3 first:pt-0">
                <div className="flex justify-between items-baseline gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(advance.advance_date)}
                  </span>
                  <span className="text-sm font-medium tabular-nums shrink-0 text-destructive">
                    −{formatCurrency(advance.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-3 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {formatMethod(advance.method)}
                  </Badge>
                  {advance.notes ? (
                    <span className="text-xs text-muted-foreground truncate min-w-0 text-right">
                      {advance.notes}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / tablet: full table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Date Paid</TableHead>
                  <TableHead className="text-xs md:text-sm">Method</TableHead>
                  <TableHead className="hidden md:table-cell text-xs md:text-sm">Notes</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((advance) => (
                  <TableRow key={advance.advance_id}>
                    <TableCell className="text-xs md:text-sm">{formatDate(advance.advance_date)}</TableCell>
                    <TableCell className="text-xs md:text-sm">
                      <Badge variant="secondary" className="text-xs">
                        {formatMethod(advance.method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs md:text-sm">{advance.notes}</TableCell>
                    <TableCell className="text-right font-medium text-xs md:text-sm tabular-nums text-destructive">
                      −{formatCurrency(advance.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-xs md:text-sm font-medium">
                    Total daily pay received
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs md:text-sm tabular-nums text-destructive">
                    −{formatCurrency(advancesTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CollapsibleSection>
      )}

      {/* Generation Info */}
      {paystub.generatedAt && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Paystub generated on {formatDate(paystub.generatedAt.split('T')[0])} at{' '}
              {new Date(paystub.generatedAt).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}
      {userContext.isAdmin && (
        <PaystubDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          preview={deletePreview}
          isLoadingPreview={isLoadingPreview}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  )
}
