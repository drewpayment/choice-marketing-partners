-- Debug Script for Payroll Mapping Issue
-- 
-- CRITICAL UNDERSTANDING:
-- The "agentid" column in invoices, overrides, and expenses tables is a FOREIGN KEY to employees.id
-- It is NOT related to sales_id1 at all - "agentid" is just a poorly named column
-- 
-- Correct mapping: invoices.agentid = employees.id (NOT employees.sales_id1)
-- Correct mapping: overrides.agentid = employees.id (NOT employees.sales_id1)
-- Correct mapping: expenses.agentid = employees.id (NOT employees.sales_id1)
-- Correct mapping: paystubs.agent_id = employees.id (NOT employees.sales_id1)

-- 1. Check Payment Ventures LLC employee data
SELECT 
    e.id as employee_id,
    e.name,
    e.sales_id1,
    e.is_active
FROM employees e
WHERE e.name LIKE '%Payment Ventures%';

-- 2. Check Phil Reznik employee data
SELECT 
    e.id as employee_id,
    e.name,
    e.sales_id1,
    e.is_active
FROM employees e
WHERE e.name LIKE '%Phil Reznik%';

-- 3. Verify invoices.agentid stores employees.id (not sales_id1)
SELECT 
    i.agentid,
    e.id as employee_id,
    e.name as employee_name,
    e.sales_id1,
    COUNT(*) as invoice_count,
    SUM(i.amount) as total_amount,
    CASE 
        WHEN i.agentid = e.id THEN '✓ Correct: agentid = employees.id'
        WHEN i.agentid = CAST(e.sales_id1 AS UNSIGNED) THEN '✗ Wrong: agentid = sales_id1'
        ELSE '? Unknown mapping'
    END as mapping_status
FROM invoices i
LEFT JOIN employees e ON i.agentid = e.id
WHERE e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%'
GROUP BY i.agentid, e.id, e.name, e.sales_id1;

-- 4. Verify overrides.agentid stores employees.id (not sales_id1)
SELECT 
    o.agentid,
    e.id as employee_id,
    e.name as employee_name,
    e.sales_id1,
    COUNT(*) as override_count,
    SUM(o.total) as total_amount,
    CASE 
        WHEN o.agentid = e.id THEN '✓ Correct: agentid = employees.id'
        WHEN o.agentid = CAST(e.sales_id1 AS UNSIGNED) THEN '✗ Wrong: agentid = sales_id1'
        ELSE '? Unknown mapping'
    END as mapping_status
FROM overrides o
LEFT JOIN employees e ON o.agentid = e.id
WHERE e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%'
GROUP BY o.agentid, e.id, e.name, e.sales_id1;

-- 5. Verify expenses.agentid stores employees.id (not sales_id1)
SELECT 
    ex.agentid,
    e.id as employee_id,
    e.name as employee_name,
    e.sales_id1,
    COUNT(*) as expense_count,
    SUM(ex.amount) as total_amount,
    CASE 
        WHEN ex.agentid = e.id THEN '✓ Correct: agentid = employees.id'
        WHEN ex.agentid = CAST(e.sales_id1 AS UNSIGNED) THEN '✗ Wrong: agentid = sales_id1'
        ELSE '? Unknown mapping'
    END as mapping_status
FROM expenses ex
LEFT JOIN employees e ON ex.agentid = e.id
WHERE e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%'
GROUP BY ex.agentid, e.id, e.name, e.sales_id1;

-- 6. Check paystubs for these employees
SELECT 
    p.id as paystub_id,
    p.agent_id,
    e.name as employee_name,
    e.sales_id1,
    v.name as vendor_name,
    DATE(p.issue_date) as issue_date,
    p.created_at
FROM paystubs p
LEFT JOIN employees e ON p.agent_id = e.id
LEFT JOIN vendors v ON p.vendor_id = v.id
WHERE e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%'
ORDER BY p.issue_date DESC
LIMIT 10;

-- 7. Confirm the OLD (buggy) code was using wrong mapping
-- This shows what would happen if we incorrectly tried to use sales_id1
SELECT 
    'CORRECT: Using employee.id (FK)' as mapping_approach,
    COUNT(DISTINCT i.id) as invoice_records_found,
    COUNT(DISTINCT o.ovrid) as override_records_found,
    COUNT(DISTINCT ex.expid) as expense_records_found,
    SUM(DISTINCT i.amount) as total_invoice_amount
FROM employees e
LEFT JOIN invoices i ON i.agentid = e.id
LEFT JOIN overrides o ON o.agentid = e.id
LEFT JOIN expenses ex ON ex.agentid = e.id
WHERE e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%'

UNION ALL

SELECT 
    'WRONG: Using sales_id1 (bug)' as mapping_approach,
    COUNT(DISTINCT i.id) as invoice_records_found,
    COUNT(DISTINCT o.ovrid) as override_records_found,
    COUNT(DISTINCT ex.expid) as expense_records_found,
    SUM(DISTINCT i.amount) as total_invoice_amount
FROM employees e
LEFT JOIN invoices i ON i.agentid = CAST(e.sales_id1 AS UNSIGNED)
LEFT JOIN overrides o ON o.agentid = CAST(e.sales_id1 AS UNSIGNED)
LEFT JOIN expenses ex ON ex.agentid = CAST(e.sales_id1 AS UNSIGNED)
WHERE e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%';

-- 8. Specific recent paystub totals check
SELECT 
    p.agent_id,
    e.name as employee_name,
    DATE(p.issue_date) as issue_date,
    v.name as vendor_name,
    (SELECT SUM(amount) FROM invoices WHERE agentid = p.agent_id AND DATE(issue_date) = DATE(p.issue_date)) as sales_total,
    (SELECT SUM(total) FROM overrides WHERE agentid = p.agent_id AND vendor_id = p.vendor_id AND DATE(issue_date) = DATE(p.issue_date)) as overrides_total,
    (SELECT SUM(amount) FROM expenses WHERE agentid = p.agent_id AND vendor_id = p.vendor_id AND DATE(issue_date) = DATE(p.issue_date)) as expenses_total
FROM paystubs p
LEFT JOIN employees e ON p.agent_id = e.id
LEFT JOIN vendors v ON p.vendor_id = v.id
WHERE (e.name LIKE '%Payment Ventures%' OR e.name LIKE '%Phil Reznik%')
  AND DATE(p.issue_date) = '2025-10-15'
ORDER BY e.name;
