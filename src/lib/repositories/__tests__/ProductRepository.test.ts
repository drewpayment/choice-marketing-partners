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
        $narrowType: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([
          { id: 1, name: 'Test Product', stripe_product_id: 'prod_123' },
        ]),
      }

      const mockPricesQuery = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        $narrowType: jest.fn().mockReturnThis(),
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
    it('creates a product, returning the real PK column and the bound values', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ id: 42 }),
      }

      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      const id = await repo.createProduct({
        stripe_product_id: 'prod_test123',
        name: 'Test Product',
      })

      expect(id).toBe(42)
      // Postgres replaces `insertId` with RETURNING, and the returned column
      // name has to be the one that actually exists on this table. The mock
      // resolves `{ id: 42 }` no matter what was requested, so without this
      // assertion `.returning('uid')` would still pass here and only blow up at
      // runtime with `column "uid" does not exist` (users.id/users.uid are both
      // live in this schema, so that slip is realistic).
      expect(db.insertInto).toHaveBeenCalledWith('products')
      expect(mockQuery.returning).toHaveBeenCalledWith('id')
      expect(mockQuery.values).toHaveBeenCalledWith({
        stripe_product_id: 'prod_test123',
        name: 'Test Product',
        description: null,
        type: 'recurring',
        is_active: 0,
      })
    })
  })

  describe('createPrice', () => {
    it('creates a price, returning the real PK column and the bound values', async () => {
      const mockQuery = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue({ id: 7 }),
      }

      ;(db.insertInto as jest.Mock).mockReturnValue(mockQuery)

      const id = await repo.createPrice({
        product_id: 1,
        stripe_price_id: 'price_test123',
        amount_cents: 4999,
        is_active: true,
      })

      expect(id).toBe(7)
      expect(db.insertInto).toHaveBeenCalledWith('prices')
      expect(mockQuery.returning).toHaveBeenCalledWith('id')
      expect(mockQuery.values).toHaveBeenCalledWith({
        product_id: 1,
        stripe_price_id: 'price_test123',
        amount_cents: 4999,
        currency: 'usd',
        interval: 'month',
        interval_count: 1,
        is_active: 1,
      })
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
