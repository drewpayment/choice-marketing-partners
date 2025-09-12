'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { EmployeeDetail, CreateEmployeeData, CreateUserData } from '@/lib/repositories/EmployeeRepository'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface EmployeeFormProps {
  employee?: EmployeeDetail
  mode?: 'create' | 'edit'
}

export function EmployeeForm({ employee, mode = 'create' }: EmployeeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone_no: employee?.phone_no || '',
    address: employee?.address || '',
    address_2: employee?.address_2 || '',
    city: employee?.city || '',
    state: employee?.state || '',
    postal_code: employee?.postal_code || '',
    country: employee?.country || 'US',
    is_admin: employee?.is_admin || false,
    is_mgr: employee?.is_mgr || false,
    is_active: employee?.is_active ?? true,
    sales_id1: employee?.sales_id1 || '',
    sales_id2: employee?.sales_id2 || '',
    sales_id3: employee?.sales_id3 || '',
    hidden_payroll: employee?.hidden_payroll || false,
    createUser: false,
    password: '',
    role: (employee?.user?.role as 'admin' | 'author' | 'subscriber') || 'subscriber',
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const employeeData: CreateEmployeeData = {
        name: formData.name,
        email: formData.email,
        phone_no: formData.phone_no,
        address: formData.address,
        address_2: formData.address_2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        is_admin: formData.is_admin,
        is_mgr: formData.is_mgr,
        is_active: formData.is_active,
        sales_id1: formData.sales_id1,
        sales_id2: formData.sales_id2,
        sales_id3: formData.sales_id3,
        hidden_payroll: formData.hidden_payroll,
      }

      const userData: CreateUserData | undefined = formData.createUser ? {
        password: formData.password!,
        role: formData.role,
      } : undefined

      const url = mode === 'edit' && employee 
        ? `/api/employees/${employee.id}`
        : '/api/employees'
      
      const method = mode === 'edit' ? 'PUT' : 'POST'

      // For edit mode, send employee data directly
      // For create mode, include user data if creating a user account
      const requestBody = mode === 'edit' 
        ? employeeData
        : {
            ...employeeData,
            createUser: formData.createUser,
            password: userData?.password,
            userRole: userData?.role
          }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        await response.json()
        router.push(`/admin/employees`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to ${mode} employee`)
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} employee:`, error)
      setError(`Failed to ${mode} employee`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/employees">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_no">Phone Number</Label>
                <Input
                  id="phone_no"
                  value={formData.phone_no}
                  onChange={(e) => handleInputChange('phone_no', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_2">Address Line 2</Label>
              <Input
                id="address_2"
                value={formData.address_2}
                onChange={(e) => handleInputChange('address_2', e.target.value)}
                placeholder="Apt, Suite, Unit, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="10001"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales_id1">Sales ID 1</Label>
                <Input
                  id="sales_id1"
                  value={formData.sales_id1}
                  onChange={(e) => handleInputChange('sales_id1', e.target.value)}
                  placeholder="Primary sales ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sales_id2">Sales ID 2</Label>
                <Input
                  id="sales_id2"
                  value={formData.sales_id2}
                  onChange={(e) => handleInputChange('sales_id2', e.target.value)}
                  placeholder="Secondary sales ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sales_id3">Sales ID 3</Label>
                <Input
                  id="sales_id3"
                  value={formData.sales_id3}
                  onChange={(e) => handleInputChange('sales_id3', e.target.value)}
                  placeholder="Tertiary sales ID"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions & Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions & Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this employee
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Administrator</Label>
                  <p className="text-sm text-muted-foreground">
                    Grant administrative privileges
                  </p>
                </div>
                <Switch
                  checked={formData.is_admin}
                  onCheckedChange={(checked) => handleInputChange('is_admin', checked)}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Manager</Label>
                  <p className="text-sm text-muted-foreground">
                    Grant manager privileges
                  </p>
                </div>
                <Switch
                  checked={formData.is_mgr}
                  onCheckedChange={(checked) => handleInputChange('is_mgr', checked)}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Hide from Payroll</Label>
                  <p className="text-sm text-muted-foreground">
                    Exclude from payroll reports
                  </p>
                </div>
                <Switch
                  checked={formData.hidden_payroll}
                  onCheckedChange={(checked) => handleInputChange('hidden_payroll', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Account Creation */}
        {mode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>User Account (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Create User Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Create a login account for this employee
                  </p>
                </div>
                <Switch
                  checked={formData.createUser}
                  onCheckedChange={(checked) => handleInputChange('createUser', checked)}
                />
              </div>

              {formData.createUser && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Minimum 8 characters"
                        required={formData.createUser}
                        minLength={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">User Role</Label>
                      <select 
                        id="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                      >
                        <option value="subscriber">Subscriber</option>
                        <option value="author">Author</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/employees">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? `${mode === 'edit' ? 'Updating' : 'Creating'}...` : `${mode === 'edit' ? 'Update' : 'Create'} Employee`}
          </Button>
        </div>
      </form>
    </div>
  )
}