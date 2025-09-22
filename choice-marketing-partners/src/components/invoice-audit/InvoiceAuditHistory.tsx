'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  HistoryIcon, 
  UserIcon, 
  CalendarIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  ArrowRightIcon,
  ClockIcon
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

// Import types from the repository
export interface InvoiceAuditRecord {
  id: number
  invoice_id: number
  action_type: 'UPDATE' | 'DELETE'
  changed_by: number
  changed_at: Date
  
  // Previous state
  previous_vendor: string | null
  previous_sale_date: Date | null
  previous_first_name: string | null
  previous_last_name: string | null
  previous_address: string | null
  previous_city: string | null
  previous_status: string | null
  previous_amount: number | null
  previous_agentid: number | null
  previous_issue_date: Date | null
  previous_wkending: Date | null
  
  // Current state
  current_vendor: string | null
  current_sale_date: Date | null
  current_first_name: string | null
  current_last_name: string | null
  current_address: string | null
  current_city: string | null
  current_status: string | null
  current_amount: number | null
  current_agentid: number | null
  current_issue_date: Date | null
  current_wkending: Date | null
  
  change_reason: string | null
  ip_address: string | null
  
  // Enhanced metadata
  changed_by_name?: string
  days_since_sale?: number
  days_since_issue?: number
  
  // Field change indicators
  changes: {
    vendor?: { from: string | null; to: string | null }
    sale_date?: { from: string | null; to: string | null }
    first_name?: { from: string | null; to: string | null }
    last_name?: { from: string | null; to: string | null }
    address?: { from: string | null; to: string | null }
    city?: { from: string | null; to: string | null }
    status?: { from: string | null; to: string | null }
    amount?: { from: number | null; to: number | null }
    agentid?: { from: number | null; to: number | null }
    issue_date?: { from: string | null; to: string | null }
    wkending?: { from: string | null; to: string | null }
  }
}

interface InvoiceAuditHistoryProps {
  auditRecords: InvoiceAuditRecord[]
  invoiceId?: number
  isLoading?: boolean
  title?: string
  showInvoiceId?: boolean
}

// Component to display individual field changes
const FieldChange: React.FC<{
  label: string
  change: { from: string | number | null; to: string | number | null }
  isAmount?: boolean
  isStatus?: boolean
}> = ({ label, change, isAmount = false, isStatus = false }) => {
  const formatValue = (value: string | number | null) => {
    if (value === null) return 'N/A'
    if (isAmount && typeof value === 'number') {
      return `$${value.toFixed(2)}`
    }
    return String(value)
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return 'secondary'
    switch (status.toLowerCase()) {
      case 'active': return 'default'
      case 'charged back': return 'destructive'
      case 'cancelled': return 'secondary'
      case 'pending': return 'outline'
      case 'refunded': return 'outline'
      default: return 'secondary'
    }
  }

  const getAmountChangeIcon = (from: number | null, to: number | null) => {
    if (from === null || to === null) return null
    if (to > from) return <TrendingUpIcon className="h-3 w-3 text-green-600" />
    if (to < from) return <TrendingDownIcon className="h-3 w-3 text-red-600" />
    return null
  }

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-2">
        {isStatus ? (
          <>
            <Badge variant={getStatusColor(String(change.from))} className="text-xs">
              {formatValue(change.from)}
            </Badge>
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
            <Badge variant={getStatusColor(String(change.to))} className="text-xs">
              {formatValue(change.to)}
            </Badge>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{formatValue(change.from)}</span>
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{formatValue(change.to)}</span>
            {isAmount && getAmountChangeIcon(change.from as number, change.to as number)}
          </div>
        )}
      </div>
    </div>
  )
}

