import { db } from '@/lib/database/client'
import bcrypt from 'bcryptjs'
import type { Expression, ExpressionBuilder, Kysely } from 'kysely'
import type { DB } from '@/lib/database/types'
import type { UserContext } from '@/lib/auth/types'
import {
  buildParkedEmail,
  isParkedEmail,
  normalizeEmail,
  unparkEmail,
  type EmailOwnerInfo
} from '@/lib/utils/email'

/** Either the shared connection or an open transaction. */
type DbExecutor = Kysely<DB>

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
  user_uid?: number | null  // users.uid (auto-increment PK)
  user_id?: number | null   // users.id — matches session.user.id used in flag evaluation
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

export interface RestoreEmployeeResult {
  /** True when the employees row was un-deleted. */
  restored: boolean
  /** Login emails that could not be un-parked because the address is taken. */
  emailsStillParked: number
}

export interface EmployeeStats {
  total: number            // employees WHERE deleted_at IS NULL (all statuses)
  active: number           // is_active > 0 AND deleted_at IS NULL
  withUserAccounts: number // deleted_at IS NULL AND has a login by either linkage convention
  managersAdmins: number   // is_active > 0 AND deleted_at IS NULL AND (is_admin = 1 OR is_mgr = 1)
}

/**
 * Repository for employee-related data operations
 */
