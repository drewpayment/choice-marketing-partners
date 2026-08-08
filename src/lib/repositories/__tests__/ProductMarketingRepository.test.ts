import { ProductMarketingRepository } from '../ProductMarketingRepository'

// This test never reaches the DB. The real `db` client is imported for real on
// purpose: the `TextEncoder` polyfill `pg` needs at import time lives in
// jest.setup.js, and stubbing the module here would make a future test that
// *does* reach the DB silently pass against `undefined` instead of failing
// loudly.

// We test the interface and types — DB calls are tested via integration
describe('ProductMarketingRepository', () => {
  it('should instantiate', () => {
    const repo = new ProductMarketingRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.getMarketingProducts).toBe('function')
    expect(typeof repo.getMarketingProductsByCategory).toBe('function')
    expect(typeof repo.upsertMarketingData).toBe('function')
    expect(typeof repo.deleteMarketingData).toBe('function')
  })
})
