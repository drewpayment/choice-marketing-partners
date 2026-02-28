-- Vendor field definitions for configurable paystub columns
-- Supports both built-in invoice columns and custom (JSON-stored) fields

CREATE TABLE IF NOT EXISTS vendor_field_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  source ENUM('builtin', 'custom') NOT NULL DEFAULT 'custom',
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_vendor_field (vendor_id, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add JSON column for custom field data on invoices
ALTER TABLE invoices ADD COLUMN custom_fields JSON NULL;
