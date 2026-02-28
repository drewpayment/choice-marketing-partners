import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { VendorFieldRepository } from '@/lib/repositories/VendorFieldRepository'
import { logger } from '@/lib/utils/logger'

const repo = new VendorFieldRepository()

/**
 * GET /api/vendors/[id]/fields
 * List field definitions for a vendor. Returns defaults if unconfigured.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const vendorId = parseInt(id)
    if (isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 })
    }

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
    const isConfigured = await repo.isVendorConfigured(vendorId)
    const fields = isConfigured
      ? await repo.getFieldsByVendor(vendorId, includeInactive)
      : []

    return NextResponse.json({ fields, isConfigured })
  } catch (error) {
    logger.error('Vendor fields GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/vendors/[id]/fields
 * Create a new custom field OR initialize defaults.
 * Body: { action: "initialize" } to seed defaults
 * Body: { field_key, field_label, display_order? } to add a custom field
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const vendorId = parseInt(id)
    if (isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 })
    }

    const body = await request.json()

    // Handle initialization
    if (body.action === 'initialize') {
      const fields = await repo.initializeVendorDefaults(vendorId)
      return NextResponse.json({ fields, isConfigured: true })
    }

    // Handle creating a custom field
    if (!body.field_key || !body.field_label) {
      return NextResponse.json(
        { error: 'field_key and field_label are required' },
        { status: 400 }
      )
    }

    // Auto-generate display_order if not provided
    const existingFields = await repo.getFieldsByVendor(vendorId, true)
    const maxOrder = existingFields.reduce((max, f) => Math.max(max, f.display_order), 0)

    const field = await repo.createField({
      vendor_id: vendorId,
      field_key: body.field_key,
      field_label: body.field_label,
      source: 'custom',
      display_order: body.display_order ?? maxOrder + 1,
      is_active: body.is_active ?? true,
    })

    return NextResponse.json({ field }, { status: 201 })
  } catch (error) {
    logger.error('Vendor fields POST error:', error)
    if (error instanceof Error && error.message.includes('Duplicate')) {
      return NextResponse.json(
        { error: 'A field with this key already exists for this vendor' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/vendors/[id]/fields
 * Bulk update: reorder fields or update individual field properties.
 * Body: { reorder: [{ id, display_order }] } for bulk reorder
 * Body: { fieldId, field_label?, is_active?, display_order? } for single update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const vendorId = parseInt(id)
    if (isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 })
    }

    const body = await request.json()

    // Handle bulk reorder
    if (body.reorder && Array.isArray(body.reorder)) {
      await repo.reorderFields(vendorId, body.reorder)
      const fields = await repo.getFieldsByVendor(vendorId, true)
      return NextResponse.json({ fields })
    }

    // Handle single field update
    if (body.fieldId) {
      const field = await repo.updateField(body.fieldId, {
        field_label: body.field_label,
        display_order: body.display_order,
        is_active: body.is_active,
      })
      return NextResponse.json({ field })
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error) {
    logger.error('Vendor fields PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/vendors/[id]/fields
 * Delete a custom field.
 * Body: { fieldId: number }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.fieldId) {
      return NextResponse.json({ error: 'fieldId is required' }, { status: 400 })
    }

    await repo.deleteField(body.fieldId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Vendor fields DELETE error:', error)
    if (error instanceof Error && error.message === 'Cannot delete built-in fields') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
