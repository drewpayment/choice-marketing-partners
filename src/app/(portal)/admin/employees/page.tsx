import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { EmployeeList } from '@/components/employees/EmployeeList'
import { EmployeeFilters } from '@/components/employees/EmployeeFilters'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Employee Management | Choice Marketing Partners',
  description: 'Manage employees and user accounts'
}

interface EmployeesPageProps {
  searchParams: Promise<{
    search?: string
    status?: 'active' | 'inactive' | 'all'
    role?: 'admin' | 'manager' | 'employee' | 'all'
    hasUser?: string
    page?: string
    limit?: string
  }>
}

const employeeRepository = new EmployeeRepository()

export default async function EmployeesPage({ searchParams: paramsPromise }: EmployeesPageProps) {
  const searchParams = await paramsPromise
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    redirect('/forbidden')
  }

  // Parse search parameters with active as default status
  const filters = {
    search: searchParams.search,
    status: (searchParams.status || 'active') as 'active' | 'inactive' | 'all',
    role: (searchParams.role || 'all') as 'admin' | 'manager' | 'employee' | 'all',
    hasUser: searchParams.hasUser === 'true' ? true : 
             searchParams.hasUser === 'false' ? false : undefined,
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '20')
  }

  // Fetch employees with server-side rendering
  const employeePage = await employeeRepository.getEmployees(filters)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employees and their user accounts
          </p>
        </div>
        <Link href="/admin/employees/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{employeePage.total}</div>
          <p className="text-sm text-muted-foreground">Total Employees</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">
            {employeePage.employees.filter(emp => emp.is_active && !emp.deleted_at).length}
          </div>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">
            {employeePage.employees.filter(emp => emp.hasUser).length}
          </div>
          <p className="text-sm text-muted-foreground">With User Accounts</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {employeePage.employees.filter(emp => emp.is_admin || emp.is_mgr).length}
          </div>
          <p className="text-sm text-muted-foreground">Managers/Admins</p>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters initialFilters={filters} />

      {/* Employee List */}
      <EmployeeList 
        initialData={employeePage}
        currentFilters={filters}
      />
    </div>
  )
}
