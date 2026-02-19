'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

interface SubscriberDetail {
  id: number
  stripe_customer_id: string
  email: string
  contact_name: string | null
  business_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  status: 'active' | 'past_due' | 'canceled' | 'paused'
  created_at: string | null
  users: Array<{ user_id: number; email: string; name: string }>
}

interface Subscription {
  id: number
  product_name: string
  price_amount_cents: number
  price_interval: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: number
}

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

interface ProductWithPrices {
  id: number
  name: string
  prices: Array<{
    id: number
    amount_cents: number
    interval: string
    interval_count: number
    is_active: number
  }>
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
    past_due: 'bg-amber-50 text-amber-700',
    canceled: 'bg-stone-100 text-stone-500',
    paused: 'bg-stone-100 text-stone-500',
    paid: 'bg-emerald-50 text-teal-700',
    failed: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-stone-100 text-stone-500'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export default function SubscriberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const subscriberId = params.id as string

  const [subscriber, setSubscriber] = useState<SubscriberDetail | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<ProductWithPrices[]>([])
  const [loading, setLoading] = useState(true)

  // Edit form state
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    email: '',
    contact_name: '',
    business_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Assign plan dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)

  const fetchSubscriber = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/subscribers/${subscriberId}`)
      if (!response.ok) throw new Error('Failed to fetch subscriber')
      const data = await response.json()
      setSubscriber(data)
      setEditForm({
        email: data.email || '',
        contact_name: data.contact_name || '',
        business_name: data.business_name || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        notes: data.notes || '',
      })
    } catch (error) {
      logger.error('Error fetching subscriber:', error)
      toast({
        title: 'Error',
        description: 'Failed to load subscriber',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(
        `/api/admin/subscriptions?subscriber_id=${subscriberId}`
      )
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      logger.error('Error fetching subscriptions:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await fetch(
        `/api/admin/subscribers/${subscriberId}/payments`
      )
      if (response.ok) {
        const data = await response.json()
        setPayments(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      logger.error('Error fetching payments:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      logger.error('Error fetching products:', error)
    }
  }

  useEffect(() => {
    if (subscriptionsEnabled === true) {
      fetchSubscriber()
      fetchSubscriptions()
      fetchPayments()
      fetchProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled, subscriberId])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/admin/subscribers/${subscriberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) throw new Error('Failed to update subscriber')

      toast({ title: 'Success', description: 'Subscriber updated' })
      setIsEditing(false)
      fetchSubscriber()
    } catch (error) {
      logger.error('Error updating subscriber:', error)
      toast({
        title: 'Error',
        description: 'Failed to update subscriber',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenBillingPortal = async () => {
    try {
      const response = await fetch(`/api/admin/subscribers/${subscriberId}/billing-portal`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to create billing portal session')
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

  const handleAssignPlan = async () => {
    if (!selectedPriceId) return

    try {
      setIsAssigning(true)
      const response = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_id: parseInt(subscriberId),
          price_id: parseInt(selectedPriceId),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to assign plan')
      }

      toast({ title: 'Success', description: 'Plan assigned successfully' })
      setIsAssignDialogOpen(false)
      setSelectedPriceId('')
      fetchSubscriptions()
    } catch (error) {
      logger.error('Error assigning plan:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to assign plan',
        variant: 'destructive',
      })
    } finally {
      setIsAssigning(false)
    }
  }

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

  if (!subscriber) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-muted-foreground">Subscriber not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/admin/billing/subscribers')}
        >
          Back to Subscribers
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      {/* Back link */}
      <Link
        href="/admin/billing/subscribers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Subscribers
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {subscriber.business_name || subscriber.contact_name || subscriber.email}
            </h1>
            <StatusBadge status={subscriber.status} />
          </div>
          {subscriber.contact_name && subscriber.business_name && (
            <p className="text-muted-foreground mt-1">{subscriber.contact_name}</p>
          )}
          <p className="text-sm text-muted-foreground">{subscriber.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {isEditing ? 'Cancel Edit' : 'Edit'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Business Name</Label>
                    <Input
                      value={editForm.business_name}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          business_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={editForm.contact_name}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          contact_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Address</Label>
                    <Input
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, address: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>City</Label>
                      <Input
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, city: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>State</Label>
                      <Input
                        value={editForm.state}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, state: e.target.value }))
                        }
                        maxLength={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={editForm.postal_code}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            postal_code: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Input
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField
                    label="Business Name"
                    value={subscriber.business_name}
                  />
                  <InfoField
                    label="Contact Name"
                    value={subscriber.contact_name}
                  />
                  <InfoField
                    label="Email"
                    value={subscriber.email}
                  />
                  <InfoField label="Phone" value={subscriber.phone} />
                  <InfoField label="Address" value={subscriber.address} />
                  <InfoField
                    label="City / State"
                    value={
                      [subscriber.city, subscriber.state]
                        .filter(Boolean)
                        .join(', ') || null
                    }
                  />
                  <InfoField
                    label="Postal Code"
                    value={subscriber.postal_code}
                  />
                  <InfoField label="Notes" value={subscriber.notes} />
                  <InfoField
                    label="Stripe ID"
                    value={subscriber.stripe_customer_id}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Subscriptions</CardTitle>
                <Button onClick={() => setIsAssignDialogOpen(true)}>
                  Assign Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-muted-foreground">
                  No active subscriptions
                </p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div>
                        <p className="font-medium">{sub.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(sub.price_amount_cents)} /{' '}
                          {sub.price_interval}
                        </p>
                        {sub.current_period_end && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Current period ends{' '}
                            {new Date(
                              sub.current_period_end
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign Plan Dialog */}
          <Dialog
            open={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Plan</DialogTitle>
                <DialogDescription>
                  Select a product and price to assign to this subscriber.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Select Price</Label>
                <Select
                  value={selectedPriceId}
                  onValueChange={setSelectedPriceId}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) =>
                      product.prices
                        .filter((p) => p.is_active)
                        .map((price) => (
                          <SelectItem
                            key={price.id}
                            value={price.id.toString()}
                          >
                            {product.name} -{' '}
                            {formatCurrency(price.amount_cents)} /{' '}
                            {price.interval}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignPlan}
                  disabled={!selectedPriceId || isAssigning}
                >
                  {isAssigning ? 'Assigning...' : 'Assign Plan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground">No payments recorded</p>
              ) : (
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
                              ? new Date(
                                  payment.created_at
                                ).toLocaleDateString()
                              : '-'}
                        </TableCell>
                        <TableCell>
                          {payment.description || 'Payment'}
                        </TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Edit Subscriber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div className="grid gap-2">
                  <Label>Business Name</Label>
                  <Input
                    value={editForm.business_name}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        business_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={editForm.contact_name}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        contact_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>City</Label>
                    <Input
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>State</Label>
                    <Input
                      value={editForm.state}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, state: e.target.value }))
                      }
                      maxLength={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={editForm.postal_code}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          postal_code: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Input
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Billing Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Open the Stripe billing portal for this subscriber. They can add a payment method,
                pay outstanding invoices, and manage their subscription.
              </p>
              <Button onClick={handleOpenBillingPortal} variant="outline">
                Open Billing Portal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  )
}
