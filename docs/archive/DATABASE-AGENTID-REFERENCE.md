# Quick Reference: agentid Column Mapping

## ⚠️ CRITICAL DATABASE KNOWLEDGE

### The Confusing Column Name
The `agentid` column in multiple tables is **poorly named** - it's actually a foreign key to `employees.id`.

### Correct Mapping
```
✓ CORRECT:
invoices.agentid    → employees.id (FK)
overrides.agentid   → employees.id (FK)
expenses.agentid    → employees.id (FK)
paystubs.agent_id   → employees.id (FK)

✗ WRONG:
agentid ≠ sales_id1  (These are UNRELATED columns)
```

### What is sales_id1?
`employees.sales_id1` is a separate business identifier used for sales tracking, **NOT** for database relationships.

## Code Examples

### ✓ CORRECT Usage
```typescript
// Get invoices for an employee
const invoices = await db
  .selectFrom('invoices')
  .where('agentid', '=', employee.id)  // ✓ Use employee.id
  .execute()
```

### ✗ WRONG Usage
```typescript
// DON'T DO THIS
const invoices = await db
  .selectFrom('invoices')
  .where('agentid', '=', employee.sales_id1)  // ✗ WRONG!
  .execute()
```

## When Querying by Employee

```typescript
// Get all financial records for an employee
const employeeId = 4025  // employees.id

const sales = await db
  .selectFrom('invoices')
  .where('agentid', '=', employeeId)  // ✓
  .execute()

const overrides = await db
  .selectFrom('overrides')
  .where('agentid', '=', employeeId)  // ✓
  .execute()

const expenses = await db
  .selectFrom('expenses')
  .where('agentid', '=', employeeId)  // ✓
  .execute()

const paystubs = await db
  .selectFrom('paystubs')
  .where('agent_id', '=', employeeId)  // ✓
  .execute()
```

## Future Schema Improvement
Consider renaming for clarity:
- `invoices.agentid` → `invoices.employee_id`
- `overrides.agentid` → `overrides.employee_id`
- `expenses.agentid` → `expenses.employee_id`
- `paystubs.agent_id` → `paystubs.employee_id` (already better!)

---

**Remember:** If you see `agentid` anywhere in this codebase, it's referring to `employees.id`, **not** `sales_id1`!
