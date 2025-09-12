import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { EmployeeRepository } from '@/lib/repositories/EmployeeRepository'
import { z } from 'zod'

const employeeRepository = new EmployeeRepository()

// Validation schemas
const employeeFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  role: z.enum(['admin', 'manager', 'employee', 'all']).optional().default('all'),
  hasUser: z.boolean().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20)
})

const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone_no: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  address_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional().default('US'),
  is_admin: z.boolean().optional().default(false),
  is_mgr: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  sales_id1: z.string().optional().default(''),
  sales_id2: z.string().optional().default(''),
  sales_id3: z.string().optional().default(''),
  hidden_payroll: z.boolean().optional().default(false),
  createUser: z.boolean().optional().default(false),
  password: z.string().min(8).optional(),
  userRole: z.enum(['admin', 'author', 'subscriber']).optional().default('subscriber')
})

/**
 * GET /api/employees - Get paginated list of employees with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = employeeFiltersSchema.parse({
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      role: searchParams.get('role'),
      hasUser: searchParams.get('hasUser') === 'true' ? true : 
               searchParams.get('hasUser') === 'false' ? false : undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    const result = await employeeRepository.getEmployees(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees - Create a new employee with optional user account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const data = createEmployeeSchema.parse(body)

    // Check email availability
    const emailAvailable = await employeeRepository.isEmailAvailable(data.email)
    if (!emailAvailable) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 400 }
      )
    }

    // Create employee with optional user account
    const employee = await employeeRepository.createEmployeeWithUser(
      {
        name: data.name,
        email: data.email,
        phone_no: data.phone_no,
        address: data.address,
        address_2: data.address_2,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        is_admin: data.is_admin,
        is_mgr: data.is_mgr,
        is_active: data.is_active,
        sales_id1: data.sales_id1,
        sales_id2: data.sales_id2,
        sales_id3: data.sales_id3,
        hidden_payroll: data.hidden_payroll
      },
      data.createUser && data.password ? {
        password: data.password,
        role: data.userRole
      } : undefined
    )

    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}
