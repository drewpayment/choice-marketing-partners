/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

jest.mock('@/lib/auth/payroll-access', () => ({
  getEmployeeContext: jest.fn(),
}))

jest.mock('@/lib/repositories/VendorRepository', () => ({
  VendorRepository: jest.fn().mockImplementation(() => ({
    isNameAvailable: jest.fn(),
    createVendor: jest.fn(),
    getVendors: jest.fn(),
  })),
}))

import { getServerSession } from 'next-auth'
import { getEmployeeContext } from '@/lib/auth/payroll-access'
import { VendorRepository } from '@/lib/repositories/VendorRepository'
import { POST } from '../route'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockGetEmployeeContext = getEmployeeContext as jest.MockedFunction<typeof getEmployeeContext>
const MockedVendorRepository = VendorRepository as jest.MockedClass<typeof VendorRepository>

const adminSession = {
  user: {
    id: 'test-user-id',
    email: 'admin@test.com',
    isAdmin: true,
    isManager: false,
    isActive: true,
    employeeId: 1,
    salesIds: [],
  },
}

function postRequest(body: unknown) {
  return new Request('http://localhost:3000/api/vendors', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

let isNameAvailable: jest.Mock
let createVendor: jest.Mock

describe('POST /api/vendors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    isNameAvailable = jest.fn()
    createVendor = jest.fn()
    MockedVendorRepository.mockImplementation(() => ({
      isNameAvailable,
      createVendor,
      getVendors: jest.fn(),
    }) as unknown as VendorRepository)

    mockGetServerSession.mockResolvedValue(adminSession as never)
    mockGetEmployeeContext.mockResolvedValue({
      employeeId: 1,
      isAdmin: true,
      isManager: false,
    } as never)
  })

  it('returns 409 when isNameAvailable rejects the name', async () => {
    isNameAvailable.mockResolvedValue(false)

    const response = await POST(postRequest({ name: 'Solar Company' }))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toMatch(/already exists/i)
    expect(createVendor).not.toHaveBeenCalled()
  })

  it('returns 409 when the DB UNIQUE constraint fires (race window)', async () => {
    isNameAvailable.mockResolvedValue(true)
    const dupErr = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' })
    createVendor.mockRejectedValue(dupErr)

    const response = await POST(postRequest({ name: 'Solar Company' }))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toMatch(/already exists/i)
  })

  it('creates the vendor when the name is available', async () => {
    isNameAvailable.mockResolvedValue(true)
    createVendor.mockResolvedValue({
      id: 99,
      name: 'New Vendor',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const response = await POST(postRequest({ name: 'New Vendor' }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.vendor.id).toBe(99)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetServerSession.mockResolvedValue({
      ...adminSession,
      user: { ...adminSession.user, isAdmin: false },
    } as never)

    const response = await POST(postRequest({ name: 'Anything' }))
    expect(response.status).toBe(403)
  })
})
