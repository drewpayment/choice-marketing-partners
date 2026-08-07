# Postgres Migration Plan — MariaDB (DO droplet) → Neon (Vercel Marketplace)

**Status:** Approved direction, Phase 1 in progress
**Decision date:** 2026-08-07
**Research basis:** vendor facts verified against live sources 2026-08-07; codebase audit of this repo same day. Line numbers below are as of commit `49227f5` — re-verify before acting on them later.

---

## 1. Decision summary

Migrate the production database from self-managed MariaDB 10.6 (Docker on DigitalOcean droplet `snowy-surf`, NYC1) to **Neon Postgres via the Vercel Marketplace native integration**, provisioned in `aws-us-east-1` (same metro as Vercel `iad1`).

**Why move at all** (it is *not* latency — NYC1↔iad1 is ~5–10 ms, fine):

- The 2026-08-07 disk-full outage proved the operational risk: a 3-years-uptime, unmanaged Docker MariaDB with no automated in-DB backups, no failover, and no monitoring took the homepage down while health checks stayed green.
- The old Laravel stack on the droplet is dead traffic-wise (15 nginx hits/7 days, all uptime pings and bot scans). The Vercel app is the DB's only real consumer — nothing gets stranded by moving it.
- Decommissioning the droplet after cutover ends the disk-full incident class permanently and likely makes the move cost-negative.

**Why Neon specifically:**

| Factor | Neon |
|---|---|
| Region | aws-us-east-1 (N. Virginia — same metro as Vercel iad1) |
| PITR | Included in base plans: 7-day (Launch), 30-day (Scale). Not an add-on. |
| Pooling | Built-in PgBouncer (`-pooler` endpoint) — replaces our `connectionLimit: 1` serverless hack |
| Vercel integration | Native marketplace: unified billing, env-var injection, **automatic copy-on-write DB branch per preview deployment** |
| Pricing (verified 2026-08) | Launch tier is pure usage-based, no monthly minimum; $0.35/GB-mo storage, $0.106/CU-hr compute, scale-to-zero. Our ~6 GB ≈ low single digits $/mo. |
| Vendor risk | Databricks-owned since May 2025 (~$1B acquisition) |

**Rejected alternatives** (facts verified 2026-08-07):

