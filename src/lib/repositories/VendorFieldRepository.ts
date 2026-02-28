import { db } from '@/lib/database/client'
import dayjs from 'dayjs'

// ─── Interfaces ──────────────────────────────────────────────

export interface VendorFieldDefinition {
  id: number
  vendor_id: number
  field_key: string
  field_label: string
  source: 'builtin' | 'custom'
  display_order: number
  is_active: boolean
  created_at: Date | null
  updated_at: Date | null
}

export interface CreateFieldData {
  vendor_id: number
  field_key: string
  field_label: string
  source: 'builtin' | 'custom'
  display_order: number
  is_active?: boolean
}

export interface UpdateFieldData {
  field_label?: string
  display_order?: number
  is_active?: boolean
}

export interface ReorderFieldData {
  id: number
  display_order: number
}

// ─── Built-in field defaults ──────────────────────────────────

/**
 * Default built-in fields seeded when a vendor is first configured.
 * These map to actual columns on the `invoices` table.
 */
export const DEFAULT_BUILTIN_FIELDS: Omit<CreateFieldData, 'vendor_id'>[] = [
  { field_key: 'sale_date',  field_label: 'Sale Date',  source: 'builtin', display_order: 1 },
  { field_key: 'full_name',  field_label: 'Full Name',  source: 'builtin', display_order: 2 },
  { field_key: 'address',    field_label: 'Address',     source: 'builtin', display_order: 3 },
  { field_key: 'city',       field_label: 'City',        source: 'builtin', display_order: 4 },
  { field_key: 'status',     field_label: 'Status',      source: 'builtin', display_order: 5 },
  { field_key: 'amount',     field_label: 'Amount',      source: 'builtin', display_order: 6 },
]

/**
 * Maps built-in field_key to how to extract the value from an invoice row.
 * Used by the paystub renderer to know which column to read.
 */
export const BUILTIN_FIELD_EXTRACTORS: Record<string, (invoice: Record<string, unknown>) => string> = {
  sale_date:  (inv) => String(inv.sale_date ?? ''),
  full_name:  (inv) => `${inv.first_name ?? ''} ${inv.last_name ?? ''}`.trim(),
  first_name: (inv) => String(inv.first_name ?? ''),
  last_name:  (inv) => String(inv.last_name ?? ''),
  address:    (inv) => String(inv.address ?? ''),
  city:       (inv) => String(inv.city ?? ''),
  status:     (inv) => String(inv.status ?? ''),
  amount:     (inv) => String(inv.amount ?? ''),
  vendor:     (inv) => String(inv.vendor ?? ''),
  invoice_id: (inv) => String(inv.invoice_id ?? ''),
}

// ─── Repository ──────────────────────────────────────────────

export class VendorFieldRepository {
  /**
   * Get all field definitions for a vendor, ordered by display_order.
   * Returns empty array if vendor has no configuration (caller should use defaults).
   */
  async getFieldsByVendor(vendorId: number, includeInactive = false): Promise<VendorFieldDefinition[]> {
    let query = db
      .selectFrom('vendor_field_definitions')
      .selectAll()
      .where('vendor_id', '=', vendorId)
      .orderBy('display_order', 'asc')

    if (!includeInactive) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()

    return rows.map(row => ({
      id: row.id,
      vendor_id: row.vendor_id,
      field_key: row.field_key,
      field_label: row.field_label,
      source: row.source,
      display_order: row.display_order,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  }

  /**
   * Check if a vendor has been configured (has any field definitions).
   */
  async isVendorConfigured(vendorId: number): Promise<boolean> {
    const row = await db
      .selectFrom('vendor_field_definitions')
      .select(db.fn.count<number>('id').as('count'))
      .where('vendor_id', '=', vendorId)
      .executeTakeFirstOrThrow()

    return Number(row.count) > 0
  }

  /**
   * Initialize a vendor with the default built-in fields.
   * Idempotent — skips if vendor already has definitions.
   */
  async initializeVendorDefaults(vendorId: number): Promise<VendorFieldDefinition[]> {
    const alreadyConfigured = await this.isVendorConfigured(vendorId)
    if (alreadyConfigured) {
      return this.getFieldsByVendor(vendorId, true)
    }

    const now = dayjs().toDate()

    await db
      .insertInto('vendor_field_definitions')
      .values(
        DEFAULT_BUILTIN_FIELDS.map(field => ({
          vendor_id: vendorId,
          field_key: field.field_key,
          field_label: field.field_label,
          source: field.source as 'builtin' | 'custom',
          display_order: field.display_order,
          is_active: 1,
          created_at: now,
          updated_at: now,
        }))
      )
      .execute()

    return this.getFieldsByVendor(vendorId, true)
  }

  /**
   * Add a custom field to a vendor.
   */
  async createField(data: CreateFieldData): Promise<VendorFieldDefinition> {
    const now = dayjs().toDate()

    const result = await db
      .insertInto('vendor_field_definitions')
      .values({
        vendor_id: data.vendor_id,
        field_key: data.field_key,
        field_label: data.field_label,
        source: data.source,
        display_order: data.display_order,
        is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow()

    const id = Number(result.insertId)
    return this.getFieldById(id) as Promise<VendorFieldDefinition>
  }

  /**
   * Get a single field definition by ID.
   */
  async getFieldById(id: number): Promise<VendorFieldDefinition | null> {
    const row = await db
      .selectFrom('vendor_field_definitions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) return null

    return {
      id: row.id,
      vendor_id: row.vendor_id,
      field_key: row.field_key,
      field_label: row.field_label,
      source: row.source,
      display_order: row.display_order,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  /**
   * Update a field definition (label, display_order, is_active).
   */
  async updateField(id: number, data: UpdateFieldData): Promise<VendorFieldDefinition> {
    const updateData: Record<string, string | number | Date> = {
      updated_at: dayjs().toDate(),
    }

    if (data.field_label !== undefined) updateData.field_label = data.field_label
    if (data.display_order !== undefined) updateData.display_order = data.display_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0

    await db
      .updateTable('vendor_field_definitions')
      .set(updateData)
      .where('id', '=', id)
      .executeTakeFirstOrThrow()

    return this.getFieldById(id) as Promise<VendorFieldDefinition>
  }

  /**
   * Bulk reorder fields for a vendor.
   * Accepts an array of { id, display_order } pairs.
   */
  async reorderFields(vendorId: number, ordering: ReorderFieldData[]): Promise<void> {
    const now = dayjs().toDate()

    await db.transaction().execute(async (trx) => {
      for (const item of ordering) {
        await trx
          .updateTable('vendor_field_definitions')
          .set({ display_order: item.display_order, updated_at: now })
          .where('id', '=', item.id)
          .where('vendor_id', '=', vendorId)
          .execute()
      }
    })
  }

  /**
   * Delete a custom field. Refuses to delete built-in fields.
   */
  async deleteField(id: number): Promise<void> {
    const field = await this.getFieldById(id)
    if (!field) throw new Error('Field not found')
    if (field.source === 'builtin') throw new Error('Cannot delete built-in fields')

    await db
      .deleteFrom('vendor_field_definitions')
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
  }
}
