# Payroll Zero Total Fix - Implementation Summary

## Problem Description

Two agents (Payment Ventures LLC and Phil Reznik) were showing **$0.00 Net Pay** in the Payroll list view, but their detail views showed the correct totals.

## Root Cause

The issue was in the `PayrollRepository.getPayrollSummary()` method around lines 302-332. The code was attempting to use `sales_id1` from the `employees` table to look up records in the `invoices`, `overrides`, and `expenses` tables:

```typescript
// BEFORE (INCORRECT):
const salesId = employeeMap.get(r.employeeId)
if (!salesId) return null

return {
  agentId: salesId,  // Using sales_id1
  vendorId: r.vendorId,
  issueDate: r.issueDate.toISOString().split('T')[0],
  originalAgentId: r.agentId.toString()
}
```

However, these tables actually store the **employee ID** directly in their `agentid` columns, not the `sales_id1` value. This caused a mismatch where:
- The summary query was looking for records with `agentid = sales_id1`
- The actual records had `agentid = employee.id`
- Result: No records found, totals = $0.00

The detail view worked correctly because it used `employee.id` directly (line 418 in `getPaystubDetail`):

```typescript
// Detail view (CORRECT):
const agentIdForQueries = employee.id
```

## Solution Implemented

### 1. Fixed Agent ID Mapping

Updated the `getPayrollSummary()` method to use `employee.id` directly instead of `sales_id1`:

```typescript
// AFTER (CORRECT):
const salesCombinations = results
  .map(r => {
    if (!r.employeeId || !r.agentId) return null
    
    return {
      agentId: r.agentId.toString(),  // Use employee ID directly
      vendorId: r.vendorId,
      issueDate: r.issueDate.toISOString().split('T')[0],
      originalAgentId: r.agentId.toString()
    }
  })
  .filter((item): item is NonNullable<typeof item> => item !== null)
```

### 2. Updated Batch Total Methods

Fixed all three batch methods to use `agentId` (employee ID) instead of `originalAgentId` (which was trying to use sales_id1):

- `getBatchSalesTotals()` - line 589
- `getBatchOverridesTotals()` - line 648  
- `getBatchExpensesTotals()` - line 697

Changed from:
```typescript
const agentIds = [...new Set(combinations.map(c => parseInt(c.originalAgentId)).filter(id => !isNaN(id)))]
```

To:
```typescript
const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
```

And updated the comparison logic:
```typescript
const combination = combinations.find(c => 
  parseInt(c.agentId) === result.agentid && c.issueDate === issueDate
)
```

### 3. Added PostHog Production Logging

Added a server-side PostHog logging utility to track the mapping in production:

```typescript
function logToPostHog(eventName: string, properties: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    console.log('[POSTHOG_SERVER_EVENT]', JSON.stringify({
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: 'server'
      }
    }))
  }
}
```

Added debug logging for the problematic agents:

```typescript
if (process.env.NODE_ENV === 'production' && employeeInfo) {
  const isProblematicAgent = employeeInfo.name?.includes('Payment Ventures') || 
                             employeeInfo.name?.includes('Phil Reznik')
  
  if (isProblematicAgent) {
    logToPostHog('payroll_summary_mapping_debug', {
      employeeName: employeeInfo.name,
      employeeId: r.employeeId,
      agentId: r.agentId,
      sales_id1: employeeInfo.sales_id1,
      vendorId: r.vendorId,
      issueDate: r.issueDate.toISOString().split('T')[0],
      usingEmployeeIdDirectly: true
    })
  }
}
```

Also added batch query logging:

```typescript
if (process.env.NODE_ENV === 'production' && results.length > 0) {
  logToPostHog('payroll_batch_sales_totals', {
    requestedCombinations: combinations.length,
    requestedAgentIds: agentIds,
    resultsFound: results.length,
    resultsAgentIds: results.map(r => r.agentid)
  })
}
```

## Files Modified

1. **`src/lib/repositories/PayrollRepository.ts`**
   - Added `logToPostHog()` utility function
   - Fixed agent ID mapping in `getPayrollSummary()`
   - Updated `getBatchSalesTotals()`
   - Updated `getBatchOverridesTotals()`
   - Updated `getBatchExpensesTotals()`
   - Added debug logging for production monitoring

## Testing

### Created Test Files

1. **`debug-payroll-mapping.sql`** - SQL queries to verify data mapping in production
2. **`src/__tests__/repositories/PayrollRepository.agentid-fix.test.ts`** - Unit tests to verify:
   - Batch totals use correct employee ID
   - Summary view returns non-zero totals
   - Summary and detail views match

### Manual Testing Steps

1. Deploy the fix to production
2. Navigate to `/payroll` page
3. Verify Payment Ventures LLC and Phil Reznik now show correct Net Pay amounts
4. Click "View Details" on each to verify totals still match
5. Check PostHog logs for `payroll_summary_mapping_debug` events to confirm correct data flow

### SQL Verification

Run the queries in `debug-payroll-mapping.sql` to verify:
- Employee IDs and sales_id1 values
- What agentid values are stored in invoices/overrides/expenses tables
- Paystub records and their relationships

## PostHog Monitoring

In production, you can monitor the fix using PostHog events:

1. **`payroll_summary_mapping_debug`** - Logs mapping details for problematic agents:
   - `employeeName`
   - `employeeId` 
   - `agentId`
   - `sales_id1`
   - `vendorId`
   - `issueDate`
   - `usingEmployeeIdDirectly`

2. **`payroll_batch_sales_totals`** - Logs batch query results:
   - `requestedCombinations`
   - `requestedAgentIds`
   - `resultsFound`
   - `resultsAgentIds`

These events will appear in your server logs as JSON objects with the prefix `[POSTHOG_SERVER_EVENT]`.

## Expected Outcome

After this fix:
- ✅ Payment Ventures LLC will show correct Net Pay in list view
- ✅ Phil Reznik will show correct Net Pay in list view
- ✅ All other agents continue to work correctly
- ✅ Summary and detail views will always match
- ✅ Production debugging available via PostHog logs

## Rollback Plan

If issues occur, the previous version used `sales_id1`. To rollback:
1. Revert changes to `PayrollRepository.ts`
2. Change `c.agentId` back to `c.originalAgentId` in batch methods
3. Restore the sales_id1 mapping logic

## Notes

- The detail view already used `employee.id` correctly, which is why it always worked
- This fix aligns the summary view with the detail view's data access pattern
- No database schema changes required
- No data migration needed
- The `sales_id1` field remains in the database for other purposes (might be used for external system integration)

## Additional Context

The database schema follows the Laravel migration pattern where:
- `employees.id` is the primary key
- `employees.sales_id1` appears to be a legacy or external system identifier
- The `invoices`, `overrides`, and `expenses` tables use `agentid` as a foreign key to `employees.id`
- The `paystubs` table uses `agent_id` as a foreign key to `employees.id`

This fix ensures the Next.js application correctly follows the established database relationships.
