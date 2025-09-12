import { db } from '@/lib/database/client'

/**
 * Manager-Employee relationship interfaces
 */
export interface Manager {
  id: number
  name: string
  email: string
  employeeCount: number
  managedEmployeeIds: number[]
}

export interface ManagerWithEmployees extends Manager {
  employees: ManagerEmployee[]
}

export interface ManagerEmployee {
  id: number
  name: string
  email: string
  sales_id1: string
  is_active: boolean
}

export interface Assignment {
  managerId: number
  employeeId: number
}

/**
 * Repository for manager-employee relationship operations
 */
export class ManagerEmployeeRepository {
  /**
   * Get all managers with employee counts
   */
  async getManagers(): Promise<Manager[]> {
    const managers = await db
      .selectFrom('employees')
      .leftJoin('manager_employees', 'employees.id', 'manager_employees.manager_id')
      .select([
        'employees.id',
        'employees.name',
        'employees.email',
        db.fn.count('manager_employees.employee_id').as('employeeCount')
      ])
      .where('employees.is_mgr', '=', 1)
      .where('employees.is_active', '=', 1)
      .where('employees.deleted_at', 'is', null)
      .groupBy(['employees.id', 'employees.name', 'employees.email'])
      .orderBy('employees.name', 'asc')
      .execute()

    // Get managed employee IDs for each manager
    const managersWithIds = await Promise.all(
      managers.map(async (manager) => {
        const managedEmployeeIds = await this.getManagedEmployeeIds(manager.id)
        return {
          ...manager,
          employeeCount: Number(manager.employeeCount),
          managedEmployeeIds
        }
      })
    )

    return managersWithIds
  }

  /**
   * Get manager details with assigned employees
   */
  async getManagerWithEmployees(managerId: number): Promise<ManagerWithEmployees | null> {
    const manager = await db
      .selectFrom('employees')
      .select(['id', 'name', 'email'])
      .where('id', '=', managerId)
      .where('is_mgr', '=', 1)
      .where('is_active', '=', 1)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!manager) return null

    const employees = await this.getManagerEmployees(managerId)
    const managedEmployeeIds = employees.map(emp => emp.id)

