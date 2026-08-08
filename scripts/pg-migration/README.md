# MariaDB → PostgreSQL import pipeline

Phase 2 of `docs/postgres-migration-plan.md`. Two files that do the import, one
that finishes the job against the source counters, and one that proves the
result — run in that order:

| File | What it does |
|---|---|
| `local-import.load` | pgloader command file. Full schema + data reload, with the cast rules the app requires. Holds the only copy of the connection strings. |
| `post-import-fixups.sql` | Idempotent psql script. Everything pgloader cannot express: ENUM→text, unsigned downcast, ci-unique indexes, `updated_at` triggers, restored CHECK constraints, dropping un-ported FULLTEXT stand-ins. Ends in assertions. |
| `align-sequences.sh` | Advances each sequence to the source `AUTO_INCREMENT` counter (pgloader only resets to `max(id)`, so deleted ids would be re-issued). Forward-only and idempotent. |
| `validate.sh` | Reconciles source vs target: row counts, numeric SUMs, date ranges, string byte-fidelity, the §4 payroll money diff, schema shape, sequences. Every check is an assertion; exits non-zero on any mismatch. |

The pipeline is a **full reload**, not an incremental sync. It takes ~2 seconds
on the current ~300 k rows / 32 MB, so re-running from scratch is always the
right answer when something looks wrong. The target is disposable by design.

---

## Prerequisites

```bash
brew install pgloader          # verified against 3.6.10 / SBCL 2.6.1
which pgloader                 # /opt/homebrew/bin/pgloader
```

`psql` is invoked through `docker exec` in the examples below because the dev
machine has no local client. If you have one, use it directly.

For the **cutover** you additionally need `psql`, `pg_dump` and `pg_restore` at
**17.x** on the machine that talks to Neon (`brew install libpq`), because
pgloader cannot connect to Neon at all — see "Cutover run". The container's own
`pg_dump`/`pg_restore` (`docker exec choice-postgres-dev pg_dump …`) are 17.x and
work for the dump half.

---

## Local run

Source: `choice-mysql-dev` (127.0.0.1:3306, root/rootpassword, `choice_marketing`)
— a prod snapshot, treated as **read-only**.
Target: `choice-postgres-dev` (127.0.0.1:5433, choice/choice, `choice_marketing`,
PostgreSQL 17) — disposable.

```bash
cd /path/to/choice-marketing-partners

# 0. Preflight (see below) — takes 5 seconds, catches the two things that
#    silently corrupt an otherwise-green import.

# 1. Wipe the target. `include drop` in the load file drops the tables it is
#    about to recreate, but a hard schema reset is cleaner between attempts and
#    also clears anything a previous fixup run created.
docker exec choice-postgres-dev psql -U choice -d choice_marketing \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO choice;"

# 2. Import.
pgloader scripts/pg-migration/local-import.load

# 3. Fix up. Must print "ALL ASSERTIONS PASSED".
docker cp scripts/pg-migration/post-import-fixups.sql choice-postgres-dev:/tmp/fixups.sql
docker exec choice-postgres-dev psql -U choice -d choice_marketing \
  -v ON_ERROR_STOP=1 -f /tmp/fixups.sql

# 4. Move each sequence up to the source AUTO_INCREMENT counter.
bash scripts/pg-migration/align-sequences.sh

# 5. Prove it. Must print "VALIDATION PASSED".
bash scripts/pg-migration/validate.sh
```

Steps 3 and 4 are safe to re-run on their own (every step is a no-op once
satisfied), so you can iterate on the fixups without re-importing.

### Preflight

Two source-side facts the pipeline depends on and cannot enforce itself:

```bash
# (a) The source server must be on UTC. pgloader renders MySQL TIMESTAMP values
#     in the *source session's* zone and they land in Postgres `timestamptz`.
#     pgloader 3.6's `SET MySQL PARAMETERS` emits values unquoted, so
#     `time_zone = '+00:00'` is a syntax error and there is no escape hatch —
#     hence this check instead of a setting in the load file.
docker exec choice-mysql-dev mysql -uroot -prootpassword -N -B \
  -e "SELECT @@global.time_zone, @@session.time_zone, NOW(), UTC_TIMESTAMP();"
#     NOW() and UTC_TIMESTAMP() must be equal.

# (b) The two latin1 tables must be checked for non-ASCII bytes. See
#     "latin1 tables" below for why, and for the query.
```

---

## Cutover run (prod MariaDB → Neon)

