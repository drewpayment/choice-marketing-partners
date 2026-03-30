import { db } from '@/lib/database/client'
import dayjs from 'dayjs'
import { sql } from 'kysely'
import type { UserContext } from '@/lib/auth/types'

/**
 * Vendor management interfaces
 */
export interface VendorSummary {
  id: number
  name: string
  is_active: boolean
  created_at: Date | null
  updated_at: Date | null
}

export interface CreateVendorData {
  name: string
  is_active?: boolean
}

export interface UpdateVendorData {
  name?: string
  is_active?: boolean
}

export interface VendorFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
}

/**
 * Repository for vendor-related data operations
 */
export class VendorRepository {
  /**
   * Get all vendors with optional filtering
   */
  async getVendors(filters: VendorFilters = {}, userContext: UserContext): Promise<VendorSummary[]> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    let query = db
      .selectFrom('vendors')
      .selectAll()
      .orderBy('is_active', 'desc')
      .orderBy('name', 'asc')

    // Apply status filter
    if (filters.status === 'active') {
      query = query.where('is_active', '=', 1)
    } else if (filters.status === 'inactive') {
      query = query.where('is_active', '=', 0)
    }

    // Apply search filter
    if (filters.search) {
      query = query.where('name', 'like', `%${filters.search}%`)
    }

    const vendors = await query.execute()

    return vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      is_active: vendor.is_active === 1,
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
    }))
  }

  /**
   * Get a single vendor by ID
   */
  async getVendorById(id: number, userContext: UserContext): Promise<VendorSummary | null> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    const vendor = await db
      .selectFrom('vendors')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!vendor) return null

    return {
      id: vendor.id,
      name: vendor.name,
      is_active: vendor.is_active === 1,
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
    }
  }

  /**
   * Check if vendor name already exists (case-insensitive)
   */
  async isNameAvailable(name: string, excludeVendorId?: number, userContext?: UserContext): Promise<boolean> {
    if (!userContext?.isAdmin) {
      throw new Error('Admin access required')
    }
    let query = db
      .selectFrom('vendors')
      .select('id')
      .where(sql`LOWER(name)`, '=', name.toLowerCase())

    if (excludeVendorId) {
      query = query.where('id', '!=', excludeVendorId)
    }

    const existing = await query.executeTakeFirst()
    return !existing
  }

  /**
   * Create a new vendor
   */
  async createVendor(data: CreateVendorData, userContext: UserContext): Promise<VendorSummary> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    const now = dayjs().toDate();
    
    const result = await db
      .insertInto('vendors')
      .values({
        name: data.name,
        is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow()

    const vendorId = Number(result.insertId)
    const vendor = await this.getVendorById(vendorId, userContext)

    if (!vendor) {
      throw new Error('Failed to retrieve created vendor')
    }

    return vendor
  }

  /**
   * Update an existing vendor
   */
  async updateVendor(id: number, data: UpdateVendorData, userContext: UserContext): Promise<VendorSummary> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    const updateData: Record<string, string | number | Date> = {}

    if (data.name !== undefined) {
      updateData.name = data.name
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active ? 1 : 0
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No data to update')
    }

    // Always update the updated_at timestamp
    updateData.updated_at = dayjs().toDate();

    await db
      .updateTable('vendors')
      .set(updateData)
      .where('id', '=', id)
      .executeTakeFirstOrThrow()

    const vendor = await this.getVendorById(id, userContext)

    if (!vendor) {
      throw new Error('Failed to retrieve updated vendor')
    }

    return vendor
  }

  /**
   * Toggle vendor active status
   */
  async toggleActive(id: number, userContext: UserContext): Promise<VendorSummary> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }

    const vendor = await this.getVendorById(id, userContext)

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    return this.updateVendor(id, { is_active: !vendor.is_active }, userContext)
  }

  /**
   * Delete a vendor (if needed in future)
   */
  async deleteVendor(id: number, userContext: UserContext): Promise<void> {
    if (!userContext.isAdmin) {
      throw new Error('Admin access required')
    }
    await db
      .deleteFrom('vendors')
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
  }
}
