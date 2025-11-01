import { PayrollRepository } from '@/lib/repositories/PayrollRepository'
import { db } from '@/lib/database/client'

/**
 * Role-aware data access helpers for payroll functionality
 */

/**
 * Get managed employee IDs for a manager
 */
export async function getManagedEmployeeIds(managerId: number): Promise<number[]> {
  const relationships = await db
    .selectFrom('manager_employees')
    .select('employee_id')
    .where('manager_id', '=', managerId)
    .execute()
  
  return relationships.map(rel => rel.employee_id)
}

/**
 * Get employee context for role-based data access
 */
export async function getEmployeeContext(
  employeeId: number | null | undefined,
  isAdmin: boolean,
  isManager: boolean
): Promise<{
  employeeId?: number
  isAdmin: boolean
  isManager: boolean
  managedEmployeeIds?: number[]
}> {
  const context = {
    employeeId: employeeId || undefined,
    isAdmin,
    isManager,
    managedEmployeeIds: undefined as number[] | undefined
  }

  // If user is a manager, get their managed employees
  if (isManager && employeeId) {
    context.managedEmployeeIds = await getManagedEmployeeIds(employeeId)
  }

  return context
}

/**
 * Check if user can access specific agent data
 */
export async function canAccessAgent(
  agentId: string,
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): Promise<boolean> {
  // Admins can access all agents
  if (userContext.isAdmin) return true

  // Find employee record for this agent
  const employee = await db
    .selectFrom('employees')
    .select('id')
    .where('sales_id1', '=', agentId)
    .executeTakeFirst()

  if (!employee) return false

  // Check if user can access this employee
  return hasEmployeeAccess(employee.id, userContext)
}

/**
 * Check if user can access specific employee data
 */
export function hasEmployeeAccess(
  targetEmployeeId: number,
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): boolean {
  // Admins can access any employee
  if (userContext.isAdmin) return true
  
  // Users can access their own data
  if (userContext.employeeId === targetEmployeeId) return true
  
  // Managers can access their managed employees
  if (userContext.isManager && userContext.managedEmployeeIds?.includes(targetEmployeeId)) {
    return true
  }
  
  return false
}

/**
 * Get filtered agent list based on user role
 */
export async function getAccessibleAgents(
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): Promise<Array<{
  id: number
  name: string
  sales_id1: string
  email: string
  is_active: number
}>> {
  let query = db
    .selectFrom('employees')
    .select(['id', 'name', 'sales_id1', 'email', 'is_active'])
    .where('sales_id1', '!=', '')
    .where('is_active', '=', 1)

  // Apply role-based filtering
  if (!userContext.isAdmin) {
    if (userContext.isManager && userContext.managedEmployeeIds?.length) {
      query = query.where('id', 'in', userContext.managedEmployeeIds)
    } else if (userContext.employeeId) {
      query = query.where('id', '=', userContext.employeeId)
    } else {
      // No access - return empty array
      return []
    }
  }

  return await query
    .orderBy('name', 'asc')
    .execute()
}

/**
 * Get filtered vendor list based on user role and accessible data
 */
export async function getAccessibleVendors(
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): Promise<Array<{
  id: number
  name: string
  is_active: number
}>> {
  // Get accessible agent IDs first
  const agents = await getAccessibleAgents(userContext)
  const agentIds = agents.map(agent => parseInt(agent.sales_id1)).filter(id => !isNaN(id))

  if (agentIds.length === 0) {
    return []
  }

  // Get vendors that have data for accessible agents - use a more efficient query
  const vendors = await db
    .selectFrom('vendors')
    .leftJoin('paystubs', 'vendors.id', 'paystubs.vendor_id')
    .select(['vendors.id', 'vendors.name', 'vendors.is_active'])
    .distinct()
    .where('paystubs.agent_id', 'in', agentIds)
    .where('vendors.is_active', '=', 1)
    .orderBy('vendors.name', 'asc')
    .execute()

  return vendors
}

/**
 * Get filtered issue dates based on user role and accessible data
 */
export async function getAccessibleIssueDates(
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): Promise<string[]> {
  const payrollRepository = new PayrollRepository()
  return await payrollRepository.getAvailableIssueDates(userContext)
}

/**
 * Validate payroll access for specific employee/vendor/date combination
 */
export async function validatePayrollAccess(
  employeeId: number,
  vendorId: number,
  issueDate: string,
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): Promise<boolean> {
  // Check if user can access this employee
  if (!hasEmployeeAccess(employeeId, userContext)) {
    return false
  }

  // Additional validation: check if the combination exists
  const employee = await db
    .selectFrom('employees')
    .select('sales_id1')
    .where('id', '=', employeeId)
    .executeTakeFirst()

  if (!employee?.sales_id1) return false

  // Check if paystub exists for this combination
  const paystub = await db
    .selectFrom('paystubs')
    .select('id')
    .where('agent_id', '=', parseInt(employee.sales_id1))
    .where('vendor_id', '=', vendorId)
    .where(db.fn('DATE', ['issue_date']), '=', issueDate)
    .executeTakeFirst()

  return !!paystub
}

/**
 * Get payroll access summary for user
 */
export async function getPayrollAccessSummary(
  userContext: {
    employeeId?: number
    isAdmin: boolean
    isManager: boolean
    managedEmployeeIds?: number[]
  }
): Promise<{
  accessibleAgents: number
  accessibleVendors: number
  accessibleIssueDates: number
  totalPaystubs: number
}> {
  const agents = await getAccessibleAgents(userContext)
  const vendors = await getAccessibleVendors(userContext)
  const issueDates = await getAccessibleIssueDates(userContext)

  // Count total paystubs accessible to user
  const agentIds = agents.map(agent => parseInt(agent.sales_id1)).filter(id => !isNaN(id))
  
  let totalPaystubs = 0
  if (agentIds.length > 0) {
    const result = await db
      .selectFrom('paystubs')
      .select(db.fn.count('id').as('count'))
      .where('agent_id', 'in', agentIds)
      .executeTakeFirst()
    
    totalPaystubs = Number(result?.count || 0)
  }

  return {
    accessibleAgents: agents.length,
    accessibleVendors: vendors.length,
    accessibleIssueDates: issueDates.length,
    totalPaystubs
  }
}