// Component for individual audit record
const AuditRecordCard: React.FC<{
  record: InvoiceAuditRecord
  showInvoiceId?: boolean
}> = ({ record, showInvoiceId = false }) => {
  const hasChanges = Object.keys(record.changes).length > 0
  const changeCount = Object.keys(record.changes).length
  const timeAgo = dayjs(record.changed_at).fromNow()
  const changeDate = dayjs(record.changed_at).format('MMM D, YYYY h:mm A')

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {record.action_type === 'DELETE' ? (
                <Badge variant="destructive" className="text-xs">
                  DELETED
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  UPDATED
                </Badge>
              )}
              {showInvoiceId && (
                <span className="text-sm text-muted-foreground">
                  Invoice #{record.invoice_id}
                </span>
              )}
              {changeCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {changeCount} change{changeCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {record.changed_by_name || `User #${record.changed_by}`}
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {timeAgo}
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {changeDate}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {hasChanges && (
        <CardContent className="pt-0">
          <div className="space-y-2 bg-muted/30 p-3 rounded-md">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Field Changes:
            </h4>
            
            {record.changes.status && (
              <FieldChange
                label="Status"
                change={record.changes.status}
                isStatus={true}
              />
            )}
            
            {record.changes.amount && (
              <FieldChange
                label="Amount"
                change={record.changes.amount}
                isAmount={true}
              />
            )}
            
            {record.changes.first_name && (
              <FieldChange
                label="First Name"
                change={record.changes.first_name}
              />
            )}
            
            {record.changes.last_name && (
              <FieldChange
                label="Last Name"
                change={record.changes.last_name}
              />
            )}
            
            {record.changes.city && (
              <FieldChange
                label="City"
                change={record.changes.city}
              />
            )}
            
            {record.changes.address && (
              <FieldChange
                label="Address"
                change={record.changes.address}
              />
            )}
            
            {record.changes.sale_date && (
              <FieldChange
                label="Sale Date"
                change={record.changes.sale_date}
              />
            )}
            
            {record.changes.issue_date && (
              <FieldChange
                label="Issue Date"
                change={record.changes.issue_date}
              />
            )}
            
            {record.changes.wkending && (
              <FieldChange
                label="Week Ending"
                change={record.changes.wkending}
              />
            )}
            
            {record.changes.vendor && (
              <FieldChange
                label="Vendor"
                change={record.changes.vendor}
              />
            )}
            
            {record.changes.agentid && (
              <FieldChange
                label="Agent ID"
                change={record.changes.agentid}
              />
            )}
          </div>

          {record.change_reason && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <span className="font-medium text-blue-900">Reason: </span>
              <span className="text-blue-800">{record.change_reason}</span>
            </div>
          )}

          {record.days_since_sale !== undefined && record.days_since_sale > 30 && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
              <span className="font-medium text-amber-900">⚠️ Investigation Note: </span>
              <span className="text-amber-800">
                This change occurred {record.days_since_sale} days after the original sale date
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Main component
export const InvoiceAuditHistory: React.FC<InvoiceAuditHistoryProps> = ({
  auditRecords,
  invoiceId,
  isLoading = false,
  title = "Audit History",
  showInvoiceId = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading audit history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (auditRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            {title}
            {invoiceId && <span className="text-muted-foreground">- Invoice #{invoiceId}</span>}
          </CardTitle>
          <CardDescription>
            Complete audit trail of changes made to invoice records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit history found for this invoice.</p>
            <p className="text-sm">Changes will appear here once modifications are made.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group records by date for better organization
  const groupedRecords = auditRecords.reduce((groups, record) => {
    const date = dayjs(record.changed_at).format('YYYY-MM-DD')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(record)
    return groups
  }, {} as Record<string, InvoiceAuditRecord[]>)

  const sortedDates = Object.keys(groupedRecords).sort((a, b) => 
    dayjs(b).valueOf() - dayjs(a).valueOf()
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5" />
          {title}
          {invoiceId && <span className="text-muted-foreground">- Invoice #{invoiceId}</span>}
          <Badge variant="outline" className="ml-auto">
            {auditRecords.length} record{auditRecords.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          Complete audit trail of changes made to invoice records for investigation purposes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 py-2 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {dayjs(date).format('MMMM D, YYYY')}
                  <span className="ml-2 text-xs">
                    ({groupedRecords[date].length} change{groupedRecords[date].length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <Separator className="mt-1" />
              </div>
              
              <div className="space-y-3 mb-6">
                {groupedRecords[date]
                  .sort((a, b) => dayjs(b.changed_at).valueOf() - dayjs(a.changed_at).valueOf())
                  .map((record, recordIndex) => (
                    <AuditRecordCard
                      key={`${date}-${record.id}-${recordIndex}`}
                      record={record}
                      showInvoiceId={showInvoiceId}
                    />
                  ))
                }
              </div>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {auditRecords.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Changes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {auditRecords.filter(r => r.action_type === 'UPDATE').length}
              </div>
              <div className="text-xs text-muted-foreground">Updates</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {auditRecords.filter(r => r.action_type === 'DELETE').length}
              </div>
              <div className="text-xs text-muted-foreground">Deletions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(auditRecords.map(r => r.changed_by)).size}
              </div>
              <div className="text-xs text-muted-foreground">Different Users</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}