-- 006_payroll_audit.sql
-- Audit trail for pay statement deletions
CREATE TABLE IF NOT EXISTS payroll_audit (
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