    return {
      ...manager,
      employeeCount: employees.length,
      managedEmployeeIds,
      employees
    }
  }

  /**
   * Get employees assigned to a specific manager
   */
  async getManagerEmployees(managerId: number): Promise<ManagerEmployee[]> {
    const employees = await db
      .selectFrom('manager_employees')
      .innerJoin('employees', 'manager_employees.employee_id', 'employees.id')
      .select([
        'employees.id',
        'employees.name',
        'employees.email',
        'employees.sales_id1',
        'employees.is_active'
      ])
      .where('manager_employees.manager_id', '=', managerId)
      .where('employees.deleted_at', 'is', null)
      .orderBy('employees.name', 'asc')
      .execute()

    return employees.map(emp => ({
      ...emp,
      is_active: Boolean(emp.is_active)
    }))
  }

  /**
   * Get all unassigned employees (not assigned to any manager)
   */
  async getUnassignedEmployees(): Promise<ManagerEmployee[]> {
    const employees = await db
      .selectFrom('employees')
      .leftJoin('manager_employees', 'employees.id', 'manager_employees.employee_id')
      .select([
        'employees.id',
        'employees.name',
        'employees.email',
        'employees.sales_id1',
        'employees.is_active'
      ])
      .where('employees.is_active', '=', 1)
      .where('employees.deleted_at', 'is', null)
      .where('employees.is_mgr', '=', 0) // Don't include managers in unassigned list
      .where('employees.sales_id1', '!=', '') // Only employees with sales IDs
      .where('employees.sales_id1', 'is not', null)
      .where('manager_employees.employee_id', 'is', null)
      .orderBy('employees.name', 'asc')
      .execute()

    return employees.map(emp => ({
      ...emp,
      is_active: Boolean(emp.is_active)
    }))
  }

  /**
   * Get all employees available for assignment (active, non-managers)
   */
  async getAvailableEmployees(): Promise<ManagerEmployee[]> {
    const employees = await db
      .selectFrom('employees')
      .select([
        'id',
        'name',
        'email',
        'sales_id1',
        'is_active'
      ])
      .where('is_active', '=', 1)
      .where('deleted_at', 'is', null)
      .where('is_mgr', '=', 0) // Don't include managers
      .where('sales_id1', '!=', '') // Only employees with sales IDs
      .where('sales_id1', 'is not', null)
      .orderBy('name', 'asc')
      .execute()

    return employees.map(emp => ({
      ...emp,
      is_active: Boolean(emp.is_active)
    }))
  }

  /**
   * Get managed employee IDs for a specific manager
   */
  async getManagedEmployeeIds(managerId: number): Promise<number[]> {
    const relationships = await db
      .selectFrom('manager_employees')
      .select('employee_id')
      .where('manager_id', '=', managerId)
      .execute()

    return relationships.map(rel => rel.employee_id)
  }

  /**
   * Assign an employee to a manager
   */
  async assignEmployeeToManager(managerId: number, employeeId: number): Promise<boolean> {
    try {
      // Check if assignment already exists
      const existingAssignment = await db
        .selectFrom('manager_employees')
        .select('id')
        .where('manager_id', '=', managerId)
        .where('employee_id', '=', employeeId)
        .executeTakeFirst()

      if (existingAssignment) {
        return true // Already assigned
      }

      // Remove any existing assignment for this employee
      await db
        .deleteFrom('manager_employees')
        .where('employee_id', '=', employeeId)
        .execute()

      // Create new assignment
      await db
        .insertInto('manager_employees')
        .values({
          manager_id: managerId,
          employee_id: employeeId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute()

      return true
    } catch (error) {
      console.error('Error assigning employee to manager:', error)
      return false
    }
  }

  /**
   * Remove an employee from a manager
   */
  async removeEmployeeFromManager(managerId: number, employeeId: number): Promise<boolean> {
    try {
      const result = await db
        .deleteFrom('manager_employees')
        .where('manager_id', '=', managerId)
        .where('employee_id', '=', employeeId)
        .execute()

      return result.length > 0
    } catch (error) {
      console.error('Error removing employee from manager:', error)
      return false
    }
  }

  /**
   * Remove employee from any manager (make unassigned)
   */
  async unassignEmployee(employeeId: number): Promise<boolean> {
    try {
      await db
        .deleteFrom('manager_employees')
        .where('employee_id', '=', employeeId)
        .execute()

      return true
    } catch (error) {
      console.error('Error unassigning employee:', error)
      return false
    }
  }

  /**
   * Bulk update assignments for a manager
   */
  async bulkUpdateAssignments(managerId: number, employeeIds: number[]): Promise<boolean> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Remove all current assignments for this manager
        await trx
          .deleteFrom('manager_employees')
          .where('manager_id', '=', managerId)
          .execute()

        // Add new assignments
        if (employeeIds.length > 0) {
          const assignments = employeeIds.map(employeeId => ({
            manager_id: managerId,
            employee_id: employeeId,
            created_at: new Date(),
            updated_at: new Date()
          }))

          await trx
            .insertInto('manager_employees')
            .values(assignments)
            .execute()
        }

        return true
      })
    } catch (error) {
      console.error('Error bulk updating assignments:', error)
      return false
    }
  }

  /**
   * Update multiple assignments in one transaction
   */
  async updateAssignments(assignments: Assignment[]): Promise<boolean> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Group assignments by manager for efficient updates
        const assignmentsByManager = assignments.reduce((acc, assignment) => {
          if (!acc[assignment.managerId]) {
            acc[assignment.managerId] = []
          }
          acc[assignment.managerId].push(assignment.employeeId)
          return acc
        }, {} as Record<number, number[]>)

        // Update assignments for each manager
        for (const [managerId, employeeIds] of Object.entries(assignmentsByManager)) {
          const managerIdNum = Number(managerId)
          
          // Remove existing assignments for these employees
          await trx
            .deleteFrom('manager_employees')
            .where('employee_id', 'in', employeeIds)
            .execute()

          // Add new assignments
          const newAssignments = employeeIds.map(employeeId => ({
            manager_id: managerIdNum,
            employee_id: employeeId,
            created_at: new Date(),
            updated_at: new Date()
          }))

          if (newAssignments.length > 0) {
            await trx
              .insertInto('manager_employees')
              .values(newAssignments)
              .execute()
          }
        }

        return true
      })
    } catch (error) {
      console.error('Error updating assignments:', error)
      return false
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(): Promise<{
    totalManagers: number
    totalEmployees: number
    assignedEmployees: number
    unassignedEmployees: number
  }> {
    const [managers, employees, assigned] = await Promise.all([
      // Count managers
      db
        .selectFrom('employees')
        .select(db.fn.count('id').as('count'))
        .where('is_mgr', '=', 1)
        .where('is_active', '=', 1)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow(),

      // Count all employees (excluding managers)
      db
        .selectFrom('employees')
        .select(db.fn.count('id').as('count'))
        .where('is_mgr', '=', 0)
        .where('is_active', '=', 1)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow(),

      // Count assigned employees
      db
        .selectFrom('manager_employees')
        .innerJoin('employees', 'manager_employees.employee_id', 'employees.id')
        .select(db.fn.count('manager_employees.employee_id').as('count'))
        .where('employees.is_active', '=', 1)
        .where('employees.deleted_at', 'is', null)
        .executeTakeFirstOrThrow()
    ])

    const totalManagers = Number(managers.count)
    const totalEmployees = Number(employees.count)
    const assignedEmployees = Number(assigned.count)
    const unassignedEmployees = totalEmployees - assignedEmployees

    return {
      totalManagers,
      totalEmployees,
      assignedEmployees,
      unassignedEmployees
    }
  }

  /**
   * Validate assignment (prevent circular references, etc.)
   */
  async validateAssignment(managerId: number, employeeId: number): Promise<{
    valid: boolean
    error?: string
  }> {
    // Check if manager exists and is active
    const manager = await db
      .selectFrom('employees')
      .select(['id', 'is_mgr', 'is_active'])
      .where('id', '=', managerId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!manager) {
      return { valid: false, error: 'Manager not found' }
    }

    if (!manager.is_mgr) {
      return { valid: false, error: 'Employee is not a manager' }
    }

    if (!manager.is_active) {
      return { valid: false, error: 'Manager is not active' }
    }

    // Check if employee exists and is active
    const employee = await db
      .selectFrom('employees')
      .select(['id', 'is_mgr', 'is_active'])
      .where('id', '=', employeeId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (!employee) {
      return { valid: false, error: 'Employee not found' }
    }

    if (!employee.is_active) {
      return { valid: false, error: 'Employee is not active' }
    }

    // Prevent self-assignment
    if (managerId === employeeId) {
      return { valid: false, error: 'Cannot assign manager to themselves' }
    }

    // Prevent assigning managers to other managers (circular reference prevention)
    if (employee.is_mgr) {
      return { valid: false, error: 'Cannot assign a manager to another manager' }
    }

    return { valid: true }
  }
}
