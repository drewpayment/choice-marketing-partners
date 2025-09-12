import { Metadata } from 'next'
import { EmployeeForm } from '@/components/employees/EmployeeForm'

export const metadata: Metadata = {
  title: 'Create Employee | Choice Marketing Partners',
  description: 'Create a new employee record',
}

export default function CreateEmployeePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create New Employee</h1>
          <p className="text-muted-foreground">
            Add a new employee to the system with optional user account creation.
          </p>
        </div>
        
        <EmployeeForm />
      </div>
    </div>
  )
}
