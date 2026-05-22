-- Email delivery event log (idempotent)
-- Append-only record of Resend webhook events, keyed by recipient email address.
-- No changes to employees/users — delivery status is correlated by email string.

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  svix_id          VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  event_type       VARCHAR(50)  NOT NULL,
  resend_email_id  VARCHAR(255) NULL,
  subject          VARCHAR(255) NULL,
  bounce_type      VARCHAR(50)  NULL,
  payload          JSON NULL,
  occurred_at      TIMESTAMP NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_svix_id (svix_id),
  KEY idx_email (email),
  KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
