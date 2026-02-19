'use client'

import { useEffect, useState } from 'react'
import { Plus, Package } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Price {
  id: number
  stripe_price_id: string
  amount_cents: number
  currency: string
  interval: 'month' | 'quarter' | 'year' | 'one_time'
  interval_count: number
  is_active: number
}

interface Product {
  id: number
  stripe_product_id: string
  name: string
  description: string | null
  type: 'recurring' | 'one_time' | 'custom'
  is_active: number
  created_at: string | null
  prices: Price[]
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatInterval(interval: string, count: number): string {
  if (interval === 'one_time') return 'one-time'
  if (count === 1) return `/ ${interval}`
  return `/ ${count} ${interval}s`
}

export default function ProductsListPage() {
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    type: 'recurring' as 'recurring' | 'one_time',
    amount_cents: '',
    interval: 'month' as string,
    interval_count: '1',
  })
  const { toast } = useToast()

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/products')
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      logger.error('Error fetching products:', error)
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (subscriptionsEnabled === true) {
      fetchProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled])

  const handleToggleActive = async (product: Product) => {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      })
      if (!response.ok) throw new Error('Failed to update product')
      toast({
        title: 'Success',
        description: `Product ${product.is_active ? 'archived' : 'activated'}`,
      })
      fetchProducts()
    } catch (error) {
      logger.error('Error updating product:', error)
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      })
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newProduct.name.trim() || !newProduct.amount_cents) {
      toast({
        title: 'Validation Error',
        description: 'Name and amount are required',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const amountCents = Math.round(parseFloat(newProduct.amount_cents) * 100)

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          description: newProduct.description.trim() || undefined,
          type: newProduct.type,
          amount_cents: amountCents,
          interval: newProduct.type === 'one_time' ? 'one_time' : newProduct.interval,
          interval_count: parseInt(newProduct.interval_count) || 1,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create product')
      }

      toast({
        title: 'Success',
        description: 'Product created and synced with Stripe',
      })

      setNewProduct({
        name: '',
        description: '',
        type: 'recurring',
        amount_cents: '',
        interval: 'month',
        interval_count: '1',
      })
      setIsAddDialogOpen(false)
      fetchProducts()
    } catch (error) {
      logger.error('Error creating product:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create product',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (subscriptionsEnabled === null) {
    return <div className="container mx-auto py-10"><p className="text-muted-foreground">Loading...</p></div>
  }
  if (!subscriptionsEnabled) {
    return <div className="container mx-auto py-10"><p className="text-muted-foreground">This feature is not available.</p></div>
  }

  return (
    <div className="container mx-auto py-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products & Pricing</h1>
          <p className="text-muted-foreground mt-1">
            Manage billing products and pricing plans
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddProduct}>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Create a new product with initial pricing. This will sync to Stripe.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Pro Plan"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Product description"
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={newProduct.type}
                    onValueChange={(value: 'recurring' | 'one_time') =>
                      setNewProduct((p) => ({ ...p, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">Recurring</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="49.99"
                    value={newProduct.amount_cents}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, amount_cents: e.target.value }))
                    }
                    required
                  />
                </div>
                {newProduct.type === 'recurring' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Interval</Label>
                      <Select
                        value={newProduct.interval}
                        onValueChange={(value) =>
                          setNewProduct((p) => ({ ...p, interval: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="quarter">Quarterly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="interval_count">Every X intervals</Label>
                      <Input
                        id="interval_count"
                        type="number"
                        min="1"
                        value={newProduct.interval_count}
                        onChange={(e) =>
                          setNewProduct((p) => ({
                            ...p,
                            interval_count: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Product'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border rounded-lg">
          <p className="text-muted-foreground mb-4">No products yet</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.type === 'recurring'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {product.type === 'recurring' ? 'Recurring' : 'One Time'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.is_active
                          ? 'bg-emerald-50 text-teal-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Archived'}
                    </span>
                    <Switch
                      checked={!!product.is_active}
                      onCheckedChange={() => handleToggleActive(product)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {product.prices.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {product.prices.map((price) => (
                      <div
                        key={price.id}
                        className={`rounded-lg border px-4 py-3 ${
                          price.is_active
                            ? 'bg-background'
                            : 'bg-muted/50 opacity-60'
                        }`}
                      >
                        <p className="text-xl font-bold font-mono">
                          {formatCurrency(price.amount_cents)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatInterval(price.interval, price.interval_count)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No prices configured</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
