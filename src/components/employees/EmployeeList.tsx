'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmployeeSummary, EmployeePage } from '@/lib/repositories/EmployeeRepository'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Edit,
  Trash2,
  RotateCcw,
  Mail,
  Phone,
  User,
  Shield,
  UserCheck,
  Users
} from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface EmployeeListProps {
  initialData: EmployeePage
  currentFilters: {
    search?: string
    status: 'active' | 'inactive' | 'all'
    role: 'admin' | 'manager' | 'employee' | 'all'
    hasUser?: boolean
    page: number
    limit: number
  }
}

export function EmployeeList({ initialData, currentFilters }: EmployeeListProps) {
  // Use initialData directly instead of state to ensure it updates with server-side rendering
  const employees = initialData.employees
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const getEmployeeInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusBadge = (employee: EmployeeSummary) => {
    if (employee.deleted_at) {
      return <Badge variant="destructive">Deleted</Badge>
    }
    if (!employee.is_active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getRoleBadges = (employee: EmployeeSummary) => {
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

  const handleDelete = async (employee: EmployeeSummary) => {
    if (!confirm(`Are you sure you want to delete ${employee.name}?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        // Refresh the page to get updated data from server
        router.refresh()
      } else {
        alert('Failed to delete employee')
      }
    } catch (error) {
      logger.error('Error deleting employee:', error)
      alert('Failed to delete employee')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (employee: EmployeeSummary) => {
    if (!confirm(`Are you sure you want to restore ${employee.name}?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/employees/${employee.id}/restore`, {
        method: 'PUT',
        credentials: 'include'
      })

      if (response.ok) {
        // Refresh the page to get updated data from server
        router.refresh()
      } else {
        alert('Failed to restore employee')
      }
    } catch (error) {
      logger.error('Error restoring employee:', error)
      alert('Failed to restore employee')
    } finally {
      setIsLoading(false)
    }
  }


  const getPaginationItems = () => {
    const { page, totalPages } = initialData
    const items = []
    
    // Always show first page
    if (page > 3) {
      items.push({ page: 1, label: '1' })
      if (page > 4) {
        items.push({ page: -1, label: '...' }) // Ellipsis
      }
    }
    
    // Show pages around current page
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      items.push({ page: i, label: i.toString() })
    }
    
    // Always show last page
    if (page < totalPages - 2) {
      if (page < totalPages - 3) {
        items.push({ page: -1, label: '...' }) // Ellipsis
      }
      items.push({ page: totalPages, label: totalPages.toString() })
    }
    
    return items
  }

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (currentFilters.search) params.set('search', currentFilters.search)
    if (currentFilters.status !== 'all') params.set('status', currentFilters.status)
    if (currentFilters.role !== 'all') params.set('role', currentFilters.role)
    if (currentFilters.hasUser !== undefined) params.set('hasUser', currentFilters.hasUser.toString())
    params.set('page', page.toString())
    if (currentFilters.limit !== 20) params.set('limit', currentFilters.limit.toString())
    
    return `/admin/employees?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      {/* Employee Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getEmployeeInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/employees/${employee.id}`}>
                    <CardTitle className="text-base truncate hover:text-primary cursor-pointer">
                      {employee.name}
                    </CardTitle>
                  </Link>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  {employee.phone_no && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{employee.phone_no}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Status and Role Badges */}
              <div className="flex flex-wrap gap-1">
                {getStatusBadge(employee)}
                {getRoleBadges(employee)}
                {employee.hasUser && (
                  <Badge variant="outline" className="text-xs">
                    <UserCheck className="mr-1 h-3 w-3" />
                    User Account
                  </Badge>
                )}
              </div>

              {/* Sales IDs */}
              {(employee.sales_id1 || employee.sales_id2 || employee.sales_id3) && (
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">Sales IDs:</div>
                  <div className="flex gap-2">
                    {employee.sales_id1 && <span>{employee.sales_id1}</span>}
                    {employee.sales_id2 && <span>{employee.sales_id2}</span>}
                    {employee.sales_id3 && <span>{employee.sales_id3}</span>}
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="text-xs text-muted-foreground">
                Joined: {employee.created_at ? new Date(employee.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Link href={`/admin/employees/${employee.id}`}>
                  <Button size="sm" variant="outline" title="View Details">
                    <Edit className="h-3 w-3" />
                  </Button>
                </Link>

                {employee.deleted_at ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRestore(employee)}
                    disabled={isLoading}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDelete(employee)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {initialData.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              {initialData.page > 1 && (
                <PaginationItem>
                  <PaginationPrevious href={createPageUrl(initialData.page - 1)} />
                </PaginationItem>
              )}
              
              {getPaginationItems().map((item, index) => (
                <PaginationItem key={index}>
                  {item.page === -1 ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink 
                      href={createPageUrl(item.page)}
                      isActive={item.page === initialData.page}
                    >
                      {item.label}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              {initialData.page < initialData.totalPages && (
                <PaginationItem>
                  <PaginationNext href={createPageUrl(initialData.page + 1)} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Empty State */}
      {employees.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No employees found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search filters or add a new employee.
          </p>
          <div className="mt-6">
            <Link href="/admin/employees/create">
              <Button>Add Employee</Button>
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}
