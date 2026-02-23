/**
 * @jest-environment node
 */

// Mock next-auth FIRST before any imports
const mockGetServerSession = jest.fn().mockResolvedValue({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    isAdmin: false,
    isManager: false,
    isActive: true,
    employeeId: 1,
    salesIds: [],
  },
})

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

// Mock auth config to avoid database imports
jest.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

// Mock the repository
jest.mock('@/lib/repositories/ProductMarketingRepository', () => ({
  ProductMarketingRepository: jest.fn().mockImplementation(() => ({
    getMarketingProducts: jest.fn().mockResolvedValue([
      {
        product_id: 1,
        product_name: 'Business Site',
        amount_cents: 149900,
        interval: 'month',
        category: 'tier',
        feature_list: ['Up to 5 pages', 'Basic CMS'],
        display_order: 1,
        is_featured: true,
        tagline: 'Most popular choice',
        icon_name: null,
        badge_text: 'MOST POPULAR',
      },
    ]),
  })),
}))

// Mock feature flag
const mockIsFeatureEnabled = jest.fn().mockResolvedValue(true)
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
}))

import { GET } from '../route'

describe('GET /api/marketing/products', () => {
  beforeEach(() => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        isAdmin: false,
        isManager: false,
        isActive: true,
        employeeId: 1,
        salesIds: [],
      },
    })
    mockIsFeatureEnabled.mockResolvedValue(true)
  })

  it('returns marketing products when flag is enabled', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(1)
    expect(data[0].product_name).toBe('Business Site')
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const response = await GET()
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 403 when feature flag is disabled', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(false)

    const response = await GET()
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Feature not available')
  })
})
