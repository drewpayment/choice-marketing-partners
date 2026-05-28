-- 009_user_impersonation.sql
-- Audit trail for admin "emulate user" sessions.
-- Append-only: rows are inserted on start, updated only to set ended_at/end_reason on stop.
-- A separate row is inserted with end_reason='rejected_mutation' for every blocked write attempt.

CREATE TABLE IF NOT EXISTS user_impersonation_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(36) NOT NULL,
  target_user_id VARCHAR(36) NOT NULL,
  actor_employee_id INT NULL,
  target_employee_id INT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL DEFAULT NULL,
  end_reason ENUM('manual', 'expired', 'rejected_mutation') NULL DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  blocked_method VARCHAR(10) NULL,
  blocked_path VARCHAR(512) NULL,
  INDEX idx_impersonation_actor (actor_user_id),
  INDEX idx_impersonation_target (target_user_id),
  INDEX idx_impersonation_started (started_at),
  INDEX idx_impersonation_open (actor_user_id, ended_at)
);
