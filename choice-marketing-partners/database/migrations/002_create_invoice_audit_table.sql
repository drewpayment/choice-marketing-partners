-- Migration: Create invoice_audit table for tracking invoice changes
-- Date: 2025-09-21
-- Purpose: Audit trail system for investigating chargeback claims and status changes

CREATE TABLE invoice_audit (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Reference to original invoice
  invoice_id INT UNSIGNED NOT NULL,
  
  -- Audit metadata
  action_type ENUM('UPDATE', 'DELETE') NOT NULL,
  changed_by INT UNSIGNED NOT NULL,            -- User ID who made the change
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Full invoice snapshot before the change
  previous_vendor VARCHAR(255),
  previous_sale_date DATE,
  previous_first_name VARCHAR(255),
  previous_last_name VARCHAR(255),
  previous_address TEXT,
  previous_city VARCHAR(255),
  previous_status VARCHAR(100),
  previous_amount DECIMAL(10,2),
  previous_agentid INT,
  previous_issue_date DATE,
  previous_wkending DATE,
  
  -- Full invoice snapshot after the change
  current_vendor VARCHAR(255),
  current_sale_date DATE,
  current_first_name VARCHAR(255),
  current_last_name VARCHAR(255),
  current_address TEXT,
  current_city VARCHAR(255),
  current_status VARCHAR(100),
  current_amount DECIMAL(10,2),
  current_agentid INT,
  current_issue_date DATE,
  current_wkending DATE,
  
  -- Additional context
  change_reason TEXT,                          -- Optional reason for the change
  ip_address VARCHAR(45),                      -- Track IP for security
  
  -- Indexes for efficient searching and investigation
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_changed_by (changed_by),
  INDEX idx_changed_at (changed_at),
  INDEX idx_action_type (action_type),
  INDEX idx_previous_agentid (previous_agentid),
  INDEX idx_current_agentid (current_agentid),
  INDEX idx_previous_vendor (previous_vendor),
  INDEX idx_current_vendor (current_vendor),
  INDEX idx_previous_sale_date (previous_sale_date),
  INDEX idx_current_sale_date (current_sale_date),
  INDEX idx_previous_issue_date (previous_issue_date),
  INDEX idx_current_issue_date (current_issue_date),
  INDEX idx_previous_wkending (previous_wkending),
  INDEX idx_current_wkending (current_wkending),
  INDEX idx_previous_status (previous_status),
  INDEX idx_current_status (current_status),
  INDEX idx_previous_amount (previous_amount),
  INDEX idx_current_amount (current_amount),
  
  -- Compound indexes for common search patterns
  INDEX idx_agent_date (current_agentid, current_sale_date),
  INDEX idx_vendor_date (current_vendor, current_sale_date),
  INDEX idx_customer_name (current_first_name, current_last_name),
  INDEX idx_status_changes (previous_status, current_status),
  INDEX idx_amount_changes (previous_amount, current_amount),
  
  -- Full-text search for customer investigation
  FULLTEXT INDEX idx_customer_search (current_first_name, current_last_name, current_address, current_city),
  
  -- Foreign key constraints
  CONSTRAINT fk_invoice_audit_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_audit_changed_by FOREIGN KEY (changed_by) REFERENCES employees(id)
);

-- Add a comment to document the purpose
ALTER TABLE invoice_audit COMMENT = 'Audit trail for invoice changes - tracks full record snapshots for chargeback investigations - created 2025-09-21';

-- Note: This table captures complete before/after snapshots of invoice records
-- for comprehensive audit trails during chargeback and status change investigations