import { ProductMarketingRepository } from '../ProductMarketingRepository'

// We test the interface and types — DB calls are tested via integration
describe('ProductMarketingRepository', () => {
  it('should instantiate', () => {
    const repo = new ProductMarketingRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.getMarketingProducts).toBe('function')
    expect(typeof repo.getMarketingProductsByCategory).toBe('function')
    expect(typeof repo.upsertMarketingData).toBe('function')
  })
})
