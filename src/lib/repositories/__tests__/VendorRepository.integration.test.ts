/**
 * Unit tests for VendorRepository
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { VendorRepository } from '../VendorRepository'
import { db } from '@/lib/database/client'
import type { UserContext } from '@/lib/auth/types'

const adminCtx: UserContext = { employeeId: 1, isAdmin: true, isManager: false }

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
      }, adminCtx)

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
      }, adminCtx)

      testVendorIds.push(vendor.id)

      expect(vendor.is_active).toBe(false)
    })
  })

  describe('isNameAvailable', () => {
    it('should return true for available name', async () => {
      const available = await vendorRepository.isNameAvailable('Unique Vendor Name XYZ', undefined, adminCtx)
      expect(available).toBe(true)
    })

    it('should return false for existing name (case-insensitive)', async () => {
      const vendor = await vendorRepository.createVendor({
        name: 'Duplicate Test'
      }, adminCtx)
      testVendorIds.push(vendor.id)

      const available1 = await vendorRepository.isNameAvailable('Duplicate Test', undefined, adminCtx)
      const available2 = await vendorRepository.isNameAvailable('DUPLICATE TEST', undefined, adminCtx)
      const available3 = await vendorRepository.isNameAvailable('duplicate test', undefined, adminCtx)

      expect(available1).toBe(false)
      expect(available2).toBe(false)
      expect(available3).toBe(false)
    })

    it('should exclude vendor by ID when checking availability', async () => {
      const vendor = await vendorRepository.createVendor({
        name: 'Exclude Me'
      }, adminCtx)
      testVendorIds.push(vendor.id)

      const available = await vendorRepository.isNameAvailable('Exclude Me', vendor.id, adminCtx)
      expect(available).toBe(true)
    })
  })

  describe('getVendors', () => {
    beforeEach(async () => {
      // Create test vendors
      const v1 = await vendorRepository.createVendor({ name: 'Active Vendor', is_active: true }, adminCtx)
      const v2 = await vendorRepository.createVendor({ name: 'Inactive Vendor', is_active: false }, adminCtx)
      const v3 = await vendorRepository.createVendor({ name: 'Solar Company', is_active: true }, adminCtx)
      
      testVendorIds.push(v1.id, v2.id, v3.id)
    })

    it('should get all vendors', async () => {
      const vendors = await vendorRepository.getVendors({}, adminCtx)
      expect(vendors.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter by active status', async () => {
      const activeVendors = await vendorRepository.getVendors({ status: 'active' }, adminCtx)
      expect(activeVendors.every(v => v.is_active)).toBe(true)
    })

    it('should filter by inactive status', async () => {
      const inactiveVendors = await vendorRepository.getVendors({ status: 'inactive' }, adminCtx)
      expect(inactiveVendors.every(v => !v.is_active)).toBe(true)
    })

    it('should filter by search term', async () => {
      const searchResults = await vendorRepository.getVendors({ search: 'Solar' }, adminCtx)
      expect(searchResults.some(v => v.name.includes('Solar'))).toBe(true)
    })
  })

  describe('updateVendor', () => {
    it('should update vendor name', async () => {
      const vendor = await vendorRepository.createVendor({ name: 'Old Name' }, adminCtx)
      testVendorIds.push(vendor.id)

      const updated = await vendorRepository.updateVendor(vendor.id, {
        name: 'New Name'
      }, adminCtx)

      expect(updated.name).toBe('New Name')
    })

    it('should toggle active status', async () => {
      const vendor = await vendorRepository.createVendor({ name: 'Toggle Test', is_active: true }, adminCtx)
      testVendorIds.push(vendor.id)

      const toggled = await vendorRepository.toggleActive(vendor.id, adminCtx)
      expect(toggled.is_active).toBe(false)

      const toggledAgain = await vendorRepository.toggleActive(vendor.id, adminCtx)
      expect(toggledAgain.is_active).toBe(true)
    })
  })

  describe('getVendorById', () => {
    it('should return vendor by ID', async () => {
      const created = await vendorRepository.createVendor({ name: 'Find Me' }, adminCtx)
      testVendorIds.push(created.id)

      const found = await vendorRepository.getVendorById(created.id, adminCtx)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Find Me')
    })

    it('should return null for non-existent ID', async () => {
      const notFound = await vendorRepository.getVendorById(999999, adminCtx)
      expect(notFound).toBeNull()
    })
  })
})
