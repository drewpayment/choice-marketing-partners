# Admin Pay Statement Deletion - Design Spec

**Date:** 2026-04-07
**Status:** Draft

## Problem

Admins need the ability to delete pay statements that were entered incorrectly. Currently there is an unprotected `deletePaystub` method in `InvoiceRepository.ts` that performs hard deletes with no audit trail and no safety checks. Pay statements that have been marked "paid" must never be deletable.

## Scope

This feature covers:
- Safe deletion of unpaid pay statements with full audit trail
- Two-step admin UI flow (preview, then confirm with reason)
- New `payroll_audit` table storing complete deleted record data
- Replacing the existing unsafe `deletePaystub` method

Out of scope:
- Pivot table for pay statement record relationships (future effort)
- Restoration/undo functionality (audit data enables future implementation)

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Audit trail depth | Full - store all deleted row data as JSON | Enables future recovery; deletions are infrequent |
| Paid protection gate | `payroll.is_paid = 1` only | Single source of truth for payment status |
| Confirmation UX | Two-step: preview counts, then reason + confirm | Balances safety with usability |
| API structure | Separate GET (preview) + DELETE endpoints | Clean separation of read/write concerns |
| Failure handling | Full transaction rollback | No partial deletes; all or nothing |
| Existing code | Replace `InvoiceRepository.deletePaystub` | Remove unsafe path; single implementation |

## Data Model

### Pay Statement Composite Key

A pay statement is identified by `(agent_id, vendor_id, issue_date)`. This composite key is used across all related tables:

| Table | agent column | vendor column | date column |
|---|---|---|---|
| `paystubs` | `agent_id` (int) | `vendor_id` (int) | `issue_date` (date) |
| `payroll` | `agent_id` (int) | `vendor_id` (int) | `pay_date` (date) |
| `invoices` | `agentid` (int) | `vendor` (string!) | `issue_date` (date) |
| `overrides` | `agentid` (int) | `vendor_id` (int) | `issue_date` (date) |
| `expenses` | `agentid` (int) | `vendor_id` (int) | `issue_date` (date) |

**Note:** `invoices.vendor` is stored as a string, not an integer. All queries must cast accordingly.

### New Table: `payroll_audit`

```sql
CREATE TABLE payroll_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  vendor_id INT NOT NULL,
  issue_date DATE NOT NULL,
  deleted_by INT NOT NULL,
  deletion_reason TEXT NOT NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(255),

  -- Summary counts
  deleted_paystubs_count INT NOT NULL DEFAULT 0,
  deleted_invoices_count INT NOT NULL DEFAULT 0,
  deleted_overrides_count INT NOT NULL DEFAULT 0,
  deleted_expenses_count INT NOT NULL DEFAULT 0,

  -- Summary totals
  paystub_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  invoices_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  overrides_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  expenses_total DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Full record data for recoverability
  paystub_data JSON NOT NULL,
  payroll_data JSON NOT NULL,
  invoices_data JSON NOT NULL,
  overrides_data JSON NOT NULL,
  expenses_data JSON NOT NULL,

  INDEX idx_payroll_audit_agent (agent_id),
  INDEX idx_payroll_audit_deleted_by (deleted_by),
  INDEX idx_payroll_audit_deleted_at (deleted_at)
);
```

## API Design

### GET `/api/admin/payroll/[agentId]/[vendorId]/[issueDate]/preview`

Returns a preview of what will be deleted. Blocks if pay statement is paid.

**Auth:** Admin only

**Response (200):**
```json
{
  "canDelete": true,
  "agent": { "id": 1, "name": "John Doe" },
  "vendor": { "id": 5, "name": "Acme Corp" },
  "issueDate": "2026-04-01",
  "isPaid": false,
  "summary": {
    "paystubCount": 1,
    "invoiceCount": 12,
    "overrideCount": 3,
    "expenseCount": 2,
    "paystubTotal": 1500.00,
    "invoiceTotal": 1200.00,
    "overrideTotal": 250.00,
    "expenseTotal": 50.00
  }
}
```

**Response when paid (200):**
```json
{
  "canDelete": false,
  "reason": "Pay statement has been marked as paid and cannot be deleted.",
  "isPaid": true
}
```

### DELETE `/api/admin/payroll/[agentId]/[vendorId]/[issueDate]`

Deletes the pay statement and all related records within a transaction.

**Auth:** Admin only

**Request body:**
```json
{
  "reason": "Duplicate entry - entered for wrong vendor"
}
```

**Response (200):**
```json
{
  "success": true,
  "deleted": {
    "paystubs": 1,
    "invoices": 12,
    "overrides": 3,
    "expenses": 2,
    "payroll": 1
  },
  "auditId": 42
}
```

**Error responses:**
- `400` - Missing reason
- `401` - Not authenticated
- `403` - Not admin
- `409` - Pay statement is paid (re-checked at delete time)
- `404` - No pay statement found for composite key

## Repository Design

### New method: `PayrollRepository.previewPaystubDeletion`

Fetches all records for the composite key, checks `payroll.is_paid`, returns preview summary with counts and totals.

### New method: `PayrollRepository.deletePaystubWithAudit`

Within a single transaction:
1. Re-check `payroll.is_paid` (guard against race conditions)
2. Fetch all records (paystubs, payroll, invoices, overrides, expenses)
3. Insert audit record with full JSON data
4. Delete invoices
5. Delete overrides
6. Delete expenses
7. Delete paystubs
8. Delete payroll
9. Return deletion counts

### Remove: `InvoiceRepository.deletePaystub`

The existing method at `InvoiceRepository.ts:655-711` will be removed and all callers updated to use the new `PayrollRepository` method.

## UI Flow

1. Admin navigates to payroll management
2. Clicks "Delete" action on an unpaid pay statement row
3. **Step 1 - Preview dialog:** Shows counts of records that will be deleted (e.g., "12 invoices, 3 overrides, 2 expenses")
4. Admin enters a reason for deletion (required text field)
5. **Step 2 - Confirmation:** Admin clicks "Delete Pay Statement" button
6. On success: toast notification, row removed from list
7. On failure: error toast with message, no changes made

## Security

- Admin-only access enforced at both API route and repository level
- `payroll.is_paid` checked at both preview and delete time (prevents race condition)
- Deletion reason is required (non-empty string)
- IP address captured for audit trail
- Full transaction rollback on any failure
