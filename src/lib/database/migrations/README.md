# Database migrations

From `015` onward, every file in this directory is **PostgreSQL** SQL.

## How they run

CI applies them. On merge to `main`, `.github/workflows/migrate.yml` runs
`bun run db:migrate` (`scripts/run-migrations.ts`) against the production
`DATABASE_URL`. The runner:

1. reads `*.sql` in this directory (top level only) in filename order,
2. skips any filename already recorded in the `migrations` ledger table,
3. applies each remaining file **atomically in a single transaction** — the whole
   file succeeds or none of it does — and records `(migration, batch)` with
   `batch = MAX(batch) + 1`,
4. stops at the first failure; later files are not applied.

The whole file is sent as one query, so semicolons inside dollar-quoted bodies
(`$$ ... $$` in PL/pgSQL functions) are safe — there is no statement splitter.

## Rules

- **Never hand-apply a migration to production.** Applying it directly leaves no
  ledger row, so CI will try to apply it again on the next merge. Let the workflow
  do it.
- Name new files `NNN_short_description.sql`, continuing the sequence.
- Prefer idempotent DDL (`IF NOT EXISTS` / `IF EXISTS`) so a re-run is harmless.
- The ledger is `migrations (migration varchar(255), batch integer)` — no `id`
  column. It also holds Laravel-era rows (no `.sql` suffix) that never match a
  file.

## `mysql-archive/`

`001`–`014` are the MySQL/MariaDB-era migrations. They were all applied to
production before the Postgres cutover and are recorded in the ledger. They are
kept for history only — the runner does not read subdirectories, and the SQL is
**not** valid Postgres. Do not run them.
