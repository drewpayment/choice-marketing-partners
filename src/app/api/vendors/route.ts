import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { VendorRepository } from '@/lib/repositories/VendorRepository'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { getEmployeeContext } from '@/lib/auth/payroll-access'

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(300, 'Name is too long'),
  is_active: z.boolean().optional()
})

const vendorFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional()
})

/**
 * GET /api/vendors - Get all vendors with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = vendorFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined
    })

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const vendors = await new VendorRepository().getVendors(filters, userContext)

    return NextResponse.json({ vendors })
  } catch (error) {
    logger.error('Error fetching vendors:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid filters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vendors - Create a new vendor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const data = createVendorSchema.parse(body)

    const userContext = await getEmployeeContext(
      session.user.employeeId,
      session.user.isAdmin,
      session.user.isManager
    )

    const vendorRepository = new VendorRepository()

    // Check if name is available
    const isAvailable = await vendorRepository.isNameAvailable(data.name, undefined, userContext)
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      )
    }

    const vendor = await vendorRepository.createVendor(data, userContext)

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (error) {
    // Race-window backstop: the DB UNIQUE constraint can fire if another
    // request creates the same name between isNameAvailable and createVendor.
    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      )
    }

    logger.error('Error creating vendor:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}

function isDuplicateEntryError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
  )
}
