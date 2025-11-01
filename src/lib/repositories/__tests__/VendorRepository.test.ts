/**
 * Unit tests for VendorRepository
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { VendorRepository } from '../VendorRepository'
import { db } from '@/lib/database/client'

describe('VendorRepository', () => {
  let vendorRepository: VendorRepository
  let testVendorIds: number[] = []

  beforeAll(() => {
    vendorRepository = new VendorRepository()
  })

  afterAll(async () => {
    // Clean up test vendors
    if (testVendorIds.length > 0) {
      await db
        .deleteFrom('vendors')
        .where('id', 'in', testVendorIds)
        .execute()
    }
    await db.destroy()
  })

  beforeEach(() => {
    testVendorIds = []
  })

  describe('createVendor', () => {
    it('should create a new vendor with default active status', async () => {
      const vendor = await vendorRepository.createVendor({
        name: 'Test Vendor Co'
      })

      testVendorIds.push(vendor.id)

      expect(vendor).toBeDefined()
      expect(vendor.name).toBe('Test Vendor Co')
      expect(vendor.is_active).toBe(true)
      expect(vendor.created_at).toBeDefined()
    })

    it('should create a vendor with explicit inactive status', async () => {
      const vendor = await vendorRepository.createVendor({
        name: 'Inactive Vendor',
        is_active: false
      })

      testVendorIds.push(vendor.id)

      expect(vendor.is_active).toBe(false)
    })
  })

  describe('isNameAvailable', () => {
    it('should return true for available name', async () => {
      const available = await vendorRepository.isNameAvailable('Unique Vendor Name XYZ')
      expect(available).toBe(true)
    })

    it('should return false for existing name (case-insensitive)', async () => {
      const vendor = await vendorRepository.createVendor({
        name: 'Duplicate Test'
      })
      testVendorIds.push(vendor.id)

      const available1 = await vendorRepository.isNameAvailable('Duplicate Test')
      const available2 = await vendorRepository.isNameAvailable('DUPLICATE TEST')
      const available3 = await vendorRepository.isNameAvailable('duplicate test')

      expect(available1).toBe(false)
      expect(available2).toBe(false)
      expect(available3).toBe(false)
    })

    it('should exclude vendor by ID when checking availability', async () => {
      const vendor = await vendorRepository.createVendor({
        name: 'Exclude Me'
      })
      testVendorIds.push(vendor.id)

      const available = await vendorRepository.isNameAvailable('Exclude Me', vendor.id)
      expect(available).toBe(true)
    })
  })

  describe('getVendors', () => {
    beforeEach(async () => {
      // Create test vendors
      const v1 = await vendorRepository.createVendor({ name: 'Active Vendor', is_active: true })
      const v2 = await vendorRepository.createVendor({ name: 'Inactive Vendor', is_active: false })
      const v3 = await vendorRepository.createVendor({ name: 'Solar Company', is_active: true })
      
      testVendorIds.push(v1.id, v2.id, v3.id)
    })

    it('should get all vendors', async () => {
      const vendors = await vendorRepository.getVendors()
      expect(vendors.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter by active status', async () => {
      const activeVendors = await vendorRepository.getVendors({ status: 'active' })
      expect(activeVendors.every(v => v.is_active)).toBe(true)
    })

    it('should filter by inactive status', async () => {
      const inactiveVendors = await vendorRepository.getVendors({ status: 'inactive' })
      expect(inactiveVendors.every(v => !v.is_active)).toBe(true)
    })

    it('should filter by search term', async () => {
      const searchResults = await vendorRepository.getVendors({ search: 'Solar' })
      expect(searchResults.some(v => v.name.includes('Solar'))).toBe(true)
    })
  })

  describe('updateVendor', () => {
    it('should update vendor name', async () => {
      const vendor = await vendorRepository.createVendor({ name: 'Old Name' })
      testVendorIds.push(vendor.id)

      const updated = await vendorRepository.updateVendor(vendor.id, {
        name: 'New Name'
      })

      expect(updated.name).toBe('New Name')
    })

    it('should toggle active status', async () => {
      const vendor = await vendorRepository.createVendor({ name: 'Toggle Test', is_active: true })
      testVendorIds.push(vendor.id)

      const toggled = await vendorRepository.toggleActive(vendor.id)
      expect(toggled.is_active).toBe(false)

      const toggledAgain = await vendorRepository.toggleActive(vendor.id)
      expect(toggledAgain.is_active).toBe(true)
    })
  })

  describe('getVendorById', () => {
    it('should return vendor by ID', async () => {
      const created = await vendorRepository.createVendor({ name: 'Find Me' })
      testVendorIds.push(created.id)

      const found = await vendorRepository.getVendorById(created.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Find Me')
    })

    it('should return null for non-existent ID', async () => {
      const notFound = await vendorRepository.getVendorById(999999)
      expect(notFound).toBeNull()
    })
  })
})
