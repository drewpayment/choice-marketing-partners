import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { ManagerEmployeeRepository } from '@/lib/repositories/ManagerEmployeeRepository'
import { ManagerAssignmentInterface } from '@/components/overrides/ManagerAssignmentInterface'

export const metadata: Metadata = {
  title: 'Manager Assignments | Choice Marketing Partners',
  description: 'Manage employee-manager relationships and overrides'
}

const managerEmployeeRepository = new ManagerEmployeeRepository()

export default async function OverridesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    redirect('/forbidden')
  }

  // Fetch managers and employees data
  const [managers, availableEmployees, unassignedEmployees] = await Promise.all([
    managerEmployeeRepository.getManagers(),
    managerEmployeeRepository.getAvailableEmployees(),
    managerEmployeeRepository.getUnassignedEmployees()
  ])

  // For each manager, get their current employees
  const managersWithEmployees = await Promise.all(
    managers.map(async (manager) => {
      const employees = await managerEmployeeRepository.getManagerEmployees(manager.id)
      return {
        ...manager,
        employees
      }
    })
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manager Assignments</h1>
          <p className="text-muted-foreground">
            Manage employee-manager relationships and override assignments
          </p>
        </div>
      </div>

      {/* Assignment Interface */}
      <ManagerAssignmentInterface 
        initialManagers={managersWithEmployees}
        initialAvailableEmployees={availableEmployees}
        initialUnassignedEmployees={unassignedEmployees}
      />
    </div>
  )
}