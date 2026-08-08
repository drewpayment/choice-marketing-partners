-- Feature flags migration (idempotent)

-- Add is_super_admin column if it doesn't already exist
DROP PROCEDURE IF EXISTS _add_super_admin_col;
DELIMITER $$
CREATE PROCEDURE _add_super_admin_col()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'employees'
      AND COLUMN_NAME  = 'is_super_admin'
  ) THEN
    ALTER TABLE employees
      ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0;
  END IF;
END$$
DELIMITER ;
CALL _add_super_admin_col();
DROP PROCEDURE IF EXISTS _add_super_admin_col;

CREATE TABLE IF NOT EXISTS feature_flags (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(100) NOT NULL UNIQUE,
  description        TEXT NULL,
  is_enabled         TINYINT(1) NOT NULL DEFAULT 0,
  rollout_percentage INT NOT NULL DEFAULT 100,
  environment        VARCHAR(50) NOT NULL DEFAULT 'production',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  flag_id        INT NOT NULL,
  context_type   ENUM('user', 'role', 'subscriber') NOT NULL,
  context_value  VARCHAR(255) NOT NULL,
  is_enabled     TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE,
  UNIQUE KEY uq_flag_context (flag_id, context_type, context_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed enable-subscriptions flag (enabled, 100% rollout, production)
INSERT IGNORE INTO feature_flags (name, description, is_enabled, rollout_percentage, environment)
VALUES ('enable-subscriptions', 'Billing & subscription management', 1, 100, 'production');