### pgloader cannot write to Neon. Relay through a local Postgres.

This is not a preference, it is a hard blocker, and it is the reason the cutover
flow below has an extra hop:

pgloader 3.6.10 links `cl-postgres`, which has **no SNI support**. Neon's proxy
routes on the TLS SNI hostname, so it rejects the connection *before*
authentication:

```
FATAL ... Database error 28000: Endpoint ID is not specified.
Either please upgrade the postgres client library (libpq) for SNI support
or pass the endpoint ID ... '?options=endpoint%3D<endpoint-id>'
```

Neon's own documented workaround is unreachable from pgloader, because its URL
grammar accepts a **single** `?sslmode=<value>` parameter and nothing else.
Verified against 3.6.10 — every one of these dies in the parser before it ever
opens a socket:

| URL suffix | Result |
|---|---|
| `?options=endpoint%3Dep-x` | `ESRAP-PARSE-ERROR … #\= does not satisfy ALPHA-CHAR-P` |
| `?sslmode=require&options=endpoint%3Dep-x` | same parse error |
| `?sslmode=require&channel_binding=require` | same parse error |
| endpoint id smuggled into the password | parses, then still `28000` |

So: **pgloader writes to a local Postgres 17; `pg_dump`/`pg_restore` (libpq,
which does SNI and accepts the full multi-parameter URL) move the finished
database to Neon.** Dumping *after* the fixups means the triggers, the
`lower()` unique indexes, the restored CHECK constraints and the downcast types
all travel in the same dump — there is nothing to re-apply on the far side.

```
prod MariaDB ──ssh tunnel──▶ pgloader ──▶ staging Postgres 17 ──pg_dump -Fc──▶ pg_restore ──▶ Neon
                                              │
                                   fixups + validate.sh run HERE
                                   (then validate.sh again against Neon)
```

The staging Postgres can be the dev container; it just has to be PG 17 and
empty. `pg_dump`/`pg_restore` must be **17.x** (client ≥ server): use the ones
inside the container (`docker exec choice-postgres-dev pg_dump …`) or
`brew install libpq`.

### 1. Generate the cutover command file

Only the `FROM` line changes — `INTO` stays pointed at the staging Postgres.
Generating the file keeps prod credentials out of git.

**Do not use `sed` for this.** An unescaped `&` in a sed replacement expands to
the whole match, and both Neon URLs and generated passwords routinely contain
`&`; the old recipe spliced the two URLs into each other and produced a file
that either failed to parse or, with a different password, silently connected
somewhere unintended. This loop substitutes the URL literally:

```bash
set -euo pipefail
SOURCE_URL='mysql://USER:PASS@127.0.0.1:3307/choice_marketing'          # prod via ssh tunnel
STAGING_URL='postgresql://choice:choice@127.0.0.1:5433/choice_marketing' # = the checked-in INTO

while IFS= read -r line; do
  if   [[ $line =~ ^[[:space:]]*FROM[[:space:]]+mysql:// ]];      then printf '     FROM      %s\n' "$SOURCE_URL"
  elif [[ $line =~ ^[[:space:]]*INTO[[:space:]]+postgresql:// ]]; then printf '     INTO      %s\n' "$STAGING_URL"
  else printf '%s\n' "$line"
  fi
done < scripts/pg-migration/local-import.load > /tmp/cutover-import.load

diff scripts/pg-migration/local-import.load /tmp/cutover-import.load  # must show ONLY those lines
pgloader --dry-run /tmp/cutover-import.load        # parses + tests both connections
```

Verified with a password containing `&`, `|` and `$`: the loop reproduces it
byte for byte and touches nothing but the two lines. The old `sed` recipe, on the
same input, produced
`INTO postgresql://…?sslmode=require     INTO      postgresql://choice:choice@127.0.0.1:5433/choice_marketingchannel_binding=require`
— the local target spliced into the middle of the remote one.

### 2. Load, fix up, align sequences, validate — all against staging

Chained with `&&` on purpose: without it a failed pgloader run is followed by a
fixup run against whatever was already in the target.

