-- Email verification before first login (idempotent)

-- Add users.email_verified_at if it does not already exist.
-- The grandfather UPDATE runs only when the column is first added, so
-- pre-existing accounts are marked verified and never gated, while accounts
-- created afterwards under the verification flow keep a NULL value.
DROP PROCEDURE IF EXISTS _add_email_verified_at;
DELIMITER $$
CREATE PROCEDURE _add_email_verified_at()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL;
    UPDATE users SET email_verified_at = COALESCE(created_at, NOW());
  END IF;
END$$
DELIMITER ;
CALL _add_email_verified_at();
DROP PROCEDURE IF EXISTS _add_email_verified_at;

-- Seed the require-email-verification flag (disabled, 0% rollout, all environments).
-- Toggle/ramp it from the admin feature-flags UI.
INSERT IGNORE INTO feature_flags (name, description, is_enabled, rollout_percentage, environment)
VALUES (
  'require-email-verification',
  'Require new employees to verify their email and set a password before first login',
  0, 0, 'all'
);
