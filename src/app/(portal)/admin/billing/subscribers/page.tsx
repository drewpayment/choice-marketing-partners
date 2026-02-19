'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, DollarSign, AlertTriangle, Package } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

interface Subscriber {
  id: number
  stripe_customer_id: string
  email: string
  contact_name: string | null
  business_name: string | null
  phone: string | null
  status: 'active' | 'past_due' | 'canceled' | 'paused'
  created_at: string | null
  updated_at: string | null
}

interface SubscriberPage {
  subscribers: Subscriber[]
  total: number
  page: number
  limit: number
  totalPages: number
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
  }

  const labels: Record<string, string> = {
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    paused: 'Paused',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-stone-100 text-stone-500'}`}
    >
      {labels[status] || status}
    </span>
  )
}

export default function SubscribersListPage() {
  const router = useRouter()
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [data, setData] = useState<SubscriberPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const { toast } = useToast()

  const fetchSubscribers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('page', page.toString())
      params.append('limit', '25')

      const response = await fetch(`/api/admin/subscribers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch subscribers')

      const result = await response.json()
      setData(result)
    } catch (error) {
      logger.error('Error fetching subscribers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load subscribers',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (subscriptionsEnabled === true) {
      fetchSubscribers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled, statusFilter, page])

  useEffect(() => {
    if (subscriptionsEnabled !== true) return
    const timeout = setTimeout(() => {
      setPage(1)
      fetchSubscribers()
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled, searchQuery])

  const subscribers = data?.subscribers ?? []

  // Compute stat cards from current data
  const totalSubscribers = data?.total ?? 0
  const activeCount = subscribers.filter((s) => s.status === 'active').length
  const pastDueCount = subscribers.filter((s) => s.status === 'past_due').length

  if (subscriptionsEnabled === null) {
    return <div className="container mx-auto py-10"><p className="text-muted-foreground">Loading...</p></div>
  }
  if (!subscriptionsEnabled) {
    return <div className="container mx-auto py-10"><p className="text-muted-foreground">This feature is not available.</p></div>
  }

  return (
    <div className="container mx-auto py-10">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
                <p className="text-2xl font-bold">{totalSubscribers}</p>
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Past Due</p>
                <p className="text-2xl font-bold">{pastDueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Page</p>
                <p className="text-2xl font-bold">
                  {data ? `${data.page}/${data.totalPages || 1}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Subscribers</h1>
          <p className="text-muted-foreground mt-1">Manage subscriber accounts and billing</p>
        </div>
        <Button onClick={() => router.push('/admin/billing/subscribers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscriber
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading subscribers...</p>
        </div>
      ) : subscribers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'No subscribers found matching your search' : 'No subscribers yet'}
          </p>
          {!searchQuery && (
            <Button onClick={() => router.push('/admin/billing/subscribers/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Subscriber
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business / Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((subscriber) => {
                const displayName = subscriber.business_name || subscriber.contact_name || subscriber.email
                return (
                  <TableRow
                    key={subscriber.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/admin/billing/subscribers/${subscriber.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {displayName[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate">{subscriber.business_name || '-'}</p>
                          {subscriber.contact_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {subscriber.contact_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {subscriber.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {subscriber.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={subscriber.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {subscriber.created_at
                        ? new Date(subscriber.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(data.page - 1) * data.limit + 1}-
            {Math.min(data.page * data.limit, data.total)} of {data.total} subscribers
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
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
