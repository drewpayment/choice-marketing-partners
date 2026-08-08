-- 012_scheduled_expense_applications.sql
-- Links a recurring expense template (scheduled_expenses) to the concrete
-- statement it was materialized onto. Historically, statement-create injected
-- due templates as ordinary `expenses` rows and stripped the recurring flag,
-- leaving NO trace of WHEN a template actually applied. This table restores
-- that linkage so admins can see when a rule HAS applied (and, combined with
-- the projection logic, when it WILL next apply).
--
-- One row per (template, statement). The UNIQUE KEY makes re-saving a statement
-- idempotent — the save path upserts via INSERT ... ON DUPLICATE KEY UPDATE.

-- ---------------------------------------------------------------------------
-- scheduled_expense_applications: template → materialized-statement linkage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_expense_applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scheduled_expense_id INT NOT NULL,          -- FK scheduled_expenses.id
  expense_id INT NULL,                         -- expid of the materialized `expenses` row (NULL if unknown)
  agentid INT NOT NULL,                        -- FK employees.id
  vendor_id INT NOT NULL,
  issue_date DATE NOT NULL,                    -- paystub issue_date the template applied to
  wkending DATE NOT NULL,                       -- statement week-ending the template applied to
  amount DECIMAL(10,2) NOT NULL,               -- snapshot of the template amount at application time
  applied_by INT NOT NULL,                      -- employees.id of the admin who saved the statement
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- A template applies at most once per statement (keyed by issue_date); the
  -- save path upserts on this key so re-saving a statement is idempotent.
  UNIQUE KEY uq_sched_expense_app_template_issue (scheduled_expense_id, issue_date),
  KEY idx_sched_expense_app_agent_vendor_issue (agentid, vendor_id, issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