```bash
set -euo pipefail
PSQL_STAGING="docker exec -i choice-postgres-dev psql -U choice -d choice_marketing"
MYSQL_PROD="mysql --host=127.0.0.1 --port=3307 --user=USER --password=PASS --default-character-set=utf8mb4 -N -B choice_marketing"

$PSQL_STAGING -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO choice;" \
  && pgloader /tmp/cutover-import.load \
  && docker cp scripts/pg-migration/post-import-fixups.sql choice-postgres-dev:/tmp/fixups.sql \
  && $PSQL_STAGING -v ON_ERROR_STOP=1 -f /tmp/fixups.sql \
  && MYSQL_CMD="$MYSQL_PROD" bash scripts/pg-migration/align-sequences.sh \
  && MYSQL_CMD="$MYSQL_PROD" bash scripts/pg-migration/validate.sh
```

`validate.sh` takes the **connection only** in `PSQL_CMD`/`MYSQL_CMD` — it adds
psql's `-tAF<tab> -v ON_ERROR_STOP=1` itself. (Passing `-tAF'\t'` by hand is a
literal backslash-t, not a tab, and makes every multi-column check fail as if
the data were wrong.)

### 3. Move it to Neon

```bash
set -euo pipefail
export NEON_URL="$DATABASE_URL_UNPOOLED"     # DIRECT endpoint, not -pooler

docker exec choice-postgres-dev pg_dump -U choice -d choice_marketing \
        --format=custom --no-owner --no-acl -f /tmp/cutover.dump \
  && docker cp choice-postgres-dev:/tmp/cutover.dump /tmp/cutover.dump \
  && psql "$NEON_URL" -v ON_ERROR_STOP=1 \
        -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' \
  && pg_restore --no-owner --no-acl --exit-on-error -d "$NEON_URL" /tmp/cutover.dump
```

Then run the acceptance gate **against Neon itself** — this is the run that
matters, the staging one is just an early warning:

```bash
MYSQL_CMD="$MYSQL_PROD" PSQL_CMD="psql \"$NEON_URL\"" \
  bash scripts/pg-migration/validate.sh
```

### Cutover-specific notes

- **Never point `FROM` at prod without a read-only path.** pgloader only reads,
  but reach prod through an ssh tunnel to the droplet (`ssh -L 3307:127.0.0.1:3306
  drewpayment@206.81.0.201`) rather than exposing 3306.
- **Neon's DIRECT (non-pooled) endpoint** for the restore, not the `-pooler` one:
  `pg_restore` issues DDL and session-level `SET`s that PgBouncer in transaction
  mode breaks. The app keeps using the pooled endpoint afterwards.
- **`WITH include drop` will drop and recreate every table in the target.** That
  is what makes the pipeline repeatable — and it is also why the cutover order is
  *freeze writes on MySQL → reload → validate → flip `DATABASE_URL`*, never
  reload-after-flip.
- **Re-run the preflight against prod.** MariaDB 10.6 vs the dev MySQL 8 container
  is the one place where the source schema could have drifted; the fixup script
  raises rather than guesses if its hard-coded column lists no longer match. Note
  MariaDB implements JSON columns as `LONGTEXT` + an auto-generated `json_valid`
  CHECK, so the CHECK-constraint count `validate.sh` reads from the source can
  legitimately differ from MySQL 8's — reconcile the list, do not paper over it.
- **Fresh migration ledger.** The imported `migrations` table is Laravel's MySQL
  history and is meaningless under Postgres. Per plan §2.2, generate a new
  Postgres baseline and start a new ledger for `bun run db:migrate`; do not
  replay the 15 MySQL DDL files.

### Align sequences with the source counters

`WITH reset sequences` sets every sequence to `max(id)`, not to MySQL's
`AUTO_INCREMENT` counter. Those differ wherever rows have been deleted — in the
2026-08 snapshot 7 tables are affected (`invoices` 271019 vs 271018, `paystubs`
724859 vs 724858, `expenses`, `payroll`, `invoice_audit`,
`feature_flag_overrides`, `scheduled_expense_applications`). Left alone,
Postgres re-issues ids MySQL already burned: an invoice created and deleted
before cutover leaves audit rows, emailed links and blob paths pointing at
`invoice_id 271018`, and a new unrelated invoice then takes that id.

`align-sequences.sh` reads the source counters and advances any sequence that is
behind them (it never moves a sequence backwards):

```bash
MYSQL_CMD="$MYSQL_PROD" bash scripts/pg-migration/align-sequences.sh
```

`validate.sh` check G reports any remaining gap as a `NOTE`; a sequence behind
`max(id)` is a hard `FAIL`.

---

## The schema decisions, and why

All of these are decided in `docs/postgres-migration-plan.md` §2. They are
implemented in `local-import.load` and `post-import-fixups.sql`; this is the
index.

