-- 010_advances_scheduled_expenses_audit.sql
-- First-class daily-pay advances, recurring expense templates, and per-row
-- audit trails for expenses and advances.
--
-- Business context: "daily pay" advances were historically recorded as NEGATIVE
-- free-text expense rows. This migration makes advances first-class so paystub
-- net pay becomes: sales + overrides + expenses - advances.

-- ---------------------------------------------------------------------------
-- 1. advances: first-class daily-pay advances (positive amounts only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advances (
  advance_id INT AUTO_INCREMENT PRIMARY KEY,
  agentid INT NOT NULL,                       -- FK employees.id (NOT sales_id)
  vendor_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,              -- positive; enforced in repo layer + CHECK
  advance_date DATE NOT NULL,                 -- day the rep was actually paid the advance
  issue_date DATE NOT NULL,                   -- paystub issue_date this settles against
  wkending DATE NOT NULL,                     -- statement week-ending this settles against
  method VARCHAR(20) NOT NULL DEFAULT 'other',-- cash | ach | check | other
  notes VARCHAR(255) NOT NULL DEFAULT '',
  created_by INT NOT NULL,                    -- employees.id of the user who recorded it
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_advances_agent_vendor_issue (agentid, vendor_id, issue_date),
  CONSTRAINT chk_advances_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 2. scheduled_expenses: recurring expense templates
--    amount is SIGNED (some recurring items are deductions).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agentid INT NOT NULL,                       -- FK employees.id
  vendor_id INT NOT NULL,
  type VARCHAR(255) NOT NULL,                 -- free-text expense type (mirrors expenses.type)
  amount DECIMAL(10,2) NOT NULL,              -- signed: negatives allowed for deductions
  notes VARCHAR(255) NOT NULL DEFAULT '',
  frequency VARCHAR(20) NOT NULL,             -- weekly | biweekly | monthly
  start_date DATE NOT NULL,
  end_date DATE NULL,                         -- NULL = open-ended
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scheduled_expenses_agent_vendor_active (agentid, vendor_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 3. expense_audit: per-row audit trail for expenses (mirrors invoice_audit).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  action_type ENUM('CREATE','UPDATE','DELETE') NOT NULL,
  changed_by INT NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Previous state
  previous_type VARCHAR(255) NULL,
  previous_amount DECIMAL(10,2) NULL,
  previous_notes VARCHAR(255) NULL,
  previous_agentid INT NULL,
  previous_vendor_id INT NULL,
  previous_issue_date DATE NULL,
  previous_wkending DATE NULL,

  -- Current state (NULL for DELETE)
  current_type VARCHAR(255) NULL,
  current_amount DECIMAL(10,2) NULL,
  current_notes VARCHAR(255) NULL,
  current_agentid INT NULL,
  current_vendor_id INT NULL,
  current_issue_date DATE NULL,
  current_wkending DATE NULL,

  change_reason VARCHAR(255) NULL,
  ip_address VARCHAR(255) NULL,

  INDEX idx_expense_audit_expense (expense_id),
  INDEX idx_expense_audit_changed_by (changed_by),
  INDEX idx_expense_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 4. advance_audit: per-row audit trail for advances (analogous shape).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advance_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  advance_id INT NOT NULL,
  action_type ENUM('CREATE','UPDATE','DELETE') NOT NULL,
  changed_by INT NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Previous state
  previous_amount DECIMAL(10,2) NULL,
  previous_advance_date DATE NULL,
  previous_issue_date DATE NULL,
  previous_wkending DATE NULL,
  previous_method VARCHAR(20) NULL,
  previous_notes VARCHAR(255) NULL,
  previous_agentid INT NULL,
  previous_vendor_id INT NULL,

  -- Current state (NULL for DELETE)
  current_amount DECIMAL(10,2) NULL,
  current_advance_date DATE NULL,
  current_issue_date DATE NULL,
  current_wkending DATE NULL,
  current_method VARCHAR(20) NULL,
  current_notes VARCHAR(255) NULL,
  current_agentid INT NULL,
  current_vendor_id INT NULL,

  change_reason VARCHAR(255) NULL,
  ip_address VARCHAR(255) NULL,

  INDEX idx_advance_audit_advance (advance_id),
  INDEX idx_advance_audit_changed_by (changed_by),
  INDEX idx_advance_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 5. payroll_audit: extend the app-owned statement-deletion audit (migration
--    006) to snapshot advances alongside invoices/overrides/expenses.
--    advances_data is JSON NULL because MySQL cannot backfill a NOT NULL JSON
--    column on existing rows without an expression default.
-- ---------------------------------------------------------------------------
ALTER TABLE payroll_audit
  ADD COLUMN deleted_advances_count INT NOT NULL DEFAULT 0,
  ADD COLUMN advances_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN advances_data JSON NULL;
