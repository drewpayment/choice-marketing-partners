import { db } from '@/lib/database/client'
import bcrypt from 'bcryptjs'

/**
 * Employee management interfaces
 */
export interface EmployeeSummary {
  id: number
  name: string
  email: string
  is_active: boolean
  is_admin: boolean
  is_mgr: boolean
  sales_id1: string
  sales_id2: string
  sales_id3: string
  phone_no: string | null
  created_at: Date | null
  deleted_at: Date | null
  hasUser: boolean
}

export interface EmployeeDetail extends EmployeeSummary {
  address: string
  address_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  hidden_payroll: boolean
  user?: {
    uid: number
    email: string
    role: string
    created_at: Date | null
  }
}

export interface CreateEmployeeData {
  name: string
  email: string
  phone_no?: string
  address: string
  address_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  is_admin?: boolean
  is_mgr?: boolean
  is_active?: boolean
  sales_id1?: string
  sales_id2?: string
  sales_id3?: string
  hidden_payroll?: boolean
}

export interface CreateUserData {
  password: string
  role?: 'admin' | 'author' | 'subscriber'
}

export interface EmployeeFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  role?: 'admin' | 'manager' | 'employee' | 'all'
  hasUser?: boolean
  page?: number
  limit?: number
}

export interface EmployeePage {
  employees: EmployeeSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Repository for employee-related data operations
 */
export class EmployeeRepository {
  /**
   * Get paginated list of employees with optional filtering
   */
  async getEmployees(filters: EmployeeFilters = {}): Promise<EmployeePage> {
    const {
      search,
      status = 'all',
      role = 'all',
      hasUser,
      page = 1,
      limit = 20
    } = filters

    const offset = (page - 1) * limit

    let query = db
      .selectFrom('employees')
      .leftJoin('employee_user', 'employees.id', 'employee_user.employee_id')
      .leftJoin('users', 'employee_user.user_id', 'users.uid')
      .select([
        'employees.id',
        'employees.name',
        'employees.email',
        'employees.is_active',
        'employees.is_admin',
        'employees.is_mgr',
        'employees.sales_id1',
        'employees.sales_id2',
        'employees.sales_id3',
        'employees.phone_no',
        'employees.created_at',
        'employees.deleted_at',
        db.case()
          .when('users.uid', 'is not', null)
          .then(true)
          .else(false)
          .end()
          .as('hasUser')
      ])

    // Apply filters
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('employees.name', 'like', `%${search}%`),
          eb('employees.email', 'like', `%${search}%`),
          eb('employees.sales_id1', 'like', `%${search}%`),
          eb('employees.sales_id2', 'like', `%${search}%`),
          eb('employees.sales_id3', 'like', `%${search}%`)
        ])
      )
    }

    if (status === 'active') {
      query = query.where('employees.is_active', '>', 0)
        .where('employees.deleted_at', 'is', null)
    } else if (status === 'inactive') {
      query = query.where((eb) =>
        eb.or([
          eb('employees.is_active', '=', 0),
          eb('employees.deleted_at', 'is not', null)
        ])
      )
    }

    if (role === 'admin') {
      query = query.where('employees.is_admin', '=', 1)
    } else if (role === 'manager') {
      query = query.where('employees.is_mgr', '=', 1)
    } else if (role === 'employee') {
      query = query.where('employees.is_admin', '=', 0)
        .where('employees.is_mgr', '=', 0)
    }

    if (hasUser !== undefined) {
      if (hasUser) {
        query = query.where('users.uid', 'is not', null)
      } else {
        query = query.where('users.uid', 'is', null)
      }
    }

    // Get total count
    const countQuery = query.clearSelect().select(db.fn.count('employees.id').as('count'))
    const totalResult = await countQuery.executeTakeFirst()
    const total = Number(totalResult?.count) || 0

    // Get paginated results
    const employees = await query
      .orderBy('employees.name', 'asc')
      .limit(limit)
      .offset(offset)
      .execute()

    return {
      employees: employees.map(emp => ({
        ...emp,
        is_active: Boolean(emp.is_active),
        is_admin: Boolean(emp.is_admin),
        is_mgr: Boolean(emp.is_mgr),
        hasUser: !!Number(emp.hasUser)
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get detailed employee information by ID
   */
  async getEmployeeById(id: number): Promise<EmployeeDetail | null> {
    const employee = await db
      .selectFrom('employees')
      .leftJoin('employee_user', 'employees.id', 'employee_user.employee_id')
      .leftJoin('users', 'employee_user.user_id', 'users.uid')
      .select([
        'employees.id',
        'employees.name',
        'employees.email',
        'employees.phone_no',
        'employees.address',
        'employees.address_2',
        'employees.city',
        'employees.state',
        'employees.postal_code',
        'employees.country',
        'employees.is_active',
        'employees.is_admin',
        'employees.is_mgr',
        'employees.sales_id1',
        'employees.sales_id2',
        'employees.sales_id3',
        'employees.hidden_payroll',
        'employees.created_at',
        'employees.deleted_at',
        'users.uid as user_uid',
        'users.email as user_email',
        'users.role as user_role',
        'users.created_at as user_created_at'
      ])
      .where('employees.id', '=', id)
      .executeTakeFirst()

    if (!employee) return null

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone_no: employee.phone_no,
      address: employee.address,
      address_2: employee.address_2,
      city: employee.city,
      state: employee.state,
      postal_code: employee.postal_code,
      country: employee.country,
      is_active: Boolean(employee.is_active),
      is_admin: Boolean(employee.is_admin),
      is_mgr: Boolean(employee.is_mgr),
      sales_id1: employee.sales_id1,
      sales_id2: employee.sales_id2,
      sales_id3: employee.sales_id3,
      hidden_payroll: Boolean(employee.hidden_payroll),
      created_at: employee.created_at,
      deleted_at: employee.deleted_at,
      hasUser: Boolean(employee.user_uid),
      user: employee.user_uid ? {
        uid: employee.user_uid,
        email: employee.user_email!,
        role: employee.user_role!,
        created_at: employee.user_created_at
      } : undefined
    }
  }

  /**
   * Create a new employee
   */
  async createEmployee(data: CreateEmployeeData): Promise<EmployeeDetail> {
    const result = await db
      .insertInto('employees')
      .values({
        name: data.name,
        email: data.email,
        phone_no: data.phone_no || null,
        address: data.address,
        address_2: data.address_2 || null,
        city: data.city || null,
        state: data.state || null,
        postal_code: data.postal_code || null,
        country: data.country || 'US',
        is_admin: data.is_admin ? 1 : 0,
        is_mgr: data.is_mgr ? 1 : 0,
        is_active: data.is_active !== false ? 1 : 0,
        sales_id1: data.sales_id1 || '',
        sales_id2: data.sales_id2 || '',
        sales_id3: data.sales_id3 || '',
        hidden_payroll: data.hidden_payroll ? 1 : 0,
        created_at: new Date(),
        updated_at: new Date()
      })
      .executeTakeFirstOrThrow()

    const employeeId = Number(result.insertId)
    const createdEmployee = await this.getEmployeeById(employeeId)
    if (!createdEmployee) {
      throw new Error('Failed to retrieve created employee')
    }

    return createdEmployee
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(id: number, data: Partial<CreateEmployeeData>): Promise<EmployeeDetail> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date()
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone_no !== undefined) updateData.phone_no = data.phone_no || null
    if (data.address !== undefined) updateData.address = data.address
    if (data.address_2 !== undefined) updateData.address_2 = data.address_2 || null
    if (data.city !== undefined) updateData.city = data.city || null
    if (data.state !== undefined) updateData.state = data.state || null
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code || null
    if (data.country !== undefined) updateData.country = data.country || null
    if (data.is_admin !== undefined) updateData.is_admin = data.is_admin ? 1 : 0
    if (data.is_mgr !== undefined) updateData.is_mgr = data.is_mgr ? 1 : 0
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0
    if (data.sales_id1 !== undefined) updateData.sales_id1 = data.sales_id1 || ''
    if (data.sales_id2 !== undefined) updateData.sales_id2 = data.sales_id2 || ''
    if (data.sales_id3 !== undefined) updateData.sales_id3 = data.sales_id3 || ''
    if (data.hidden_payroll !== undefined) updateData.hidden_payroll = data.hidden_payroll ? 1 : 0

    await db
      .updateTable('employees')
      .set(updateData)
      .where('id', '=', id)
      .execute()

    const updatedEmployee = await this.getEmployeeById(id)
    if (!updatedEmployee) {
      throw new Error('Failed to retrieve updated employee')
    }

    return updatedEmployee
  }

  /**
   * Soft delete an employee
   */
  async softDeleteEmployee(id: number): Promise<boolean> {
    const result = await db
      .updateTable('employees')
      .set({
        is_active: 0,
        deleted_at: new Date(),
        updated_at: new Date()
      })
      .where('id', '=', id)
      .execute()

    return result.length > 0
  }

  /**
   * Restore a soft-deleted employee
   */
  async restoreEmployee(id: number): Promise<boolean> {
    const result = await db
      .updateTable('employees')
      .set({
        is_active: 1,
        deleted_at: null,
        updated_at: new Date()
      })
      .where('id', '=', id)
      .execute()

    return result.length > 0
  }

  /**
   * Create a user account for an employee
   */
  async createEmployeeUser(employeeId: number, userData: CreateUserData): Promise<void> {
    // Create user record
    const hashedPassword = await bcrypt.hash(userData.password, 12)
    
    const userResult = await db
      .insertInto('users')
      .values({
        id: employeeId, // Use employee ID as user ID for consistency
        name: '', // Will be populated from employee name via trigger or separate update
        email: '', // Will be populated from employee email
        password: hashedPassword,
        role: userData.role || 'subscriber',
        created_at: new Date(),
        updated_at: new Date()
      })
      .executeTakeFirstOrThrow()

    const userId = Number(userResult.insertId)

    // Link employee to user
    await db
      .insertInto('employee_user')
      .values({
        employee_id: employeeId,
        user_id: userId
      })
      .execute()

    // Update user with employee data
    const employee = await db
      .selectFrom('employees')
      .select(['name', 'email'])
      .where('id', '=', employeeId)
      .executeTakeFirstOrThrow()

    await db
      .updateTable('users')
      .set({
        name: employee.name,
        email: employee.email,
        updated_at: new Date()
      })
      .where('uid', '=', userId)
      .execute()
  }

  /**
   * Create employee with optional user account in transaction
   */
  async createEmployeeWithUser(
    employeeData: CreateEmployeeData,
    userData?: CreateUserData
  ): Promise<EmployeeDetail> {
    return await db.transaction().execute(async (trx) => {
      // Create employee
      const employeeResult = await trx
        .insertInto('employees')
        .values({
          name: employeeData.name,
          email: employeeData.email,
          phone_no: employeeData.phone_no || null,
          address: employeeData.address,
          address_2: employeeData.address_2 || null,
          city: employeeData.city || null,
          state: employeeData.state || null,
          postal_code: employeeData.postal_code || null,
          country: employeeData.country || 'US',
          is_admin: employeeData.is_admin ? 1 : 0,
          is_mgr: employeeData.is_mgr ? 1 : 0,
          is_active: employeeData.is_active !== false ? 1 : 0,
          sales_id1: employeeData.sales_id1 || '',
          sales_id2: employeeData.sales_id2 || '',
          sales_id3: employeeData.sales_id3 || '',
          hidden_payroll: employeeData.hidden_payroll ? 1 : 0,
          created_at: new Date(),
          updated_at: new Date()
        })
        .executeTakeFirstOrThrow()

      const employeeId = Number(employeeResult.insertId)

      // Create user account if requested
      if (userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 12)
        
        const userResult = await trx
          .insertInto('users')
          .values({
            id: employeeId,
            name: employeeData.name,
            email: employeeData.email,
            password: hashedPassword,
            role: userData.role || 'subscriber',
            created_at: new Date(),
            updated_at: new Date()
          })
          .executeTakeFirstOrThrow()

        const userId = Number(userResult.insertId)

        // Link employee to user
        await trx
          .insertInto('employee_user')
          .values({
            employee_id: employeeId,
            user_id: userId
          })
          .execute()
      }

      // Return created employee with user data
      const createdEmployee = await trx
        .selectFrom('employees')
        .leftJoin('employee_user', 'employees.id', 'employee_user.employee_id')
        .leftJoin('users', 'employee_user.user_id', 'users.uid')
        .select([
          'employees.id',
          'employees.name',
          'employees.email',
          'employees.phone_no',
          'employees.address',
          'employees.address_2',
          'employees.city',
          'employees.state',
          'employees.postal_code',
          'employees.country',
          'employees.is_active',
          'employees.is_admin',
          'employees.is_mgr',
          'employees.sales_id1',
          'employees.sales_id2',
          'employees.sales_id3',
          'employees.hidden_payroll',
          'employees.created_at',
          'employees.deleted_at',
          'users.uid as user_uid',
          'users.email as user_email',
          'users.role as user_role',
          'users.created_at as user_created_at'
        ])
        .where('employees.id', '=', employeeId)
        .executeTakeFirstOrThrow()

      return {
        id: createdEmployee.id,
        name: createdEmployee.name,
        email: createdEmployee.email,
        phone_no: createdEmployee.phone_no,
        address: createdEmployee.address,
        address_2: createdEmployee.address_2,
        city: createdEmployee.city,
        state: createdEmployee.state,
        postal_code: createdEmployee.postal_code,
        country: createdEmployee.country,
        is_active: Boolean(createdEmployee.is_active),
        is_admin: Boolean(createdEmployee.is_admin),
        is_mgr: Boolean(createdEmployee.is_mgr),
        sales_id1: createdEmployee.sales_id1,
        sales_id2: createdEmployee.sales_id2,
        sales_id3: createdEmployee.sales_id3,
        hidden_payroll: Boolean(createdEmployee.hidden_payroll),
        created_at: createdEmployee.created_at,
        deleted_at: createdEmployee.deleted_at,
        hasUser: Boolean(createdEmployee.user_uid),
        user: createdEmployee.user_uid ? {
          uid: createdEmployee.user_uid,
          email: createdEmployee.user_email!,
          role: createdEmployee.user_role!,
          created_at: createdEmployee.user_created_at
        } : undefined
      }
    })
  }

  /**
   * Search employees for autocomplete
   */
  async searchEmployees(query: string, limit: number = 10): Promise<EmployeeSummary[]> {
    const employees = await db
      .selectFrom('employees')
      .leftJoin('employee_user', 'employees.id', 'employee_user.employee_id')
      .leftJoin('users', 'employee_user.user_id', 'users.uid')
      .select([
        'employees.id',
        'employees.name',
        'employees.email',
        'employees.is_active',
        'employees.is_admin',
        'employees.is_mgr',
        'employees.sales_id1',
        'employees.sales_id2',
        'employees.sales_id3',
        'employees.phone_no',
        'employees.created_at',
        'employees.deleted_at',
        db.case()
          .when('users.uid', 'is not', null)
          .then(true)
          .else(false)
          .end()
          .as('hasUser')
      ])
      .where((eb) =>
        eb.or([
          eb('employees.name', 'like', `%${query}%`),
          eb('employees.email', 'like', `%${query}%`),
          eb('employees.sales_id1', 'like', `%${query}%`)
        ])
      )
      .where('employees.is_active', '=', 1)
      .where('employees.deleted_at', 'is', null)
      .orderBy('employees.name', 'asc')
      .limit(limit)
      .execute()

    return employees.map(emp => ({
      ...emp,
      is_active: Boolean(emp.is_active),
      is_admin: Boolean(emp.is_admin),
      is_mgr: Boolean(emp.is_mgr),
      hasUser: !!Number(emp.hasUser)
    }))
  }

  /**
   * Check if email is available for new employee/user
   */
  async isEmailAvailable(email: string, excludeEmployeeId?: number): Promise<boolean> {
    let employeeQuery = db
      .selectFrom('employees')
      .select('id')
      .where('email', '=', email)

    if (excludeEmployeeId) {
      employeeQuery = employeeQuery.where('id', '!=', excludeEmployeeId)
    }

    const existingEmployee = await employeeQuery.executeTakeFirst()
    if (existingEmployee) return false

    const existingUser = await db
      .selectFrom('users')
      .select('uid')
      .where('email', '=', email)
      .executeTakeFirst()

    return !existingUser
  }
}
