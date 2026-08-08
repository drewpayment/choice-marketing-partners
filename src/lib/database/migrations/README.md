# Database migrations

From `015` onward, every file in this directory is **PostgreSQL** SQL.

## How they run

CI applies them. On merge to `main`, `.github/workflows/migrate.yml` runs
`bun run db:migrate` (`scripts/run-migrations.ts`) against the production
`DATABASE_URL`. The runner:

1. reads `*.sql` in this directory (top level only) in filename order and
   rejects any file that contains its own transaction control — before it
   connects to anything,
2. takes a session advisory lock, so two runners can never interleave,
3. skips any filename already recorded in the `migrations` ledger table,
4. applies each remaining file **inside a single transaction** — the whole file
   commits or none of it does — and records `(migration, batch)` with
   `batch = MAX(batch) + 1`,
5. stops at the first failure; later files are not applied.

Each transaction sets `lock_timeout = 10s` and `statement_timeout = 10min`, so
unattended DDL cannot sit blocking payroll reads.

The whole file is sent as one query, so semicolons inside dollar-quoted bodies
(`$$ ... $$` in PL/pgSQL functions) are safe — there is no statement splitter.

## Rules

- **The runner owns the transaction.** Do not put `BEGIN`, `COMMIT`,
  `ROLLBACK`, `START TRANSACTION`, `END`, or `SAVEPOINT` in a migration. An
  in-file `COMMIT` ends the runner's transaction early and leaves a half-applied
  file behind a green build; an in-file `ROLLBACK` records the migration as
  applied without applying it. The runner refuses such files outright.
  (`BEGIN ... END` *inside* a `$$ ... $$` PL/pgSQL body is fine and expected —
  the check ignores dollar-quoted bodies, comments, and string literals.)
- **Never hand-apply a migration to production.** Applying it directly leaves no
  ledger row, so CI will try to apply it again on the next merge. Let the
  workflow do it.
- Name new files `NNN_short_description.sql`, continuing the sequence.
- Prefer idempotent DDL (`IF NOT EXISTS` / `IF EXISTS`) so a re-run is harmless.
- The ledger is `migrations (migration varchar(255), batch integer)` — no `id`
  column, plus a unique index on `migration`. It also holds Laravel-era rows (no
  `.sql` suffix) that never match a file.
- Migrations must connect to the **direct** endpoint, not `-pooler`. The runner
  refuses a pooled host: advisory locks and session state need a stable backend.

## Statements that cannot run in a transaction

`CREATE INDEX CONCURRENTLY`, `VACUUM`, `REINDEX CONCURRENTLY` and friends are
rejected by Postgres inside a transaction block. For those, make **line 1 of the
file exactly**:

```sql
-- runner: no-transaction
```

Such a file:

- runs **without** `BEGIN`/`COMMIT`, as a single `query()` call,
- must be a **single statement** if it needs to escape the transaction block at
  all. A multi-statement simple query is itself an implicit transaction block, so
  Postgres rejects `CREATE INDEX CONCURRENTLY` in a multi-statement file
  regardless — one concurrent index means one file.
- is **not atomic with its ledger row**. The ledger row is written afterwards, so
  a crash in between can leave the statement applied and unrecorded. Keep such
  files idempotent (`CREATE INDEX CONCURRENTLY IF NOT EXISTS`) so a re-run is
  safe.
- gets `lock_timeout = 10s` but **no** `statement_timeout` — a concurrent index
  build on a large table legitimately runs long.

## Fresh databases

The runner refuses to proceed when the ledger is missing or empty, because on an
established database that means `DATABASE_URL` is pointing somewhere unexpected.
For a genuinely new database (a local scratch DB, a preview branch), set
`ALLOW_BOOTSTRAP=1`.

## `mysql-archive/`

`001`–`014` are the MySQL/MariaDB-era migrations. They were all applied to
production before the Postgres cutover and are recorded in the ledger. They are
kept for history only — the runner does not read subdirectories, and the SQL is
**not** valid Postgres. Do not run them.
