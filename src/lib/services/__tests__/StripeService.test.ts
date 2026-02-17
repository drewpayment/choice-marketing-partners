import { StripeService } from '../StripeService'

const mockStripeInstance = {
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
  },
  products: {
    create: jest.fn().mockResolvedValue({ id: 'prod_test123' }),
    update: jest.fn().mockResolvedValue({ id: 'prod_test123', active: false }),
  },
  prices: {
    create: jest.fn().mockResolvedValue({ id: 'price_test123' }),
  },
  subscriptions: {
    create: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
    cancel: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' }),
  },
  invoiceItems: {
    create: jest.fn().mockResolvedValue({ id: 'ii_test123' }),
  },
  invoices: {
    create: jest.fn().mockResolvedValue({ id: 'in_test123' }),
    pay: jest.fn().mockResolvedValue({ id: 'in_test123', status: 'paid' }),
  },
  setupIntents: {
    create: jest.fn().mockResolvedValue({ id: 'seti_test123', client_secret: 'seti_secret_test' }),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
}

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockStripeInstance),
  }
})

describe('StripeService', () => {
  let service: StripeService

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    service = new StripeService()
  })

  it('creates a customer', async () => {
    const result = await service.createCustomer('test@example.com', 'Test Business')
    expect(result.id).toBe('cus_test123')
  })

  it('creates a product', async () => {
    const result = await service.createProduct('Test Product', 'A description')
    expect(result.id).toBe('prod_test123')
  })

  it('creates a recurring price', async () => {
    const result = await service.createPrice('prod_test123', 4999, 'month', 1)
    expect(result.id).toBe('price_test123')
  })

  it('creates a subscription', async () => {
    const result = await service.createSubscription('cus_test123', 'price_test123')
    expect(result.id).toBe('sub_test123')
  })

  it('cancels a subscription', async () => {
    const result = await service.cancelSubscription('sub_test123')
    expect(result.status).toBe('canceled')
  })

  it('creates a one-time invoice', async () => {
    const result = await service.createOneTimeCharge('cus_test123', 15000, 'Implementation fee')
    expect(result.id).toBe('in_test123')
  })
})
