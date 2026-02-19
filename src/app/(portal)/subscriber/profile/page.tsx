'use client'

import { useEffect, useState } from 'react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/utils/logger'

interface SubscriberProfile {
  id: number
  business_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  status: string
  users: Array<{ email: string; name: string }>
}

export default function ProfilePage() {
  const subscriptionsEnabled = useFeatureFlag('enable-subscriptions')
  const [profile, setProfile] = useState<SubscriberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/subscriber/profile')
        if (!response.ok) throw new Error('Failed to fetch profile')
        const data = await response.json()
        setProfile(data)
        setForm({
          business_name: data.business_name || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
        })
      } catch (error) {
        logger.error('Error fetching profile:', error)
        toast({
          title: 'Error',
          description: 'Failed to load profile',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (subscriptionsEnabled === true) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsEnabled])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSaving(true)
      const response = await fetch('/api/subscriber/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) throw new Error('Failed to update profile')

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (error) {
      logger.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
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

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Account Profile</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account information
      </p>

      {/* Read-only info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Email
              </p>
              <p className="mt-1 font-medium">
                {profile?.users[0]?.email || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Subscription Status
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1 ${
                  profile?.status === 'active'
                    ? 'bg-emerald-50 text-teal-700'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {profile?.status || 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
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
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
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
                  value={form.postal_code}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