### `tinyint` → `smallint`, never `boolean` — `local-import.load`

pgloader's default maps `tinyint(1)` to `boolean`. The app has ~90 sites across
three conventions: 33 strict `=== 1` reads (including every auth flag), 32
`? 1 : 0` writes, 25 `.where(flag,'=',1)` filters. A boolean column makes all of
them silently wrong — sign-in included. `drop typemod` also removes MySQL's
meaningless display widths.

`post-import-fixups.sql` asserts **zero boolean columns exist**. That assertion is
the real guard; the cast rule is just how we get there.

Converting these to real booleans is a separate later project (plan §3,
post-migration cleanup).

### `json` → `text` — `local-import.load`

The app hand-parses JSON strings (`PayrollRepository`, `ProductMarketingRepository`,
`InvoiceRepository`). Under `jsonb`, node-postgres auto-parses to objects and
`JSON.parse(object)` throws. Asserted: zero `json`/`jsonb` columns.

### `datetime` → `timestamp` (no time zone); `timestamp` → `timestamptz` — `local-import.load`

MySQL `DATETIME` is a naive wall-clock value; `TIMESTAMP` genuinely is
zone-aware (stored UTC). pgloader defaults *both* to `timestamptz`, which would
attach a zone to the 13 naive columns. So `datetime` is overridden and
`timestamp` keeps the default.

Zero-dates (`0000-00-00…`) become NULL on all three date-ish types. In the
2026-08 snapshot exactly one row is affected — `vendors.created_at` — and the
column is already nullable. **If a future source has a zero-date in a NOT NULL
column the import will fail loudly**, which is correct: that needs a decision,
not a default.

### ENUM (21 columns) → plain `text` — `post-import-fixups.sql` §1

pgloader creates one Postgres enum type per column. Both are dropped:

- `ALTER TYPE … ADD VALUE` cannot run inside a transaction block, so every future
  "add a status value" migration becomes a special case in the runner.
- Plain `text` keeps the app's TypeScript string-union types working verbatim.

Column DEFAULTs are preserved (evaluated to their text value, then re-applied as
string literals). The types are dropped afterwards, and the script asserts that
**zero enum-typed columns and zero enum types remain**. Value-domain enforcement
comes back as `CHECK` constraints in §6b (below) — plan §2.2 is "ENUM → text +
`CHECK`", and the `text` half without the `CHECK` half leaves the app's string
unions asserting something nothing enforces.

### `unsigned` integers (56 columns) → back to `integer` — `post-import-fixups.sql` §2

pgloader widens `int unsigned` and `bigint unsigned` to `bigint`, because
neither domain fits signed 32-bit. But kysely-codegen types Postgres `int8` as
`string`, which would retype 56 columns — nearly every primary key and foreign
key in the app — from `number` to `string`.

Each column is **range-asserted before** the `ALTER`: `max(col) ≤ 2147483647` and
`min(col) ≥ -2147483648`. A violation raises and rolls the whole fixup back. We
do not silently truncate keys on a payroll database.

Auto-increment survives: `DEFAULT nextval(...)` and the owned sequence are
untouched by the type change, and the sequence is narrowed to `AS integer
MAXVALUE 2147483647` so it can never hand out an unstorable value. Verified by
inserting into `manager_employees` inside a rolled-back transaction and checking
the id was auto-assigned (id 297 after max 296).

The 6 `bigint unsigned` columns are `company_options.id`, `jobs.id`,
`manager_employees.id`, `personal_access_tokens.id`, `personal_access_tokens
.tokenable_id`, `user_notifications.id`.

**Five columns stay `bigint`** — they are genuinely signed `BIGINT` in MySQL:
`document_files.file_size`, `invoice_audit.id`, `oauth_access_tokens.user_id`,
`oauth_auth_codes.user_id`, `oauth_clients.user_id`. `invoice_audit.id` is the
one that matters: kysely-codegen will type it `string`, and
`InvoiceAuditRepository` reads its insert id. Handle it in the `insertId` →
`.returning('id')` rewrite (plan §2.2).

### Case-insensitive unique indexes — `post-import-fixups.sql` §3

**Every** unique index in the source is case-insensitive: all of them sit on a
`_ci` collation (`utf8mb3_unicode_ci` or `utf8mb4_0900_ai_ci`). Postgres
`UNIQUE` is case-**sensitive**, so all 16 silently widen at import. Two are
restored with `lower()` expression indexes; the rest are a deliberate,
documented no-op.