- **Supabase** — Pro $25/mo buys auth/realtime/storage we already have (NextAuth, Vercel Blob); true PITR is a **$100/mo add-on** → ~$130/mo for what Neon includes.
- **Prisma Postgres** — novel unikernel infra, ~18 months GA, per-operation billing, Prisma-ORM-centric (we're on Kysely), no verifiable PITR story. Wrong risk profile for payroll.
- **PlanetScale** — Vitess/MySQL floor is $39/mo for sharding we'll never use (no free tier since Apr 2024). Their Postgres product (GA Sep 2025, $5–15/mo, Metal from $50) is credible but inherits the same migration cost as Neon with weaker Vercel integration.
- **AWS via Vercel Marketplace** — covers Aurora PostgreSQL, DynamoDB, DSQL only; **not** RDS MySQL/MariaDB. Plain RDS (~$14/mo db.t4g.micro, supports MariaDB) means hand-managed AWS networking/credentials — the ops burden we're shedding.
- **DigitalOcean Managed MySQL** — the honest zero-code-risk fallback: $15/mo single node / $60/mo HA, true 7-day PITR, NYC region. If we ever abandon the Postgres migration, this is the move. Its only costs are staying off the Vercel platform and single-node non-HA at the entry price.

Sources: neon.com/pricing · neon.com/docs/guides/vercel-managed-integration · neon.com/docs/introduction/regions · planetscale.com/pricing · planetscale.com/changelog/postgres-ga · vercel.com/blog/aws-databases-are-now-live-on-the-vercel-marketplace-and-v0 · docs.digitalocean.com/products/databases/mysql/details/pricing · pgloader.readthedocs.io/en/latest/ref/mysql.html · kysely.dev/docs/dialects

---

## 2. Codebase audit — migration surface (audited 2026-08-07)

Scale: 22 repository files / ~9,400 LOC, 192 `.execute(` sites, 53 tables in `types.ts`, 15 raw-MySQL migration files. The Kysely abstraction held up: **1** raw `sql` tag and **3** MySQL-only builder calls in all of the repositories. The cost is concentrated in silent behavioral differences, not SQL rewriting.

### 2.1 Mechanical (find/replace, compiler-verifiable, ~1 day)

| Item | Sites | Where |
|---|---|---|
| `MysqlDialect`/`createPool` → `PostgresDialect` | 1 | `src/lib/database/client.ts` — delete `getDatabaseConfig()` and mysql2-only pool options (`supportBigNumbers`, `bigNumberStrings`, `dateStrings`) |
| `'like'` → `'ilike'` (restores today's CI search behavior) | 25 | EmployeeRepository, InvoiceAuditRepository, SubscriberRepository, DocumentRepository, VendorRepository, `api/users/search` |
| `serverExternalPackages` mysql2 → pg | 1 | `next.config.ts:31` |
| Swap `mysql2` → `pg` / `@neondatabase/serverless` | 1 | `package.json` |
| `.env*`/docs URL scheme + `CLAUDE.md:249` ("no RETURNING") rule inversion | ~7 files | |
| `docker-compose.dev.yml` → postgres image | 1 | |
| Regenerate `types.ts` (kysely-codegen switches introspector on URL scheme) | 1 | Also fixes `feature_flags`/`feature_flag_overrides` currently missing from `DB` |
| Drop 2 unused FULLTEXT indexes | — | No `MATCH…AGAINST` anywhere in app code |

### 2.2 Needs care (silent if wrong, ~1–2 weeks)

- **`insertId` → `.returning('id')` — 26 non-test sites.** Postgres never populates `InsertResult.insertId`; `Number(undefined)` is `NaN`. Sites span EmployeeRepository (×4), PayrollRepository:1061 (deletion audit), InvoiceRepository:482, InvoiceRepository.simple:202/239/280, AdvanceRepository:119, ExpenseAuditRepository:67, InvoiceAuditRepository:215, ScheduledExpenseRepository:351, VendorRepository:135, VendorFieldRepository:209, DocumentRepository:213, ProductRepository:203/246, SubscriberRepository:208, BillingRepository:141/201, ImpersonationRepository:69, FeatureFlagRepository:149, JobApplicationRepository:79 (degrades to `0` silently — no throw), `api/employees/[id]/create-user/route.ts:141`, plus `scripts/seed-test-accounts.ts`.
- **tinyint-as-boolean — ~90 sites across three inconsistent conventions.** 26 `tinyint(1)` columns typed as `number` today. 33 strict `=== 1` reads (incl. all auth flags), 32 `? 1 : 0` writes, 25 `.where(flag, '=', 1|0)` filters, plus 21 `Boolean(...)` sites that survive unchanged. **Mitigation chosen: import tinyint as `smallint` (not boolean) so all 90 sites work unchanged; convert to real boolean as a separate later project.**
- **`onDuplicateKeyUpdate` → `onConflict` — 3 sites** (ProductMarketingRepository:138, FeatureFlagRepository:194, InvoiceRepository.simple:304 — the last is inside the payroll transaction). Not mechanical: `ON CONFLICT` requires naming the exact unique constraint per site.
- **`fn('DATE', [...])` — 72 sites** (34 in PayrollRepository). Usually works in pg via cast-function syntax but is index-hostile in both engines; convert to half-open range predicates opportunistically.
- **`ON UPDATE CURRENT_TIMESTAMP` — 9 prod tables.** Postgres needs `BEFORE UPDATE` triggers or a verified app-side `updated_at` write on every `.updateTable()` (currently inconsistent).
- **JSON columns — keep as `text` in pg.** 3 `JSON.parse` sites; `PayrollRepository.ts:674` (paystub sales path) and `ProductMarketingRepository.ts:82` are undefended and would throw on auto-parsed `jsonb`. (Fixed in Phase 1.)
- **ENUM columns (10) → `text` + `CHECK`**, so the string-union types survive verbatim and we avoid `ALTER TYPE … ADD VALUE`'s no-transaction restriction.
- **NULLS ordering flips** on ASC for nullable sort keys (55 `orderBy` sites — per-query eyeball, only nullable keys matter).
- **`db.fn.count<number>()` type lie — 13 sites**: pg returns `int8` as string; `count > 0` silently becomes string comparison.
- **Migration runner**: `scripts/run-migrations.ts` is raw-mysql2 with a hand-rolled `DELIMITER` parser. Don't port the 15 MySQL DDL files — generate a fresh Postgres baseline and start a new ledger.

### 2.3 Risky (dedicated plan + staged rollout)

1. **Auth/login.** `src/lib/auth/config.ts` combines both silent-failure classes: line 25 case-sensitive email lookup (MySQL is `utf8mb3_unicode_ci` today — case/accent-insensitive everywhere), lines 76–79 `is_admin === 1`-style flag reads. Password reset gates on the same pattern, so the natural user workaround breaks in the same instant. Prerequisites: finish `normalizeEmail` rollout + one-time `lower(email)` data pass **with case-collision dedupe** (two rows differing only by case are legal under today's CI unique index). Complication: `users.id` is a non-unique int and one employee can resolve to several user rows (see CLAUDE.md) — case-collapsing can merge identity sets.
2. **Payroll money correctness.** Decimal→string→`parseFloat` convention ports cleanly (pg also returns `numeric` as string). Risks are in the machinery: `insertId` NaN inside the payroll transaction (InvoiceRepository.simple:280 writes it as an FK) and the deletion-audit path (PayrollRepository:1061); the undefended `JSON.parse` at PayrollRepository:674; and 18 `toISOString().split('T')[0]` grouping-key builds with an existing local-midnight/UTC hazard that driver-timezone changes will shift, not fix. **The proof gate: diff per-agent/vendor/issue-date SUM(amount) for paystubs, sales, overrides, expenses, and advances between both databases, to the cent, before cutover** (§4).
3. **`sales_id1/2/3` payroll authorization.** `src/lib/auth/payroll-access.ts:59` matches hand-entered varchar sales IDs; under pg a case mismatch silently changes *whose payroll someone can see*. Audit values for case variance pre-cutover (Phase 1).
4. **Vendor-name uniqueness divergence.** Migration 008's `UNIQUE (name)` is case-insensitive today, case-sensitive under pg, while `VendorRepository.isNameAvailable` stays CI — app and DB will disagree. Restore with `CREATE UNIQUE INDEX ON vendors (lower(name))`.
5. **Dump conversion.** 34 tables `utf8mb3_unicode_ci`, 10 `utf8mb4`, **2 `latin1` (need explicit transcoding or mojibake)**; 56 `unsigned` columns need range checks; pgloader cast rules: `tinyint → smallint drop typemod` (NOT the default tinyint(1)→boolean), zero-dates→NULL, enum→text.

---

## 3. Phased plan

- **Phase 0 — backups. DONE (already covered):** nightly full-droplet backups exist on the DO side. Local dump copies also exist in `~/db-backups/` (see memory/db-backup docs).
- **Phase 1 — pre-migration hardening on MySQL (~2–3 days).** Bug fixes valuable today that shrink the Postgres blast radius. Detailed in `docs/postgres-migration-phase-1.md`. Ships to prod on MySQL, independently of any migration decision.
- **Phase 2 — provision + port (~1 week).** `vercel integration add neon` (region `aws-us-east-1`). pgloader import with the cast rules above. Code: dialect swap, regenerate types, 26 `insertId` rewrites, 3 `onConflict` conversions, 25 `ilike` flips, `lower(name)` vendor index, `updated_at` trigger-or-audit, fresh pg migration baseline + runner.
- **Phase 3 — verify (~3–4 days).** Full unit + Playwright suites against a Neon branch; auth smoke for all three seeded roles incl. mixed-case email sign-in; the payroll reconciliation diff (§4); `sales_id` scope checks per role.
- **Phase 4 — cutover (an evening).** Freeze writes (low traffic), final pgloader run (full reload is minutes at this size), flip `DATABASE_URL` in Vercel env, monitor. Droplet becomes read-only fallback for 30 days, then decommission.
- **Post-migration cleanup (unscheduled):** smallint→boolean flag conversion, `citext`/lower() email index, fn('DATE')→range predicates, count-as-string typing.

## 4. Cutover proof gate — payroll reconciliation

Run on **both** databases with identical frozen data; every row must match to the cent:

```sql
SELECT agent_id, vendor_id, issue_date, COUNT(*), SUM(amount) FROM paystubs   GROUP BY 1,2,3;
SELECT agentid,  vendor,    issue_date, COUNT(*), SUM(amount) FROM invoices   GROUP BY 1,2,3;
SELECT -- same shape for overrides, expenses, advances
```

Plus: row counts for all tables; `SELECT lower(email), COUNT(*) FROM users GROUP BY 1 HAVING COUNT(*) > 1` must return the same (ideally empty) set on both.

## 5. Open decisions

- Neon driver: standard `pg` Pool via pooled endpoint vs `@neondatabase/serverless`. Leaning `pg` + PgBouncer endpoint — least code change, well-trodden with Kysely `PostgresDialect`.
- Preview-deployment DB branching: enabled by the integration by default; decide whether E2E in CI should use a branch per PR.
- What to do with the droplet's Laravel containers at decommission time (archive an image? just snapshot the droplet and destroy?).
