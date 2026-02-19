'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, DollarSign, CalendarDays } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

interface Subscription {
  id: number
  product_name: string
  price_amount_cents: number
  price_interval: string
  status: string
  current_period_end: string | null
}

interface Payment {
  id: number
  amount_cents: number
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
    active: 'bg-emerald-50 text-teal-700',
    paid: 'bg-emerald-50 text-teal-700',
    past_due: 'bg-amber-50 text-amber-700',
    pending: 'bg-amber-50 text-amber-700',
    failed: 'bg-red-50 text-red-700',
    canceled: 'bg-stone-100 text-stone-500',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-stone-100 text-stone-500'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export default function SubscriberDashboard() {
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [subsRes, paymentsRes] = await Promise.all([
          fetch('/api/subscriber/billing'),
          fetch('/api/subscriber/payments'),
        ])

        if (subsRes.ok) {
          const subsData = await subsRes.json()
          setSubscriptions(Array.isArray(subsData) ? subsData : [])
        }

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json()
          const items = Array.isArray(paymentsData) ? paymentsData : []
          setPayments(items.slice(0, 5))
        }
      } catch (error) {
        logger.error('Error fetching billing data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load billing information',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (subscriptionsEnabled === true) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled])

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/subscriber/billing-portal', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to open billing portal')
      const { url } = await response.json()
      window.open(url, '_blank')
    } catch (error) {
      logger.error('Error opening billing portal:', error)
      toast({
        title: 'Error',
        description: 'Failed to open billing portal',
        variant: 'destructive',
      })
    }
  }

  const activeSub = subscriptions.find((s) => s.status === 'active')
  const monthlyAmount = activeSub ? activeSub.price_amount_cents : 0
  const nextBillingDate = activeSub?.current_period_end
    ? new Date(activeSub.current_period_end)
    : null
  const daysRemaining = nextBillingDate
    ? Math.max(
        0,
        Math.ceil(
          (nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null

  if (subscriptionsEnabled === null || loading) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!subscriptionsEnabled) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-muted-foreground">This feature is not available.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view payment history
          </p>
        </div>
        <Button onClick={handleManageBilling} variant="outline">
          Manage Billing
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">
                    {activeSub?.product_name || 'No Plan'}
                  </p>
                  {activeSub && <StatusBadge status={activeSub.status} />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <DollarSign className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Amount</p>
                <p className="text-xl font-bold font-mono">
                  {monthlyAmount > 0 ? formatCurrency(monthlyAmount) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <CalendarDays className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Next Billing Date
                </p>
                <p className="text-xl font-bold">
                  {nextBillingDate
                    ? nextBillingDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
                {daysRemaining !== null && (
                  <p className="text-xs text-muted-foreground">
                    {daysRemaining} days remaining
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recent Payments</h2>
        <Link
          href="/subscriber/payments"
          className="text-sm text-primary hover:underline"
        >
          View All
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">No payments recorded yet</p>
        </div>
      ) : (
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
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-muted-foreground">
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleDateString()
                      : payment.created_at
                        ? new Date(payment.created_at).toLocaleDateString()
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
                        PDF
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
      )}
    </div>
  )
}
