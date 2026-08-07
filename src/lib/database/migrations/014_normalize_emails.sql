-- Normalize stored login emails to lower(trim(email)) on users + employees.
--
-- Part of Phase 1/2 of the Postgres migration (docs/postgres-migration-plan.md):
-- all email lookups now normalize their input (PR #93), so stored values must be
-- canonical too — MySQL's ci collation hides case differences today, but a
-- case-sensitive engine will not.
--
-- Audited 2026-08-07 against the prod snapshot: zero case-collision groups and
-- zero whitespace-padded emails in either table, so this cannot merge distinct
-- accounts. Under the ci collation a case-variant duplicate would already
-- collide, so lowercasing cannot introduce a new unique-key violation either.
--
-- The WHERE uses a BINARY cast: under ci collation `email <> LOWER(email)` is
-- false for pure case differences, which would silently skip every row this
-- migration exists to fix.

UPDATE users
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL
  AND CAST(email AS BINARY) <> CAST(LOWER(TRIM(email)) AS BINARY);

UPDATE employees
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL
  AND CAST(email AS BINARY) <> CAST(LOWER(TRIM(email)) AS BINARY);
