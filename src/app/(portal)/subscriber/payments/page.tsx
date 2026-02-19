'use client'

import { useEffect, useState } from 'react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

interface Payment {
  id: number
  stripe_invoice_id: string
  amount_cents: number
  currency: string
  status: string
  description: string | null
  invoice_pdf_url: string | null
  paid_at: string | null
  created_at: string | null
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-50 text-teal-700',
    pending: 'bg-amber-50 text-amber-700',
    failed: 'bg-red-50 text-red-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-stone-100 text-stone-500'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export default function PaymentsPage() {
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Client-side pagination
  const [page, setPage] = useState(1)
  const limit = 15

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/subscriber/payments')
        if (!response.ok) throw new Error('Failed to fetch payments')
        const data = await response.json()
        setPayments(Array.isArray(data) ? data : [])
      } catch (error) {
        logger.error('Error fetching payments:', error)
        toast({
          title: 'Error',
          description: 'Failed to load payment history',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (subscriptionsEnabled === true) {
      fetchPayments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled])

  const totalPages = Math.ceil(payments.length / limit)
  const paginatedPayments = payments.slice((page - 1) * limit, page * limit)

  if (subscriptionsEnabled === null) {
    return <div className="container mx-auto py-10"><p className="text-muted-foreground">Loading...</p></div>
  }
  if (!subscriptionsEnabled) {
    return <div className="container mx-auto py-10"><p className="text-muted-foreground">This feature is not available.</p></div>
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-muted-foreground mt-1">
            View all your past payments and invoices
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border rounded-lg">
          <p className="text-muted-foreground">No payments recorded yet</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground">
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )
                        : payment.created_at
                          ? new Date(payment.created_at).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )
                          : '-'}
                    </TableCell>
                    <TableCell>{payment.description || 'Payment'}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(payment.amount_cents)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      {payment.invoice_pdf_url ? (
                        <a
                          href={payment.invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Download PDF
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * limit + 1}-
                {Math.min(page * limit, payments.length)} of {payments.length}{' '}
                payments
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
