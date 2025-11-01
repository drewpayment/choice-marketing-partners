import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { VendorRepository } from '@/lib/repositories/VendorRepository'
import { z } from 'zod'

const vendorRepository = new VendorRepository()

const updateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(300, 'Name is too long').optional(),
  is_active: z.boolean().optional()
})

/**
 * GET /api/vendors/[id] - Get a single vendor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const vendorId = parseInt(params.id, 10)
    if (isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 })
    }

    const vendor = await vendorRepository.getVendorById(vendorId)

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json({ vendor })
  } catch (error) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/vendors/[id] - Update a vendor
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const vendorId = parseInt(params.id, 10)
    if (isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 })
    }

    const body = await request.json()
    const data = updateVendorSchema.parse(body)

    // Check if name is changing and if it's available
    if (data.name) {
      const isAvailable = await vendorRepository.isNameAvailable(data.name, vendorId)
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'A vendor with this name already exists' },
          { status: 409 }
        )
      }
    }

    const vendor = await vendorRepository.updateVendor(vendorId, data)

    return NextResponse.json({ vendor })
  } catch (error) {
    console.error('Error updating vendor:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Vendor not found') {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vendors/[id] - Delete a vendor (optional, for future use)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const vendorId = parseInt(params.id, 10)
    if (isNaN(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 })
    }

    await vendorRepository.deleteVendor(vendorId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    )
  }
}
