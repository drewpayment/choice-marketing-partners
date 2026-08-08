-- Feature flag for vendor custom paystub fields
-- Disabled by default — enable per-user or globally when ready to roll out

INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage, environment)
VALUES (
  'vendor_custom_fields',
  'Configurable per-vendor paystub columns. Allows admins to define custom fields, toggle built-in column visibility, and reorder columns per vendor/campaign.',
  0,
  0,
  'all'
)
ON DUPLICATE KEY UPDATE description = VALUES(description);