| Source unique index | Column(s) | Under pg | Why |
|---|---|---|---|
| `vendors.uk_vendors_name` | `name` | **restored** as `uk_vendors_name_lower`, source index dropped | `VendorRepository.isNameAvailable` compares `LOWER(name)`. If the DB allowed `"Palmco"` + `"palmco"` while the app kept rejecting the second, the disagreement surfaces as a 500 on vendor create (plan §2.3 item 4). |
| `users.users_email_unique` | `email` | **restored** as `uk_users_email_lower`, source index **kept** | Every auth lookup normalises to `lower(trim(email))` (Phase 1 item A). Two rows differing only in case would leave one account unable to sign in *and* unable to self-serve a reset — the reset path gates on the same lookup (plan §2.3 item 1). The plain index is kept because `where email = <normalised>` is the hot lookup and an expression index cannot serve it. |
| `posts.posts_title_unique`, `posts.posts_slug_unique`, `job_postings.uk_job_postings_slug` | title/slug | left case-sensitive | Editorial content, entered once by an admin; a case-variant duplicate is a visible content bug, not a silent auth failure. |
| `feature_flags.name`, `vendor_field_definitions.uq_vendor_field`, `feature_flag_overrides.uq_flag_context` | config keys | left case-sensitive | Written by code with fixed literals, not by users. |
| `prices.stripe_price_id`, `products.stripe_product_id`, `subscribers.stripe_customer_id`, `subscriber_subscriptions.stripe_subscription_id`, `payment_history.stripe_invoice_id`, `email_delivery_events.uq_svix_id`, `personal_access_tokens.…_token_unique` | opaque vendor ids | left case-sensitive | These identifiers *are* case-sensitive at the vendor; MySQL's CI index was the accident. Case-sensitive is stricter and correct. |

Both restored indexes are pre-flighted with an explicit error listing the
colliding values, because `CREATE UNIQUE INDEX`'s own "Key … is duplicated" does
not tell a cutover operator what to do. On a collision a human must adjudicate
in the **source** database first (`scripts/merge-duplicate-vendors.ts` for
vendors; for users the two rows may be different people — plan §2.3 item 1).
Zero collisions in the 2026-08 snapshot for both.

**Migration 014** (`UPDATE … SET email = lower(trim(email))`, Phase 1 item B) is
a hard prerequisite of cutover, not a nice-to-have scheduled alongside it: it is
what keeps `uk_users_email_lower` creatable.

pgloader renames source indexes to `idx_<source-table-oid>_<original-name>`, so
imported names are **not stable across runs** (`idx_19142_uk_vendors_name` and
`idx_21284_uk_vendors_name` both observed). The script finds the vendors index
by shape (unique, non-primary, single plain column on `name`), not by name, and
§7 asserts it is really gone.

### `updated_at` maintenance (16 triggers) — `post-import-fixups.sql` §4

MySQL's `ON UPDATE CURRENT_TIMESTAMP` has no Postgres equivalent, and the app
does not consistently write `updated_at` itself. Without triggers these columns
freeze at their import values.

One function, `set_updated_at()`, parameterised by column name through
`TG_ARGV[0]` — the set is not uniform: `password_resets` stamps `created_at`,
not `updated_at`. It reads and rebuilds the row through `to_jsonb` /
`jsonb_populate_record`, which is how one generic function can write a column
chosen at trigger-creation time without an extension.

**Semantics deliberately match MySQL**: the timestamp is refreshed only when the
UPDATE did not assign the column itself. An explicit `SET updated_at = …` wins,
exactly as under `ON UPDATE CURRENT_TIMESTAMP`.

The 16 pairs (`extra LIKE '%on update%'` in the source `information_schema`):

```
advances.updated_at                       prices.updated_at
daily_pay_enrollments.updated_at          product_marketing.updated_at
daily_pay_settings.updated_at             products.updated_at
document_files.updated_at                 scheduled_expense_applications.updated_at
feature_flags.updated_at                  scheduled_expenses.updated_at
job_applications.updated_at               subscriber_subscriptions.updated_at
job_postings.updated_at                   subscribers.updated_at
password_resets.created_at                vendor_field_definitions.updated_at
```

The script raises if any of those tables/columns is missing (list gone stale)
and asserts exactly 16 triggers exist at the end.

### FULLTEXT indexes: intentionally NOT ported — `post-import-fixups.sql` §5

MySQL has 2 FULLTEXT indexes:

- `document_files.idx_search (name, description)`
- `invoice_audit.idx_customer_search (current_first_name, current_last_name, current_address, current_city)`

**Neither is used.** There is no `MATCH … AGAINST` anywhere in the application —
document and audit search go through `LIKE`/`ILIKE`. pgloader does not understand
FULLTEXT and reproduces both as multi-column **btrees**, which serve no query,
cost write throughput, and on `document_files.description` (`text`) risk btree
row-size errors on long values. The fixup script drops both stand-ins.

No `tsvector`/GIN replacement is created: nothing would use it. If full-text
search is ever wanted, add a generated `tsvector` column plus a GIN index as an
ordinary migration.

Both stand-ins are matched by their **key-column list**, not by name — pgloader's
`idx_<oid>_` prefix is unstable, and a name-only match would silently no-op on a
MariaDB run and leave both indexes on prod while the script still printed
`ALL ASSERTIONS PASSED`. §7 asserts neither shape survives.

### CHECK constraints (5) — `post-import-fixups.sql` §6

pgloader carries columns, indexes, primary keys and foreign keys. It does **not**
carry CHECK constraints: the source has 5, an unfixed target has 0.

| Source | Restored as | Note |
|---|---|---|
| `advances.chk_advances_amount_positive` `CHECK (amount > 0)` | same name | Hand-authored in `src/lib/database/migrations/010_advances_scheduled_expenses_audit.sql` and applied to prod. `advances` feed payroll totals, so without it a negative advance from a bug or a bad payload propagates into paystub math with no DB-level backstop that exists on MySQL today. Verified: on an unfixed target, `INSERT INTO advances (…, amount, …) VALUES (…, -500.00, …)` succeeds. |
| `document_files.tags`, `document_files.metadata`, `invoices.custom_fields`, `product_marketing.feature_list` — `CHECK (json_valid(col))` | `chk_<table>_<column>_json`, `CHECK (col IS NULL OR col IS JSON)` | These are MariaDB's implementation of a JSON column (JSON = `LONGTEXT` + an auto-generated `json_valid` CHECK). We deliberately keep them as `text`, which is exactly why the validity check has to come back explicitly — otherwise they are free-text and the app's `JSON.parse` sites are the only thing between a malformed write and a broken read. Phase 1 item E made those sites degrade gracefully; this keeps the bad value out in the first place. |

`IS JSON` is the SQL/JSON predicate built into PostgreSQL 16+; it accepts the
same value set as MySQL's `json_valid()`, including top-level scalars. NULL is
allowed by every predicate, matching `json_valid(NULL) → NULL`. On PG 15 and
older the script falls back to a cast probe and says so in a NOTICE.

Adding a constraint validates the existing rows, so a source row that violates
one aborts the whole fixup transaction — loudly, which is what we want. Zero
violations in the 2026-08 snapshot (0 invalid JSON in 298 non-null
`invoices.custom_fields`, 0 non-positive advances).

### Ex-ENUM value domains (21 columns) — `post-import-fixups.sql` §6b

§1 turns every MySQL ENUM into plain `text`, which drops the only thing that made
the app's string-union types true. §6b restores the domain as a
`CHECK (col IS NULL OR col IN (…))` per column, named `chk_<table>_<column>_enum`
— the second half of plan §2.2's "ENUM columns → `text` + `CHECK`".

Why it matters concretely: MySQL in strict mode **rejected**
`subscribers.status = 'Active'`; bare `text` accepts it.
`SubscriberRepository.updateSubscriber` spreads its input straight into `.set()`,
so any caller that bypasses Zod — a backfill, a hand-written cutover fix, a new
route — can write a value that no read ever matches again
(`getAllSubscribers({status:'active'})` compares with `=`, case-sensitive under
pg). The row does not error; it silently vanishes from every admin list filter.
The repositories assert these unions with Kysely `$narrowType<…>()`, which is
compile-time only, so nothing downstream branches defensively. The same exposure
applies to `products.type`, `prices.interval`, `product_marketing.category`, the
six `job_postings` enums, `job_applications.status`, `users.role`,
`feature_flag_overrides.context_type` and the audit `action_type` columns.

The 21 triples are exactly the source ENUM definitions. Regenerate with:

```sql
SELECT table_name, column_name, column_type FROM information_schema.columns
WHERE table_schema='choice_marketing' AND data_type='enum' ORDER BY 1,2;
```

