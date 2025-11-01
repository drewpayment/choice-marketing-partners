# Payroll Zero Total Fix - Deployment Checklist

## Pre-Deployment

- [x] Code changes implemented in `PayrollRepository.ts`
- [x] PostHog logging added for production monitoring
- [x] Test file created
- [x] SQL debug script created
- [x] Documentation created

## Deployment Steps

### 1. Review Changes
```bash
# Review the modified file
git diff src/lib/repositories/PayrollRepository.ts

# Ensure PostHog environment variables are set in production
# NEXT_PUBLIC_POSTHOG_KEY should be configured
```

### 2. Run Tests Locally
```bash
# Run the new test (if database is available)
bun test src/__tests__/repositories/PayrollRepository.agentid-fix.test.ts

# Run all tests to ensure no regressions
bun test
```

### 3. Commit and Push
```bash
git add src/lib/repositories/PayrollRepository.ts
git add src/__tests__/repositories/PayrollRepository.agentid-fix.test.ts
git add debug-payroll-mapping.sql
git add docs/payroll-zero-total-fix.md
git commit -m "fix: correct payroll summary totals by using employee ID instead of sales_id1

- Fixed agent ID mapping in PayrollRepository to use employee.id directly
- Updated batch total methods to query by correct agentid values
- Added PostHog logging for production monitoring
- Added test coverage and SQL debugging script

Fixes issue where Payment Ventures LLC and Phil Reznik showed $0.00 in list view"

git push origin vibe-code-it
```

### 4. Deploy to Production
- [ ] Create pull request (if using PR workflow)
- [ ] Merge to main branch
- [ ] Deploy to Vercel production environment
- [ ] Wait for deployment to complete

### 5. Verify in Production

#### Immediate Checks
- [ ] Navigate to `/payroll` page
- [ ] Locate "Payment Ventures LLC" in the list
  - Expected: Shows non-zero Net Pay (should match detail view)
  - Before fix: Showed $0.00
- [ ] Locate "Phil Reznik" in the list
  - Expected: Shows non-zero Net Pay (should match detail view)
  - Before fix: Showed $0.00
- [ ] Click "View Details" on both agents
  - Expected: Detail view totals match list view totals

#### Data Verification
- [ ] Click through several other agents to ensure no regression
- [ ] Test different date filters
- [ ] Test different vendor filters
- [ ] Verify pagination still works correctly

### 6. Monitor PostHog Logs

#### Check Server Logs
Look for these log entries in your production logs:

```json
[POSTHOG_SERVER_EVENT] {
  "event": "payroll_summary_mapping_debug",
  "properties": {
    "employeeName": "Payment Ventures LLC",
    "employeeId": 4025,
    "agentId": 4025,
    "sales_id1": "...",
    "vendorId": ...,
    "issueDate": "2025-10-15",
    "usingEmployeeIdDirectly": true,
    "timestamp": "...",
    "environment": "server"
  }
}
```

```json
[POSTHOG_SERVER_EVENT] {
  "event": "payroll_batch_sales_totals",
  "properties": {
    "requestedCombinations": 20,
    "requestedAgentIds": [4025, 975, ...],
    "resultsFound": 18,
    "resultsAgentIds": [4025, 975, ...],
    "timestamp": "...",
    "environment": "server"
  }
}
```

#### Verify Logging
- [ ] Confirm debug events appear for Payment Ventures LLC
- [ ] Confirm debug events appear for Phil Reznik
- [ ] Verify `usingEmployeeIdDirectly: true` is present
- [ ] Check that `requestedAgentIds` match `resultsAgentIds` (no missing data)

### 7. Optional: Run SQL Diagnostics

If you have direct database access, run the queries in `debug-payroll-mapping.sql`:

```bash
# Connect to production database (use appropriate credentials)
mysql -h <host> -u <user> -p <database> < debug-payroll-mapping.sql
```

Review the output to confirm:
- [ ] `agentid` in invoices matches `employee.id` (not `sales_id1`)
- [ ] `agentid` in overrides matches `employee.id` (not `sales_id1`)
- [ ] `agentid` in expenses matches `employee.id` (not `sales_id1`)

## Post-Deployment

### Success Criteria
✅ All checks passed:
- Payment Ventures LLC shows correct Net Pay in list view
- Phil Reznik shows correct Net Pay in list view
- No regression for other agents
- PostHog logs confirm correct data flow

### If Issues Occur

#### Rollback Steps
```bash
# Revert the changes
git revert <commit-hash>
git push origin main

# Redeploy
# Vercel will automatically deploy the revert
```

#### Debug Steps
1. Check Vercel logs for errors
2. Review PostHog events for unexpected values
3. Run SQL diagnostic queries
4. Check if environment variables are set correctly
5. Verify database connection is working

### Communication
- [ ] Notify team that fix has been deployed
- [ ] Document any issues found during deployment
- [ ] Update issue tracker (if applicable)

## Notes

- This fix requires no database migrations
- No data changes needed
- Zero downtime deployment
- Can be safely rolled back if needed
- PostHog logging will automatically stop if NEXT_PUBLIC_POSTHOG_KEY is not set

## Monitoring Period

Monitor for **48 hours** after deployment:
- Watch for any new errors in Vercel logs
- Check PostHog for unexpected events
- Review user feedback for payroll-related issues
- Verify no performance degradation

If stable after 48 hours, consider the deployment successful.
