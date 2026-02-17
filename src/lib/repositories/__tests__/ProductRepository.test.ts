import { ProductRepository } from '../ProductRepository'
import { db } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
  },
}))

describe('ProductRepository', () => {
  let repo: ProductRepository
  const adminUser = { isAdmin: true }
  const regularUser = { isAdmin: false }

  beforeEach(() => {
    repo = new ProductRepository()
    jest.clearAllMocks()
  })

  describe('getAllProducts', () => {
    it('throws for non-admin users', async () => {
      await expect(repo.getAllProducts(regularUser)).rejects.toThrow(
        'Unauthorized'
      )
    })

    it('returns all products with prices for admin', async () => {
      const mockProductsQuery = {
        selectAll: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([
          { id: 1, name: 'Test Product', stripe_product_id: 'prod_123' },
        ]),
      }

      const mockPricesQuery = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([
          { id: 1, amount_cents: 4999, interval: 'month' },
        ]),
      }

      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockProductsQuery)
        .mockReturnValue(mockPricesQuery)

      const result = await repo.getAllProducts(adminUser)

      expect(result).toHaveLength(1)
      expect(result[0].prices).toHaveLength(1)
    })
  })

  describe('createProduct', () => {
    it('creates a product', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ insertId: 42n }),
      }

      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      const id = await repo.createProduct({
        stripe_product_id: 'prod_test123',
        name: 'Test Product',
      })

      expect(id).toBe(42)
    })
  })

  describe('updateProduct', () => {
    it('throws for non-admin users', async () => {
      await expect(
        repo.updateProduct(1, { name: 'New Name' }, regularUser)
      ).rejects.toThrow('Unauthorized')
    })
  })
})