NULL satisfies a CHECK by definition, matching a nullable MySQL ENUM
(`document_files.status`/`.storage_type`, `job_postings.salary_type`,
`user_impersonation_log.end_reason` are the four nullable ones). The comparison
is **case-sensitive**, which is stricter than MySQL — `'ACTIVE'` used to be
accepted and folded to `'active'` by the column's `_ci` collation; now it is
rejected at the write instead of read back as a value the app never matches.

Adding a constraint validates the existing rows, so an out-of-domain value aborts
the whole fixup transaction. Zero violations in the 2026-08 snapshot: all 29
distinct live values across the 21 columns are in-domain. §6b asserts it
accounted for exactly 21.

### Stripe identifier columns → `NOT NULL` — `post-import-fixups.sql` §6c

`products.stripe_product_id`, `prices.stripe_price_id`,
`subscribers.stripe_customer_id`, `subscriber_subscriptions.stripe_subscription_id`
and `payment_history.stripe_invoice_id` are all `NULL: YES` in the source, so the
import is faithful — but the app has always treated them as required. Each has
exactly one insert path (`ProductRepository.createProduct`/`.createPrice`,
`SubscriberRepository.createSubscriber`, `BillingRepository.createSubscription`/
`.createPaymentRecord`) and each takes the id as a non-optional argument; the
pre-migration hand-maintained `types.ts` declared them non-null.

After codegen that invariant survives only as `$narrowType<{…: NotNull}>()` at 9
read sites — a compile-time assertion with nothing behind it. A webhook race or a
partial import that left one NULL would hand a consumer a `null` where TypeScript
promises `string`, surfacing as a runtime throw inside a Stripe SDK call rather
than a type error. §6c makes the database enforce it.

Zero NULLs in all five columns in the 2026-08 snapshot; the script re-counts
before each `ALTER` and raises with the offending table/column and row count
rather than letting `SET NOT NULL`'s own error stand alone. Once kysely-codegen
is re-run against a fixed-up database, the 9 `NotNull` narrowings in
`ProductRepository`, `SubscriberRepository`, `BillingRepository` and
`ProductMarketingRepository` become redundant and can be deleted.

### latin1 tables

`document_files` and `invoice_audit` are `latin1_swedish_ci`; the other 58 are
`utf8mb3`/`utf8mb4`. pgloader reads through the MySQL client protocol with a
UTF-8 connection charset, so the **server** transcodes latin1 → UTF-8 and no
mojibake is introduced.

Verified two ways on the 2026-08 snapshot:

1. Row-by-row MD5 over every text column of both tables — **all 18 + all 3 161
   row hashes identical** between MySQL and Postgres.
2. `validate.sh` check D compares, per table, the total character count *and*
   the total UTF-8 byte count of all string columns across all 49 tables with
   string data. Mojibake changes the byte count even when the character count
   survives; double-encoding changes both. All 49 match.

**Caveat for cutover:** both latin1 tables currently contain **zero non-ASCII
bytes**, so the transcoding path is exercised by the mechanism but not by the
data. Re-run this before the prod import — if it returns a non-zero count,
inspect those rows by hand in the target after the load:

```sql
SELECT COUNT(*) FROM document_files
 WHERE LENGTH(CONCAT_WS('|', name, IFNULL(description,''), original_filename,
                        blob_url, blob_pathname, IFNULL(download_url,''),
                        mime_type, uploaded_by, IFNULL(upload_ip,''),
                        IFNULL(tags,''), IFNULL(metadata,'')))
    <> CHAR_LENGTH(CONCAT_WS('|', name, IFNULL(description,''), original_filename,
                        blob_url, blob_pathname, IFNULL(download_url,''),
                        mime_type, uploaded_by, IFNULL(upload_ip,''),
                        IFNULL(tags,''), IFNULL(metadata,'')));
-- same shape for invoice_audit's text columns
```

---

## What `validate.sh` proves

Run against the 2026-08 local snapshot, everything below passed.

| Check | Scope | Result |
|---|---|---|
| A row counts | all 60 base tables | identical |
| B numeric min/max/**SUM**/nulls | all 225 int/tinyint/decimal columns | identical |
| C date min/max/nulls | all 141 date/datetime/timestamp columns | identical except the 1 intended zero-date→NULL (`vendors.created_at`) |
| D string char-count + **byte**-count | all 49 tables with string columns | identical (no mojibake, no truncation) |
| E payroll money, plan §4 shape | paystubs 14 083 groups, invoices 13 827, overrides 4 782, expenses 6 689, advances 2 | identical to the cent |
| E `lower(email)` collisions | `users` | empty on both, as required |
| F DECIMAL precision/scale | all 25 columns | identical, e.g. `paystubs.amount numeric(19,4)` |
| F schema shape | 0 boolean, 0 json/jsonb, 0 enum types, both ci-unique indexes present, and — compared against counts read from the **source**, not hard-coded — 5 signed bigints, 16 `updated_at` triggers, 5 CHECK constraints | as designed |
| G sequences | every auto-increment column (51 — the source's 51 `AUTO_INCREMENT` columns, one for one) | next value > `max(id)` everywhere; equal to the source `AUTO_INCREMENT` after `align-sequences.sh`. Two of them (`jobs`, `tagging_tag_groups`) report a NULL counter in the source because they are empty, so there is nothing to align. |

Every line above is an assertion. Check F used to *print* its schema-shape
numbers without comparing them and check G's `DO` block could raise without psql
returning non-zero — a target with `boolean` flag columns, missing triggers and a
rewound `paystubs` sequence still printed `VALIDATION PASSED`. Both are now
compared and both feed the exit code; re-proven by fault injection (see
"Fault-injection self-test").

Check G is **read-only**: it derives the next value from the sequence relation
(`last_value`/`is_called`) instead of calling `nextval()`, so it cannot leave
sequences shifted the way the earlier probe-and-reset version could.

### Fault-injection self-test

The gate is only worth what it catches. To re-prove it after changing
`validate.sh`, break the target on purpose and confirm a non-zero exit:

```bash
docker exec choice-postgres-dev psql -U choice -d choice_marketing -c "
  ALTER TABLE employees ADD COLUMN zz_fault_bool boolean;
  DROP TRIGGER trg_set_updated_at ON subscribers;
  SELECT setval('paystubs_id_seq', 100, true);
  ALTER TABLE advances DROP CONSTRAINT chk_advances_amount_positive;"
bash scripts/pg-migration/validate.sh; echo "exit=$?"     # must be non-zero
```

Then re-run the fixups (they restore the trigger and the constraint), drop the
fault column, and re-run `align-sequences.sh` to put `paystubs_id_seq` back.

`invoices.amount` is a `varchar(255)` that also stores status strings (`"NA"`,
`"Account Blocked"`, …) — 1 364 of 161 982 rows. Check E sums only the fully
numeric rows on **both** sides and compares the non-numeric row count separately,
rather than relying on MySQL's silent string→number coercion. Numeric total:
`4,835,317.88` on both.

---

## Troubleshooting

**pgloader parse errors on a cast rule.** 3.6's grammar is narrower than the
docs suggest: `when default '…' and not null` does not parse (only a single
guard), and `SET MySQL PARAMETERS` cannot emit a quoted value. `pgloader
--dry-run <file>` parses the file and tests both connections without moving data
— use it after every edit.

**`ERROR: column "x" does not exist` while validating.** Column names differ
between the MySQL-era table definitions (`overrides.vendor_id` not `vendor`,
`advances.agentid` not `agent_id`). The pg side is authoritative; check
`\d <table>`.

**Fixups raise "the unsigned-column list is stale" / "the updated_at trigger list
is stale".** The source schema changed. Regenerate the list with the query in the
comment above the failing block and update the script — do not delete the entry.

**Import looks fine but the app misbehaves on flags.** Check `data_type='boolean'`
is still 0. The fixup script asserts it, so this means fixups were skipped.

**`validate.sh` fails every multi-column check at once.** Almost always the field
separator, not the data. Pass the **connection only** in `PSQL_CMD` /
`MYSQL_CMD`; the script appends `-tAF<tab> -v ON_ERROR_STOP=1` itself. A
hand-written `-tAF'\t'` is a literal backslash-t inside single quotes and turns a
clean run into a 60-line row-count diff.

**pgloader dies with `ESRAP-PARSE-ERROR … ALPHA-CHAR-P` on the target URL.** Its
URL grammar accepts at most one `?sslmode=<value>` parameter. That is why the
cutover goes through a local Postgres and `pg_dump`/`pg_restore` rather than
pointing pgloader at Neon — see "Cutover run".

**`align-sequences.sh` raises "no owned sequence in the target".** The source
table has an AUTO_INCREMENT column that did not come across as a
`DEFAULT nextval(...)`. Do not skip it: an id column without a sequence takes
NULL/duplicate values on the first app insert.
