import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { EmployeeForm } from '@/components/employees/EmployeeForm'

interface EditEmployeePageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: EditEmployeePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const employeeRepo = new EmployeeRepository()
  const employee = await employeeRepo.getEmployeeById(parseInt(resolvedParams.id))

  return {
    title: employee ? `Edit ${employee.name} | Choice Marketing Partners` : 'Employee Not Found',
    description: employee ? `Edit employee information for ${employee.name}` : 'Employee not found',
  }
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const resolvedParams = await params
  const session = await getServerSession(authOptions)
  const userContext = await getEmployeeContext(
    session?.user?.employeeId,
    session?.user?.isAdmin || false,
    session?.user?.isManager || false
  )
  const employeeRepo = new EmployeeRepository()
  const employee = await employeeRepo.getEmployeeById(parseInt(resolvedParams.id), userContext)

  if (!employee) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Edit Employee</h1>
          <p className="text-muted-foreground">
            Update information for {employee.name}
          </p>
        </div>
        
        <EmployeeForm employee={employee} mode="edit" />
      </div>
    </div>
  )
}