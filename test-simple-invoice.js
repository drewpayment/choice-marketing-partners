// Simple test script to test the basic invoice saving functionality
// Run with: bun run test-simple-invoice.js

import { invoiceRepository } from './src/lib/repositories/InvoiceRepository.simple.ts'

async function testSimpleInvoiceSave() {
  console.log('🧪 Testing simplified invoice save...')
  
  const testRequest = {
    agentId: 1,
    vendorId: 1,
    issueDate: '2024-01-15',
    weekending: '2024-01-14',
    sales: [
      {
        sale_date: '01-10-2024',
        first_name: 'John',
        last_name: 'Doe',
        address: '123 Test St',
        city: 'Test City',
        status: 'active',
        amount: 100.50
      },
      {
        invoiceId: 1, // Test updating existing
        sale_date: '01-11-2024',
        first_name: 'Jane',
        last_name: 'Smith',
        address: '456 Test Ave',
        city: 'Test Town',
        status: 'active',
        amount: 200.75
      }
    ]
  }
  
  try {
    const result = await invoiceRepository.saveInvoiceData(testRequest)
    console.log('✅ Test successful:', result)
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSimpleInvoiceSave()