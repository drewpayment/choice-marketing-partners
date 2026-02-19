'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

export default function NewSubscriberPage() {
  const router = useRouter()
  const { toast } = useToast()
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    email: '',
    contact_name: '',
    business_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.email.trim() || !form.business_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email and business name are required',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create subscriber')
      }

      const subscriber = await response.json()

      toast({
        title: 'Success',
        description: 'Subscriber created successfully',
      })

      router.push(`/admin/billing/subscribers/${subscriber.id}`)
    } catch (error) {
      logger.error('Error creating subscriber:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create subscriber',
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
    <div className="container mx-auto py-10 max-w-2xl">
      <Link
        href="/admin/billing/subscribers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Subscribers
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add New Subscriber</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                name="business_name"
                placeholder="Acme Corp"
                value={form.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                name="contact_name"
                placeholder="John Smith"
                value={form.contact_name}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="subscriber@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="123 Main St"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="ST"
                  value={form.state}
                  onChange={handleChange}
                  maxLength={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  placeholder="12345"
                  value={form.postal_code}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/billing/subscribers')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Subscriber'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
