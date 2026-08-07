# Phase 1 — Pre-Migration Hardening (ships on MySQL, valuable regardless of migration)

**Parent plan:** `docs/postgres-migration-plan.md`
**Branch:** `feat/pg-migration-phase1`
**Principle:** every item here is a real bug fix or data-quality audit on the *current* MySQL stack. Behavior on MySQL must be unchanged or strictly improved; nothing in Phase 1 depends on Postgres happening.

---

## Work items

### A. Finish the email-normalization rollout (code)

`src/lib/utils/email.ts` already exports a normalize helper (`trim().toLowerCase()`), applied in 3 of 6 email-lookup sites. Finish the job:

| Site | Today | Change |
|---|---|---|
| `src/lib/auth/config.ts:25` (NextAuth `authorize`) | `.where('email', '=', credentials.email)` — raw | normalize input before lookup |
| `src/app/api/auth/reset-password/route.ts:38` | `.where('email', '=', payload.email)` — raw (from JWT) | normalize |
| `src/lib/repositories/EmployeeRepository.ts:1185` | `.where('email', '=', email)` — raw | normalize |

Already correct (do not touch): `EmployeeRepository.ts:963`, `:983`.

Amended during implementation:

- `request-reset/route.ts:25` was listed here as "already correct", but it held an inline
  `email.toLowerCase()` — which the acceptance criterion below rules out and which misses the
  trim. Converted to `normalizeEmail(email)`. Behaviour delta on MySQL today: a submitted
  address padded with leading whitespace (or a tab/newline — PAD SPACE only ignores *trailing*
  spaces) now resolves to the user row instead of silently falling into the anti-enumeration
  no-op. Direction is benign — trimming can only widen matching to the correct row, and the
  snapshot has zero leading-whitespace stored emails, so no reset can be redirected to a
  different account.
- `src/app/api/employees/[id]/create-user/route.ts` — a 4th raw email-equality site the table
  above missed (found by the mandated grep). Normalised, and the value is hoisted so the
  existing-login *probe*, the `users` INSERT and the welcome-email recipient all bind the same
  canonical string; probing one string while writing another would, under Postgres, miss a
  mixed-case login and then trip `users_email_unique`.
- `EmployeeRepository.softDeleteEmployee` — the parked value is now built from
  `normalizeEmail(user.email)` so the collision guard at `:1185` probes exactly what the
  UPDATE writes. Consequence: a delete → restore round-trip lowercases that login's stored
  address (a no-op for authentication in either engine, since every lookup normalises).

On MySQL's `unicode_ci` collation this is a behavioral no-op for case (safe to ship); it *does* newly trim whitespace — that's a strict improvement. Under Postgres later, it becomes load-bearing for login.

**Tests:** unit coverage that each path normalizes (mixed-case + padded input reaches the query lowercased/trimmed). Follow existing test patterns in `src/**/__tests__/`.

**Acceptance:** all three sites use the shared helper (no inline `.toLowerCase()` copies); no other raw email-equality lookups remain (verify by grep, not just the list above); existing tests still pass.

### B. Email case-collision data audit (read-only, informs a later data migration)

Against the **local prod snapshot** (`choice-mysql-dev` container — never prod):

1. Count emails containing uppercase, in `users` and `employees` (every table with an email column — discover via `information_schema`).
2. List collision groups: distinct emails that collapse to the same `lower(email)` within a table with a unique/lookup-relevant email column (include row ids, `is_active`, `deleted_at`).
3. Note whitespace-padded emails.

**Output:** a report (JSON/markdown) checked into nothing — surfaced in the run summary. **Decision rule:** if zero collisions → a simple `UPDATE … SET email = lower(trim(email))` migration can be authored later (via `bun run db:migrate` ledger — never hand-applied to prod). If collisions exist → each group needs a human decision (accounts may be distinct people); do NOT auto-dedupe.

### C. `sales_id1/2/3` case-variance audit (read-only)

Same snapshot DB. `sales_id1/2/3` are hand-entered varchars used for payroll authorization (`src/lib/auth/payroll-access.ts:59`) — under Postgres, a case mismatch silently changes payroll visibility.

