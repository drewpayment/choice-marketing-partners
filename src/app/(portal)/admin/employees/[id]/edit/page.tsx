import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { EmployeeForm } from '@/components/employees/EmployeeForm'

interface EditEmployeePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: EditEmployeePageProps): Promise<Metadata> {
  const employeeRepo = new EmployeeRepository()
  const employee = await employeeRepo.getEmployeeById(parseInt(params.id))
  
  return {
    title: employee ? `Edit ${employee.name} | Choice Marketing Partners` : 'Employee Not Found',
    description: employee ? `Edit employee information for ${employee.name}` : 'Employee not found',
  }
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const employeeRepo = new EmployeeRepository()
  const employee = await employeeRepo.getEmployeeById(parseInt(params.id))

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