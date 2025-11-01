'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ManagerWithEmployees, 
  ManagerEmployee 
} from '@/lib/repositories/ManagerEmployeeRepository'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Save, 
  RotateCcw,
  Mail
} from 'lucide-react'

interface ManagerAssignmentInterfaceProps {
  initialManagers: ManagerWithEmployees[]
  initialAvailableEmployees: ManagerEmployee[]
  initialUnassignedEmployees: ManagerEmployee[]
}

interface Assignment {
  managerId: number
  employeeId: number
}

export function ManagerAssignmentInterface({
  initialManagers,
  initialUnassignedEmployees
}: ManagerAssignmentInterfaceProps) {
  const router = useRouter()
  const [managers, setManagers] = useState(initialManagers)
  const [unassignedEmployees, setUnassignedEmployees] = useState(initialUnassignedEmployees)
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getEmployeeInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const assignEmployeeToManager = useCallback((employeeId: number, managerId: number) => {
    // Find the employee
    const employee = unassignedEmployees.find(emp => emp.id === employeeId) ||
                     managers.flatMap(m => m.employees).find(emp => emp.id === employeeId)
    
    if (!employee) return

    // Remove employee from current assignment
    setManagers(prev => prev.map(manager => ({
      ...manager,
      employees: manager.employees.filter(emp => emp.id !== employeeId)
    })))

    setUnassignedEmployees(prev => prev.filter(emp => emp.id !== employeeId))

    // Add employee to new manager
    if (managerId === 0) {
      // Assign to unassigned pool
      setUnassignedEmployees(prev => [...prev, employee])
    } else {
      // Assign to specific manager
      setManagers(prev => prev.map(manager => 
        manager.id === managerId 
          ? { ...manager, employees: [...manager.employees, employee] }
          : manager
      ))
    }

    // Track the assignment change
    setPendingAssignments(prev => {
      // Remove any existing assignment for this employee
      const filtered = prev.filter(a => a.employeeId !== employeeId)
      // Add new assignment (0 means unassigned)
      return [...filtered, { managerId, employeeId }]
    })

    setError('')
    setSuccess('')
  }, [managers, unassignedEmployees])

  const saveAssignments = async () => {
    if (pendingAssignments.length === 0) {
      setError('No changes to save')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/overrides/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          assignments: pendingAssignments
        })
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(`Successfully updated ${result.assignmentsUpdated} assignments`)
        setPendingAssignments([])
        
        // Refresh the page data
        setTimeout(() => {
          router.refresh()
        }, 1500)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save assignments')
      }
    } catch (error) {
      console.error('Error saving assignments:', error)
      setError('Failed to save assignments')
    } finally {
      setIsLoading(false)
    }
  }

  const resetChanges = () => {
    setManagers(initialManagers)
    setUnassignedEmployees(initialUnassignedEmployees)
    setPendingAssignments([])
    setError('')
    setSuccess('')
  }

  const getTotalAssigned = () => {
    return managers.reduce((total, manager) => total + manager.employees.length, 0)
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{managers.length}</div>
            <p className="text-sm text-muted-foreground">Active Managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{getTotalAssigned()}</div>
            <p className="text-sm text-muted-foreground">Assigned Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{unassignedEmployees.length}</div>
            <p className="text-sm text-muted-foreground">Unassigned Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{pendingAssignments.length}</div>
            <p className="text-sm text-muted-foreground">Pending Changes</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {pendingAssignments.length > 0 && (
        <div className="flex gap-4">
          <Button 
            onClick={saveAssignments} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : `Save ${pendingAssignments.length} Changes`}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetChanges} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Changes
          </Button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Assignment Interface */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Managers Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Managers ({managers.length})
          </h2>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {managers.map((manager) => (
              <Card key={manager.id} className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                        {getEmployeeInitials(manager.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{manager.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {manager.email}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {manager.employees.length} employees
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {manager.employees.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-4">
                        No employees assigned
                      </p>
                    ) : (
                      manager.employees.map((employee) => (
                        <div 
                          key={employee.id}
                          className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => assignEmployeeToManager(employee.id, 0)}
                          title="Click to unassign"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getEmployeeInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{employee.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {employee.sales_id1 && `ID: ${employee.sales_id1}`}
                            </div>
                          </div>
                          <UserMinus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Unassigned Employees Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Unassigned Employees ({unassignedEmployees.length})
          </h2>

          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-base text-orange-700">
                Available for Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {unassignedEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    All employees are assigned to managers
                  </p>
                ) : (
                  unassignedEmployees.map((employee) => (
                    <div 
                      key={employee.id}
                      className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getEmployeeInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.sales_id1 && `ID: ${employee.sales_id1}`}
                        </div>
                      </div>
                      
                      {/* Assignment Buttons */}
                      <div className="flex gap-1">
                        {managers.map((manager) => (
                          <Button
                            key={manager.id}
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => assignEmployeeToManager(employee.id, manager.id)}
                            title={`Assign to ${manager.name}`}
                          >
                            {getEmployeeInitials(manager.name)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">How to use this interface:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Click on an assigned employee to unassign them</li>
            <li>• Click the manager initials next to unassigned employees to assign them</li>
            <li>• Changes are tracked but not saved until you click &quot;Save Changes&quot;</li>
            <li>• Use &quot;Reset Changes&quot; to revert all pending modifications</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}