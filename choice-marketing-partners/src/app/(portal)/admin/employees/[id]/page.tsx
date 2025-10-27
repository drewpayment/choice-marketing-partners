import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Edit, Mail, Phone, MapPin, User, Shield, Users, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { UserAccountActions } from '@/components/employees/UserAccountActions'

interface EmployeeDetailPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: EmployeeDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const employeeRepo = new EmployeeRepository()
  const employee = await employeeRepo.getEmployeeById(parseInt(resolvedParams.id))

  return {
    title: employee ? `${employee.name} | Choice Marketing Partners` : 'Employee Not Found',
    description: employee ? `Employee details for ${employee.name}` : 'Employee not found',
  }
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const resolvedParams = await params
  const employeeRepo = new EmployeeRepository()
  const employee = await employeeRepo.getEmployeeById(parseInt(resolvedParams.id))

  if (!employee) {
    notFound()
  }

  const getEmployeeInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusBadge = () => {
    if (employee.deleted_at) {
      return <Badge variant="destructive">Deleted</Badge>
    }
    if (!employee.is_active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getRoleBadges = () => {
    const badges = []
    if (employee.is_admin) {
      badges.push(
        <Badge key="admin" variant="destructive" className="text-xs">
          <Shield className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      )
    }
    if (employee.is_mgr) {
      badges.push(
        <Badge key="manager" variant="default" className="text-xs">
          <Users className="mr-1 h-3 w-3" />
          Manager
        </Badge>
      )
    }
    if (!employee.is_admin && !employee.is_mgr) {
      badges.push(
        <Badge key="employee" variant="outline" className="text-xs">
          <User className="mr-1 h-3 w-3" />
          Employee
        </Badge>
      )
    }
    return badges
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/employees">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employees
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              <p className="text-muted-foreground">{employee.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/employees/${employee.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Employee
              </Button>
            </Link>
          </div>
        </div>

        {/* Employee Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getEmployeeInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge()}
                  {getRoleBadges()}
                  {employee.hasUser && (
                    <Badge variant="outline" className="text-xs">
                      <UserCheck className="mr-1 h-3 w-3" />
                      User Account
                    </Badge>
                  )}
                  {employee.hidden_payroll && (
                    <Badge variant="secondary" className="text-xs">
                      Hidden from Payroll
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                  
                  {employee.phone_no && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phone_no}</span>
                    </div>
                  )}
                </div>

                {employee.created_at && (
                  <div className="text-sm text-muted-foreground">
                    Joined: {new Date(employee.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Account Actions */}
        <UserAccountActions
          employee={{
            id: employee.id.toString(),
            name: employee.name,
            email: employee.email,
            hasUser: !!employee.user,
          }}
        />

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Address</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>{employee.address}</div>
                  {employee.address_2 && <div>{employee.address_2}</div>}
                  <div>
                    {[employee.city, employee.state, employee.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {employee.country && employee.country !== 'US' && (
                    <div>{employee.country}</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Contact Details</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {employee.email}
                  </div>
                  {employee.phone_no && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {employee.phone_no}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Information */}
        {(employee.sales_id1 || employee.sales_id2 || employee.sales_id3) && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employee.sales_id1 && (
                  <div>
                    <div className="text-sm font-medium">Primary Sales ID</div>
                    <div className="text-sm text-muted-foreground">{employee.sales_id1}</div>
                  </div>
                )}
                {employee.sales_id2 && (
                  <div>
                    <div className="text-sm font-medium">Secondary Sales ID</div>
                    <div className="text-sm text-muted-foreground">{employee.sales_id2}</div>
                  </div>
                )}
                {employee.sales_id3 && (
                  <div>
                    <div className="text-sm font-medium">Tertiary Sales ID</div>
                    <div className="text-sm text-muted-foreground">{employee.sales_id3}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Account Information */}
        {employee.user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                User Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">{employee.user.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Role</div>
                  <div className="text-sm text-muted-foreground capitalize">{employee.user.role}</div>
                </div>
                {employee.user.created_at && (
                  <div>
                    <div className="text-sm font-medium">Account Created</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(employee.user.created_at).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}