1. Collect all non-empty `sales_id1/2/3` values across `employees`.
2. Report values that collide case-insensitively but differ case-sensitively (and where they're referenced, e.g. `invoices.agentid`/sales linkage as applicable).
3. Report leading/trailing whitespace variants.

**Output:** report only. Zero variance ⇒ Phase 2 needs no special handling. Any variance ⇒ plan a normalization pass + decide canonical casing before Phase 2.

### D. Rewrite `fn('DATE')` filters in InvoiceAuditRepository as range predicates (code)

> **Premise corrected during implementation.** This item was originally specced as fixing a
> "live bug": the audit claimed `.where(({eb}) => eb.fn('DATE', [...]), '>=', fromDate)` passes
> a callback where Kysely expects an expression and silently drops the filter. Both the
> implementer and the adversarial reviewer independently disproved this against the repo's real
> Kysely 0.28 + `MysqlQueryCompiler`: the 3-arg `where(factory, op, rhs)` form compiles to the
> **same correct SQL** as the canonical form (re-verified in the main session with a standalone
> compile probe). There was no live bug, so the originally demanded "test that fails on the old
> code" is unsatisfiable and was waived.

The rewrite still shipped, as an improvement rather than a bugfix: `getAuditSummary`'s
`dateFrom`/`dateTo` filters and `recentChanges`' 30-day filter now use half-open range
predicates on the raw `ia.changed_at` column (`col >= from AND col < to+1day`) instead of
`DATE(col)` — sargable, Postgres-portable, plus guards for invalid date input (previously an
`Invalid Date` string reached the SQL layer). The four remaining `fn('DATE', ['issue_date'])`
sites in `InvoiceRepository.ts` (`getInvoiceDetail`) compile correctly and stay as-is —
**Phase 2 scope**, per this doc's own rule about working `fn('DATE')` usages.

**Tests:** SQL-compilation tests pin the emitted predicates and bound values
(timezone-independent — the first version of these assertions was itself caught off-by-one
under UTC+ runners by the adversarial review).

### E. Defensive JSON parsing on paystub + marketing paths (code)

`InvoiceRepository.ts:348` already does it right: `typeof v === 'string' ? JSON.parse(v) : v`. Apply the same both-ways guard to:

- `src/lib/repositories/PayrollRepository.ts:674` — `JSON.parse(sale.custom_fields)` on the paystub sales path (throws on non-string / malformed today; throws on auto-parsed objects under pg later). Malformed JSON should degrade gracefully (log + empty object), not take down paystub rendering.
- `src/lib/repositories/ProductMarketingRepository.ts:82` — `JSON.parse(row.feature_list)`, same treatment.

Extract a small shared helper rather than a third inline copy. **Tests:** string input, already-parsed object input, null, malformed JSON.

Amended during implementation: this item originally said malformed JSON on the paystub path
should fall back to an *empty object*. The implementation falls back to `undefined` instead,
matching the existing absent-`custom_fields` branch at the same call site — so malformed and
missing custom fields render identically, rather than malformed producing a truthy `{}` that
absent never produces. Accepted as the better behavior. Known minor gap (accepted): the
`ProductMarketingRepository` call site has no test that exercises `getMarketingProducts()`
end-to-end; the helper itself is fully unit-tested.

---

## Execution model

1. **Implementation:** one subagent per code item (A, D, E) working on disjoint files on this branch; a separate read-only audit subagent for B+C against the local snapshot container. No commits by agents.
2. **Adversarial review:** an independent reviewer per code item, prompted to *refute* the change: MySQL behavior regressions, missed sites, security implications (A touches the auth path), weak tests. Confirmed findings loop back to a fix pass.
3. **Verification (main session):** `bun lint`, full `bun test`, build; E2E auth specs if touched surface warrants; human-readable diff review before any commit.
4. **Rollout:** single PR to `main`. The B/C audit results are attached to the PR/summary, with the follow-up data-migration decision recorded here:

## Audit results & decisions (run 2026-08-07, local prod snapshot `choice-mysql-dev`)

- [x] **Email audit: CLEAN.** 6 tables with email-like columns checked via `information_schema`
  (`employees`, `users`, `email_delivery_events`, `job_applications.applicant_email`,
  `password_resets`, `subscribers`). 10 `employees` + 9 `users` rows contain uppercase; **zero
  case-collision groups** (no two distinct emails collapse to the same `lower(trim(email))` in
  any table); **zero** whitespace-padded emails. Note: `employees` has many *exact*-duplicate
  emails across ids (e.g. one address on 13 rows, mostly soft-deleted) — pre-existing business
  data, unaffected by lowercasing.
- [x] **sales_id audit: CLEAN.** 1,078 distinct non-empty values across `sales_id1/2/3`; zero
  case-insensitive collisions, zero whitespace variants. Cross-reference confirmed
  `invoices.agentid` is an **INT FK to `employees.id`** (1089/1090 join match), not a string
  match against sales_ids — so there is no invoices↔sales_id case-mismatch surface. The only
  string-comparison path is `payroll-access.ts` `canAccessAgent()`, currently collision-free.
- [x] **Data-normalization migration (014): GO.** A `UPDATE … SET email = lower(trim(email))`
  pass (users + employees) is safe — no collisions to adjudicate. Author it as migration 014
  via the `bun run db:migrate` ledger (never hand-applied to prod). Scheduled alongside or
  before Phase 2; not required for this PR since MySQL lookups are collation-insensitive today.