export class EmployeeRepository {
  /**
   * Get paginated list of employees with optional filtering
   */
  async getEmployees(filters: EmployeeFilters = {}, userContext: UserContext): Promise<EmployeePage> {
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
      .select((eb) => [
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
        // Whether the employee has any linked user account, by either linkage
        // convention (no row-multiplying join)
        this.hasLinkedLoginAccountSet(eb).as('hasUser'),
        // users.id (matches session.user.id used by the emulation button) via scalar subquery
        eb.selectFrom('users')
          .select('users.id')
          .where((inner) => this.isLinkedLoginAccount(inner, eb.ref('employees.id')))
          .orderBy('users.uid', 'asc')
          .limit(1)
          .as('user_id')
      ])

    // Apply filters
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('employees.name', 'like', `%${search}%`),
          eb('employees.email', 'like', `%${search}%`),
          eb('employees.phone_no', 'like', `%${search}%`),
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
        query = query.where((eb) => this.hasLinkedLoginAccountSet(eb))
      } else {
        query = query.where((eb) => eb.not(this.hasLinkedLoginAccountSet(eb)))
      }
    }

    // Role-based filtering
    if (!userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        const accessibleIds = [userContext.employeeId!, ...userContext.managedEmployeeIds]
        query = query.where('employees.id', 'in', accessibleIds)
      } else if (userContext.employeeId) {
        query = query.where('employees.id', '=', userContext.employeeId)
      } else {
        return { employees: [], total: 0, page, limit, totalPages: 0 }
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
        hasUser: !!Number(emp.hasUser),
        user_id: emp.user_id ?? null
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get database-wide employee statistics, scoped by role.
   *
   * Uses a single query with conditional aggregation. Role scoping mirrors
   * getEmployees: admins see global stats; managers see themselves plus their
   * managed employees; plain employees see only themselves; a user with no
   * employeeId and no admin rights gets all zeros.
   */
  async getEmployeeStats(userContext: UserContext): Promise<EmployeeStats> {
    let query = db.selectFrom('employees')

    // Role-based scoping
    if (!userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        const accessibleIds = [userContext.employeeId!, ...userContext.managedEmployeeIds]
        query = query.where('employees.id', 'in', accessibleIds)
      } else if (userContext.employeeId) {
        query = query.where('employees.id', '=', userContext.employeeId)
      } else {
        return { total: 0, active: 0, withUserAccounts: 0, managersAdmins: 0 }
      }
    }

    const row = await query
      .select((eb) => [
        // total: not soft-deleted (all statuses)
        eb.fn.sum(
          eb.case()
            .when('employees.deleted_at', 'is', null)
            .then(1)
            .else(0)
            .end()
        ).as('total'),
        // active: is_active > 0 and not soft-deleted
        eb.fn.sum(
          eb.case()
            .when(eb.and([
              eb('employees.is_active', '>', 0),
              eb('employees.deleted_at', 'is', null)
            ]))
            .then(1)
            .else(0)
            .end()
        ).as('active'),
        // withUserAccounts: not soft-deleted and has a linked user account
        // (either linkage convention — must agree with the list's hasUser flag)
        eb.fn.sum(
          eb.case()
            .when(eb.and([
              eb('employees.deleted_at', 'is', null),
              this.hasLinkedLoginAccountSet(eb)
            ]))
            .then(1)
            .else(0)
            .end()
        ).as('withUserAccounts'),
        // managersAdmins: active, not deleted, and admin or manager
        eb.fn.sum(
          eb.case()
            .when(eb.and([
              eb('employees.is_active', '>', 0),
              eb('employees.deleted_at', 'is', null),
              eb.or([
                eb('employees.is_admin', '=', 1),
                eb('employees.is_mgr', '=', 1)
              ])
            ]))
            .then(1)
            .else(0)
            .end()
        ).as('managersAdmins')
      ])
      .executeTakeFirst()

    return {
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      withUserAccounts: Number(row?.withUserAccounts ?? 0),
      managersAdmins: Number(row?.managersAdmins ?? 0)
    }
  }

  /**
   * Get detailed employee information by ID
   */
  async getEmployeeById(id: number, userContext?: UserContext): Promise<EmployeeDetail | null> {
    const employee = await db
      .selectFrom('employees')
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
        'employees.deleted_at'
      ])
      .where('employees.id', '=', id)
      .executeTakeFirst()

    if (!employee) return null

    // Role-based access check
    if (userContext && !userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        const accessibleIds = [userContext.employeeId!, ...userContext.managedEmployeeIds]
        if (!accessibleIds.includes(id)) return null
      } else if (userContext.employeeId !== id) {
        return null
      }
    }

    // Resolved separately so both linkage conventions are honoured — a join on
    // employee_user alone reports "no user account" for ~93% of employees.
    const user = await this.findPrimaryLoginAccount(db, id, employee.email)

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
      hasUser: Boolean(user),
      user: user ? {
        uid: user.uid,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      } : undefined
    }
  }

  /**
   * Create a new employee
   */
  async createEmployee(data: CreateEmployeeData, userContext: UserContext): Promise<EmployeeDetail> {
    if (!userContext.isAdmin) throw new Error('Admin access required')

    const result = await db
      .insertInto('employees')
      .values({
        name: data.name,
        email: normalizeEmail(data.email),
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
   * Update an existing employee.
   *
   * The linked login account is kept in sync in the same transaction:
   * - email goes to at most ONE user (`users.email` is UNIQUE, and the schema
   *   allows an employee to have several linked accounts — writing the address
   *   to all of them would deadlock on the index). The target is the account
   *   whose address currently matches the employee's, else the lowest uid.
   * - name goes to every linked account (no unique index on `users.name`).
   * - nothing is written when the employee is soft-deleted: its login email is
   *   parked and must stay parked (see softDeleteEmployee).
   *
   * A unique-index violation on `users.email` rolls the employees update back,
   * so the two tables can never drift.
   */
  async updateEmployee(id: number, data: Partial<CreateEmployeeData>, userContext: UserContext): Promise<EmployeeDetail> {
    if (!userContext.isAdmin) throw new Error('Admin access required')

    const normalizedEmail = data.email !== undefined ? normalizeEmail(data.email) : undefined

    const updateData: Record<string, unknown> = {
      updated_at: new Date()
    }

    if (data.name !== undefined) updateData.name = data.name
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

    await db.transaction().execute(async (trx) => {
      // Only look up the current identity when it could actually change.
      const identityMayChange = normalizedEmail !== undefined || data.name !== undefined
      const current = identityMayChange
        ? await trx
            .selectFrom('employees')
            .select(['name', 'email', 'deleted_at'])
            .where('id', '=', id)
            .executeTakeFirst()
        : undefined

      const emailChanged =
        current !== undefined &&
        normalizedEmail !== undefined &&
        normalizeEmail(current.email) !== normalizedEmail

      // A soft-deleted employee's login email is parked and cannot be synced, so
      // changing employees.email here would only re-create the drift this fix
      // exists to remove. Callers must restore the employee first.
      const emailWritable = emailChanged && !current?.deleted_at

      // Only rewrite employees.email when it actually changes, so a legacy
      // mixed-case address is not silently lowercased by an unrelated edit.
      if (emailWritable) updateData.email = normalizedEmail

      await trx
        .updateTable('employees')
        .set(updateData)
        .where('id', '=', id)
        .execute()

      if (!current) return

      // A soft-deleted employee's login email is parked; editing the employee
      // record must not un-park it and re-enable the login.
      if (current.deleted_at) return

      const nameChanged = data.name !== undefined && current.name !== data.name
      if (!emailChanged && !nameChanged) return

      const linkedUsers = await this.getLinkedUsers(trx, id)
      if (linkedUsers.length === 0) return

      if (nameChanged) {
        await trx
          .updateTable('users')
          .set({ name: data.name, updated_at: new Date() })
          .where('uid', 'in', linkedUsers.map((user) => user.uid))
          .execute()
      }

      if (emailChanged) {
        const target = this.pickEmailSyncTarget(
          linkedUsers,
          id,
          current.email,
          normalizedEmail as string
        )
        await trx
          .updateTable('users')
          .set({ email: normalizedEmail, updated_at: new Date() })
          .where('uid', '=', target.uid)
          .execute()
      }
    })

    const updatedEmployee = await this.getEmployeeById(id)
    if (!updatedEmployee) {
      throw new Error('Failed to retrieve updated employee')
    }

    return updatedEmployee
  }

  /**
   * Soft delete an employee.
   *
   * The linked login account(s) keep holding the email address on the
   * `users_email_unique` index long after the employee is gone, which made the
   * address impossible to reuse (and invisible in the admin UI). So in the same
   * transaction every linked user's email is "parked" behind a
   * `deleted-{employeeId}.` prefix and marked with `users.deleted_at`. Parking
   * also disables the login, which is the intent for a deleted employee.
   */
  async softDeleteEmployee(id: number, userContext: UserContext): Promise<boolean> {
    if (!userContext.isAdmin) throw new Error('Admin access required')

    return await db.transaction().execute(async (trx) => {
      const now = new Date()

      const result = await trx
        .updateTable('employees')
        .set({
          is_active: 0,
          deleted_at: now,
          updated_at: now
        })
        .where('id', '=', id)
        .execute()

      const linkedUsers = await this.getLinkedUsers(trx, id)

      for (const user of linkedUsers) {
        const userUpdate: Record<string, unknown> = {
          deleted_at: now,
          updated_at: now
        }

        // Idempotent: re-deleting must never double-prefix an already parked address.
        if (!isParkedEmail(user.email)) {
          let parked = buildParkedEmail(id, user.email)
          if (await this.emailTakenByOtherUser(trx, parked, user.uid)) {
            parked = buildParkedEmail(id, user.email, user.uid)
          }
          userUpdate.email = parked
        }

        await trx
          .updateTable('users')
          .set(userUpdate)
          .where('uid', '=', user.uid)
          .execute()
      }

      return result.length > 0
    })
  }

  /**
   * Restore a soft-deleted employee.
   *
   * Un-parks each linked login email, but only when the original address is
   * still free — otherwise the address stays parked and the admin fixes it by
   * hand. Restoring the employee itself always succeeds.
   */
  async restoreEmployee(id: number, userContext: UserContext): Promise<RestoreEmployeeResult> {
    if (!userContext.isAdmin) throw new Error('Admin access required')

    return await db.transaction().execute(async (trx) => {
      const now = new Date()

      const result = await trx
        .updateTable('employees')
        .set({
          is_active: 1,
          deleted_at: null,
          updated_at: now
        })
        .where('id', '=', id)
        .execute()

      const linkedUsers = await this.getLinkedUsers(trx, id)
      let emailsStillParked = 0

      for (const user of linkedUsers) {
        const original = unparkEmail(user.email, id, user.uid)

        if (original === null) {
          // Not parked by this employee: the account may have been retired
          // independently (long before the employee was deleted), so its
          // deleted_at is none of our business. Leave the row untouched.
          continue
        }

        const owner = await this.findEmailOwnerWith(trx, original, id)
        if (owner) {
          emailsStillParked += 1
          continue
        }

        await trx
          .updateTable('users')
          .set({ email: original, deleted_at: null, updated_at: now })
          .where('uid', '=', user.uid)
          .execute()
      }

      return { restored: result.length > 0, emailsStillParked }
    })
  }

  /**
   * Create a user account for an employee
   */
  async createEmployeeUser(employeeId: number, userData: CreateUserData, userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) throw new Error('Admin access required')

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
    userData: CreateUserData | undefined,
    userContext: UserContext
  ): Promise<EmployeeDetail> {
    if (!userContext.isAdmin) throw new Error('Admin access required')

    const normalizedEmail = normalizeEmail(employeeData.email)

    return await db.transaction().execute(async (trx) => {
      // Create employee
      const employeeResult = await trx
        .insertInto('employees')
        .values({
          name: employeeData.name,
          email: normalizedEmail,
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
            email: normalizedEmail,
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
  async searchEmployees(query: string, limit: number = 10, userContext?: UserContext): Promise<EmployeeSummary[]> {
    let searchQuery = db
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
          .as('hasUser'),
        'users.uid as user_uid',
        'users.id as user_id',
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

    // Role-based filtering
    if (userContext && !userContext.isAdmin) {
      if (userContext.isManager && userContext.managedEmployeeIds?.length) {
        const accessibleIds = [userContext.employeeId!, ...userContext.managedEmployeeIds]
        searchQuery = searchQuery.where('employees.id', 'in', accessibleIds)
      } else if (userContext.employeeId) {
        searchQuery = searchQuery.where('employees.id', '=', userContext.employeeId)
      } else {
        return []
      }
    }

    const employees = await searchQuery
      .orderBy('employees.name', 'asc')
      .limit(limit)
      .execute()

    return employees.map(emp => ({
      ...emp,
      is_active: Boolean(emp.is_active),
      is_admin: Boolean(emp.is_admin),
      is_mgr: Boolean(emp.is_mgr),
      hasUser: !!Number(emp.hasUser),
      user_uid: emp.user_uid ?? null,
      user_id: emp.user_id ?? null,
    }))
  }

  /**
   * Look up employee names by user UIDs (for display purposes)
   */
  /**
   * Look up employee names by users.id values (session.user.id is users.id, not users.uid)
   */
  async getNamesByUserIds(ids: number[]): Promise<Record<number, string>> {
    if (ids.length === 0) return {}
    const rows = await db
      .selectFrom('employees')
      .innerJoin('users', 'employees.id', 'users.id')
      .select(['users.id', 'employees.name'])
      .where('users.id', 'in', ids)
      .execute()
    const map: Record<number, string> = {}
    for (const row of rows) {
      map[row.id] = row.name
    }
    return map
  }

  /**
   * Check if email is available for new employee/user.
   *
   * Thin wrapper over {@link findEmailOwner} so the boolean and the
   * admin-facing conflict message can never disagree.
   */
  async isEmailAvailable(email: string, excludeEmployeeId?: number): Promise<boolean> {
    return (await this.findEmailOwner(email, excludeEmployeeId)) === null
  }

  /**
   * Find who currently holds an email address, or null when it is free.
   *
   * Scoping rules:
   * - `employees`: soft-deleted rows never block (their address is reusable);
   *   inactive-but-not-deleted rows still do — they are real, visible records.
   * - `users`: every remaining row blocks (the UNIQUE index makes those genuine
   *   conflicts) except the accounts linked to `excludeEmployeeId`, which are
   *   the record being edited.
   */
  async findEmailOwner(email: string, excludeEmployeeId?: number): Promise<EmailOwnerInfo | null> {
    return this.findEmailOwnerWith(db, email, excludeEmployeeId)
  }

  private async findEmailOwnerWith(
    executor: DbExecutor,
    email: string,
    excludeEmployeeId?: number
  ): Promise<EmailOwnerInfo | null> {
    const normalized = normalizeEmail(email)

    let employeeQuery = executor
      .selectFrom('employees')
      .select(['id', 'name'])
      .where('email', '=', normalized)
      .where('deleted_at', 'is', null)

    if (excludeEmployeeId) {
      employeeQuery = employeeQuery.where('id', '!=', excludeEmployeeId)
    }

    const existingEmployee = await employeeQuery.executeTakeFirst()
    if (existingEmployee) {
      return {
        source: 'employee',
        employeeId: existingEmployee.id,
        employeeName: existingEmployee.name,
        employeeDeleted: false
      }
    }

    let userQuery = executor
      .selectFrom('users')
      .select(['users.uid', 'users.id'])
      .where('users.email', '=', normalized)
      .orderBy('users.uid', 'asc')

    if (excludeEmployeeId) {
      // Exclude every login account linked to the employee being edited — by
      // EITHER convention, or the employee's own legacy login looks like a
      // stranger holding its address.
      userQuery = userQuery.where((eb) =>
        eb.not(this.isLinkedLoginAccount(eb, excludeEmployeeId))
      )
    }

    const existingUser = await userQuery.executeTakeFirst()
    if (!existingUser) return null

    const owner = await this.resolveEmployeeForUser(
      executor,
      existingUser.uid,
      existingUser.id
    )

    return {
      source: 'user',
      employeeId: owner?.id ?? null,
      employeeName: owner?.name ?? null,
      employeeDeleted: Boolean(owner?.deleted_at)
    }
  }

  /**
   * Which linked login account should carry the employee's email address.
   *
   * `users.email` is UNIQUE, so exactly one account can hold it. Preference
   * order, most to least specific:
   *  1. an account that already holds the NEW address — makes the write
   *     idempotent instead of dead-ending on a 1062 against a sibling account;
   *  2. the account holding the employee's PREVIOUS address — the normal case;
   *  3. an account whose address is parked by this employee — the address is
   *     ours to reclaim (e.g. after a restore that could not un-park);
   *  4. the lowest uid, so the choice is stable across calls.
   */
  private pickEmailSyncTarget(
    linkedUsers: Array<{ uid: number; email: string }>,
    employeeId: number,
    previousEmployeeEmail: string,
    newEmail: string
  ): { uid: number; email: string } {
    const previous = normalizeEmail(previousEmployeeEmail)
    const next = normalizeEmail(newEmail)

    return (
      linkedUsers.find((user) => normalizeEmail(user.email) === next) ??
      linkedUsers.find((user) => normalizeEmail(user.email) === previous) ??
      linkedUsers.find((user) => unparkEmail(user.email, employeeId, user.uid) !== null) ??
      linkedUsers.reduce((lowest, user) => (user.uid < lowest.uid ? user : lowest))
    )
  }

  /**
   * THE definition of "this employee's login account(s)".
   *
   * The database carries two linkage conventions and production data uses both:
   *  - the `employee_user` junction table (105 rows), and
   *  - the legacy Laravel convention `users.id = employees.id` (~1149 rows),
   *    which is how NextAuth itself resolves the employee at sign-in.
   * Over 500 active employees have only the legacy link, so anything that
   * consults just the junction table silently misses ~93% of logins.
   *
   * `users.id` is a plain, non-unique int column (`uid` is the PK), so this can
   * legitimately match several rows — callers must handle a set. `id > 0` keeps
   * an unset/zero column from matching a real employee.
   *
   * Pass a number for a known employee, or `eb.ref('employees.id')` to correlate
   * against an enclosing `employees` query.
   */
  private isLinkedLoginAccount(
    eb: ExpressionBuilder<DB, 'users'>,
    employee: number | Expression<number>
  ) {
    return eb.or([
      eb.exists(
        eb.selectFrom('employee_user as own_link')
          .select('own_link.user_id')
          .whereRef('own_link.user_id', '=', 'users.uid')
          .where('own_link.employee_id', '=', employee)
      ),
      eb.and([
        eb('users.id', '=', employee),
        eb('users.id', '>', 0),
        // The junction table wins when the two conventions disagree: a row
        // bound to employee A by employee_user is A's login even if its
        // users.id happens to point at employee B. Without this, B's edit
        // could clobber A's login credentials.
        eb.not(
          eb.exists(
            eb.selectFrom('employee_user as other_link')
              .select('other_link.user_id')
              .whereRef('other_link.user_id', '=', 'users.uid')
              .where('other_link.employee_id', '!=', employee)
          )
        )
      ])
    ])
  }

  /**
   * Set-oriented form of the same relation, for queries that ask "which
   * employees have a login at all" across the whole table.
   *
   * The correlated EXISTS form is ~400x slower here because `users.id` carries
   * no index (measured on the prod snapshot: stats 0.98ms → 391ms, hasUser
   * filter ~1ms → 548ms, and the admin employees page runs both per load
   * through a connection pool of 1). These uncorrelated IN-subqueries are
   * materialised once and measured at ~1ms with identical results.
   *
   * Deliberately coarser than {@link isLinkedLoginAccount}: it does not apply
   * the junction-wins tie-break, so an employee whose only candidate account is
   * junction-owned by someone else still shows the flag. This is a display
   * hint; every write path resolves through the authoritative form.
   */
  private hasLinkedLoginAccountSet(eb: ExpressionBuilder<DB, 'employees'>) {
    return eb.or([
      eb('employees.id', 'in',
        eb.selectFrom('users').select('users.id').where('users.id', '>', 0)
      ),
      eb('employees.id', 'in',
        eb.selectFrom('employee_user').select('employee_user.employee_id')
      )
    ])
  }

  /**
   * Every login account linked to an employee, by either convention, deduped by
   * uid (selecting from `users` alone cannot fan out) and ordered for stability.
   */
  private async getLinkedUsers(
    executor: DbExecutor,
    employeeId: number
  ): Promise<Array<{ uid: number; id: number; email: string; role: string; created_at: Date | null }>> {
    return await executor
      .selectFrom('users')
      .select(['users.uid', 'users.id', 'users.email', 'users.role', 'users.created_at'])
      .where((eb) => this.isLinkedLoginAccount(eb, employeeId))
      .orderBy('users.uid', 'asc')
      .execute()
  }

  /**
   * The login account shown on the employee detail page.
   *
   * Prefers the account whose address matches the employee's (mirroring
   * pickEmailSyncTarget) — otherwise an employee with several linked accounts
   * shows a long-retired one just because it has the lower uid.
   */
  private async findPrimaryLoginAccount(
    executor: DbExecutor,
    employeeId: number,
    employeeEmail: string
  ) {
    const accounts = await this.getLinkedUsers(executor, employeeId)
    if (accounts.length === 0) return undefined

    const wanted = normalizeEmail(employeeEmail)
    return accounts.find((account) => normalizeEmail(account.email) === wanted) ?? accounts[0]
  }

  /**
   * Which employee owns a login account: the junction table first, then the
   * legacy `users.id = employees.id` convention. Only when neither resolves is
   * the account genuinely unlinked.
   */
  private async resolveEmployeeForUser(
    executor: DbExecutor,
    uid: number,
    usersId: number
  ): Promise<{ id: number; name: string; deleted_at: Date | null } | undefined> {
    const viaJunction = await executor
      .selectFrom('employee_user')
      .innerJoin('employees', 'employees.id', 'employee_user.employee_id')
      .select(['employees.id', 'employees.name', 'employees.deleted_at'])
      .where('employee_user.user_id', '=', uid)
      .executeTakeFirst()

    if (viaJunction) return viaJunction
    if (!usersId || usersId <= 0) return undefined

    return await executor
      .selectFrom('employees')
      .select(['id', 'name', 'deleted_at'])
      .where('id', '=', usersId)
      .executeTakeFirst()
  }

  /** Guard against a parked value colliding with an unrelated login account. */
  private async emailTakenByOtherUser(
    executor: DbExecutor,
    email: string,
    excludeUid: number
  ): Promise<boolean> {
    const row = await executor
      .selectFrom('users')
      .select('uid')
      .where('email', '=', email)
      .where('uid', '!=', excludeUid)
      .executeTakeFirst()

    return Boolean(row)
  }
}

/**
 * True for a MySQL/MariaDB duplicate-key error (errno 1062). Used to turn the
 * race between the availability check and the write into the same 400 conflict
 * the pre-check produces.
 */
export function isDuplicateEmailError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; errno?: unknown }
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062
}
