# Payroll $0.00 Display Bug Fix

## Problem Description

In production, two agents (Payment Ventures LLC and Phil Reznik) showed **$0.00** for their Net Pay in the Payroll list view, but their detail views displayed the correct totals. This was a data mapping bug in the `PayrollRepository`.

## Root Cause

### The Bug
The `getPayrollSummary` method was incorrectly using `employees.sales_id1` to look up records in the `invoices`, `overrides`, and `expenses` tables.

```typescript
// OLD BUGGY CODE (lines 290-310)
const salesId = employeeMap.get(r.employeeId)
if (!salesId) return null

return {
  agentId: salesId,  // ❌ WRONG: Using sales_id1
  vendorId: r.vendorId,
  issueDate: r.issueDate.toISOString().split('T')[0],
  originalAgentId: r.agentId.toString()
}
```

### Critical Understanding
**The `agentid` column is a poorly named foreign key that stores `employees.id`, NOT `sales_id1`.**

- `invoices.agentid` = `employees.id` (FK)
- `overrides.agentid` = `employees.id` (FK)
- `expenses.agentid` = `employees.id` (FK)
- `paystubs.agent_id` = `employees.id` (FK)

The `sales_id1` column on the `employees` table is **completely unrelated** to the `agentid` foreign keys.

### Why It Appeared to Work for Most Agents
For many agents, their `employees.id` happened to match their `sales_id1` value, so the bug went unnoticed. However, for agents where these values differ (like Payment Ventures LLC and Phil Reznik), the lookup failed and returned $0.00.

### Why Detail View Worked
The `getPaystubDetail` method correctly used `employees.id` directly:

```typescript
// CORRECT CODE in getPaystubDetail (line 418)
const agentIdForQueries = employee.id  // ✓ Correct
```

## The Fix

### Updated Mapping Logic

```typescript
// NEW CORRECT CODE (lines 290-320)
const salesCombinations = results
  .map(r => {
    if (!r.employeeId || !r.agentId) return null
    
    return {
      agentId: r.agentId.toString(),  // ✓ CORRECT: paystubs.agent_id = employees.id
      vendorId: r.vendorId,
      issueDate: r.issueDate.toISOString().split('T')[0],
      originalAgentId: r.agentId.toString()
    }
  })
  .filter((item): item is NonNullable<typeof item> => item !== null)
```

### Updated Batch Query Methods

All three batch methods now use `employee.id` (via `agentId` parameter) instead of `sales_id1`:

1. **`getBatchSalesTotals`** - Changed line 566 from `c.originalAgentId` to `c.agentId`
2. **`getBatchOverridesTotals`** - Changed line 616 from `c.originalAgentId` to `c.agentId`
3. **`getBatchExpensesTotals`** - Changed line 677 from `c.originalAgentId` to `c.agentId`

```typescript
// Example from getBatchSalesTotals
const agentIds = [...new Set(combinations.map(c => parseInt(c.agentId)).filter(id => !isNaN(id)))]
//                                                          ↑ Now correctly uses agentId (employees.id)
//                                                          Previously used c.originalAgentId which was sales_id1
```

## Production Debugging

### PostHog Logging Added

Server-side logging has been added to track the mapping in production:

```typescript
if (process.env.NODE_ENV === 'production' && employeeInfo) {
  const isProblematicAgent = employeeInfo.name?.includes('Payment Ventures') || 
                             employeeInfo.name?.includes('Phil Reznik')
  
  if (isProblematicAgent) {
    logToPostHog('payroll_summary_mapping_debug', {
      employeeName: employeeInfo.name,
      employeeId: r.employeeId,
      agentIdFromPaystub: r.agentId,
      sales_id1_for_reference: employeeInfo.sales_id1,
      vendorId: r.vendorId,
      issueDate: r.issueDate.toISOString().split('T')[0],
      note: 'agentid column stores employees.id, not sales_id1'
    })
  }
}
```

Events are logged to console with `[POSTHOG_SERVER_EVENT]` prefix for monitoring.

### SQL Debug Script

A comprehensive SQL debug script is available at:
```
choice-marketing-partners/debug-payroll-mapping.sql
```

Run this script to verify the correct mapping in your database.

## Files Changed

### Modified
- `src/lib/repositories/PayrollRepository.ts`
  - Added `logToPostHog` utility function (lines 5-18)
  - Fixed mapping logic (lines 290-320)
  - Updated `getBatchSalesTotals` (lines 552-595)
  - Updated `getBatchOverridesTotals` (lines 602-644)
  - Updated `getBatchExpensesTotals` (lines 661-703)

### Created
- `debug-payroll-mapping.sql` - SQL debug script
- `src/__tests__/repositories/PayrollRepository.agentid-fix.test.ts` - Test suite
- `docs/PAYROLL-ZERO-DOLLAR-FIX.md` - This documentation

## Testing

### Automated Tests
Run the test suite:
```bash
bun test src/__tests__/repositories/PayrollRepository.agentid-fix.test.ts
```

### Manual Verification

1. **Check production data:**
   ```bash
   # Run the debug SQL script on production database
   mysql -u user -p database < debug-payroll-mapping.sql
   ```

2. **Verify in UI:**
   - Navigate to `/payroll`
   - Find Payment Ventures LLC and Phil Reznik entries
   - Verify Net Pay shows correct amounts (not $0.00)
   - Click "View Details" to confirm summary matches detail

3. **Check PostHog logs:**
   - Look for `[POSTHOG_SERVER_EVENT]` logs with event `payroll_summary_mapping_debug`
   - Verify `agentIdFromPaystub` matches employee ID

## Deployment Checklist

- [ ] Run automated tests
- [ ] Deploy to staging environment
- [ ] Verify Payment Ventures LLC shows correct totals
- [ ] Verify Phil Reznik shows correct totals
- [ ] Spot-check 3-5 other agents for regression
- [ ] Monitor PostHog logs for the debug events
- [ ] Deploy to production
- [ ] Verify production payroll list displays correct totals
- [ ] Remove debug logging after 7 days (optional)

## Expected Impact

### Before Fix
- Payment Ventures LLC: **$0.00** in list view, **$X,XXX.XX** in detail view
- Phil Reznik: **$0.00** in list view, **$X,XXX.XX** in detail view

### After Fix
- Payment Ventures LLC: **$X,XXX.XX** in both views (consistent)
- Phil Reznik: **$X,XXX.XX** in both views (consistent)
- All other agents: No change (already working)

## Future Improvements

1. **Database Schema Refactor** (Low priority)
   - Consider renaming `agentid` columns to `employee_id` for clarity
   - Would require migration and Laravel code updates

2. **Remove Debug Logging** (After 7 days)
   - Once verified in production, remove the PostHog debug logging
   - Keep the fix and documentation

3. **Add Integration Tests**
   - Test with actual production data snapshot
   - Verify all agents show consistent totals between views

## Related Issues

- Fixes agents showing $0.00 in payroll list view
- Resolves data inconsistency between summary and detail views
- Corrects employee ID mapping in batch queries

## Contact

For questions about this fix, contact the development team or refer to:
- GitHub Copilot Instructions: `.github/copilot-instructions.md`
- Memory Bank: `memory-bank/systemPatterns.md`
