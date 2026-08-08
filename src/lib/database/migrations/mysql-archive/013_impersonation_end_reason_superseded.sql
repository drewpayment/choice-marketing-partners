-- 013_impersonation_end_reason_superseded.sql
-- Add 'superseded' to user_impersonation_log.end_reason.
--
-- Business context: impersonation state lives in the actor's JWT; the log row
-- is the audit record. If the actor's session dies mid-impersonation (logout,
-- cookie loss), the row is orphaned with ended_at NULL and blocked every future
-- impersonation start with a 409. The start route now closes such orphans with
-- end_reason='superseded' and proceeds; this migration adds that enum value.
-- Appending an ENUM value is an in-place metadata change (no row rewrite) on
-- both MySQL 8 and MariaDB 10.6.

ALTER TABLE user_impersonation_log
  MODIFY COLUMN end_reason ENUM('manual', 'expired', 'rejected_mutation', 'superseded') NULL DEFAULT NULL;
