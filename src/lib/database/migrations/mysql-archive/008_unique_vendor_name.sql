-- Enforce uniqueness on vendor names.
--
-- Prerequisite: scripts/merge-duplicate-vendors.ts --apply must have been
-- run first. This migration will fail loudly if duplicate names remain.

ALTER TABLE vendors
  ADD CONSTRAINT uk_vendors_name UNIQUE (name);
