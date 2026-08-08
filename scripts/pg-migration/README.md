# MariaDB → PostgreSQL import pipeline

Phase 2 of `docs/postgres-migration-plan.md`. Two files that do the import, one
that finishes the job against the source counters, and one that proves the
result — run in that order:

| File | What it does |
|---|---|
| `local-import.load` | pgloader command file. Full schema + data reload, with the cast rules the app requires. Holds the only copy of the connection strings. |
| `post-import-fixups.sql` | Idempotent psql script. Everything pgloader cannot express, plus everything it expresses **wrongly**: ENUM→text, unsigned downcast, ci-unique indexes, `updated_at` triggers, undoing pgloader's own `ON UPDATE` handling (§4a), restored CHECK constraints, dropping un-ported FULLTEXT stand-ins. Ends in assertions. |
| `align-sequences.sh` | Advances each sequence to the source `AUTO_INCREMENT` counter (pgloader only resets to `max(id)`, so deleted ids would be re-issued). Forward-only and idempotent. |
| `validate.sh` | Reconciles source vs target: row counts, numeric SUMs, date ranges, string byte-fidelity, the §4 payroll money diff, schema shape, sequences. Every check is an assertion; exits non-zero on any mismatch. |

The last two take **both** connections as required environment variables
(`MYSQL_CMD`, `PSQL_CMD`) and abort if either is missing or empty — they have no
defaults on purpose. See "Why the scripts refuse to default".

The runbook is `Local run` for a dev rebuild, and `Cutover run` §1→§4 for the
real thing. **§3 ends with a green gate but the app is still on MySQL — §4 is
what moves it.**

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

For the **cutover** you additionally need `psql` and `pg_restore` on the machine
that talks to Neon (`brew install libpq`), because pgloader cannot connect to
Neon at all — see "Cutover run".

Two things about that install that will bite you at 11pm (verified 2026-08):

```bash
brew install libpq
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # REQUIRED — libpq is keg-only,
                                                  # nothing lands on PATH and the
                                                  # bare `psql`/`pg_restore` calls
                                                  # below fail "command not found"
psql --version                                    # PostgreSQL 18.4 as of 2026-08
```

`brew install libpq` no longer gives you 17.x — it tracks the newest major (18.4
today). That is fine for the **restore** half (a newer `pg_restore` reads a 17
archive), but it means **`pg_dump` must be the container's 17.10 one**
(`docker exec choice-postgres-dev pg_dump …`, as §3 below does) and never the
host's: an 18.x `pg_dump` emits an archive whose SQL a 17.x Neon server can
reject. Check the server first — `psql "$NEON_URL" -tAc 'select version()'` —
and keep dump-side ≤ server major.

You also need a **MySQL client** for `align-sequences.sh` / `validate.sh`, which
read the source counters and reconcile against it. This machine has none on the
host: either `brew install mysql-client` (also keg-only — same PATH export, under
`/opt/homebrew/opt/mysql-client/bin`) or drive it through
`docker exec -i <container> mysql …`, which is what the `MYSQL_CMD` values in
"Local run" below do.

---

## Local run

Source: `choice-mysql-dev` (127.0.0.1:3306, root/rootpassword, `choice_marketing`)
— a prod snapshot, treated as **read-only**.
Target: `choice-postgres-dev` (127.0.0.1:5433, choice/choice, `choice_marketing`,
PostgreSQL 17) — disposable.

`align-sequences.sh` and `validate.sh` take **both** connections as required
environment variables — they have no defaults, deliberately (see "Why the
scripts refuse to default" below). Export them once for the whole local run:

```bash
cd /path/to/choice-marketing-partners

export MYSQL_CMD='docker exec -i choice-mysql-dev mysql --default-character-set=utf8mb4 -uroot -prootpassword -N -B choice_marketing'
export PSQL_CMD='docker exec -i choice-postgres-dev psql -U choice -d choice_marketing'

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
#    (uses the exported MYSQL_CMD / PSQL_CMD above)
bash scripts/pg-migration/align-sequences.sh

# 5. Prove it. Must print "VALIDATION PASSED".
bash scripts/pg-migration/validate.sh
```

Steps 3 and 4 are safe to re-run on their own (every step is a no-op once
satisfied), so you can iterate on the fixups without re-importing.

### Why the scripts refuse to default

Neither `align-sequences.sh` nor `validate.sh` has a default `MYSQL_CMD` or
`PSQL_CMD` any more. Both abort with
`PSQL_CMD is required` if you forget one. They used to default to the local dev
containers, and both failure modes are silent rather than loud:

- `align-sequences.sh` **writes** (`setval`). A forgotten `PSQL_CMD` sent those
  writes to `choice_marketing` — the verified local import that is your only
  side-by-side reference — while leaving the database you actually loaded
  unaligned.
- `validate.sh` compared whatever the defaults named and printed
  `VALIDATION PASSED` for a pair of databases nobody asked about.

`MYSQL_DB` (the schema whose `information_schema` drives the generated checks)
now defaults to whatever the connection itself selected — `SELECT DATABASE()` —
so it cannot drift away from `MYSQL_CMD`. Override it only if prod's schema name
genuinely differs from the one in the connection string. `validate.sh` also
aborts if that schema reports **zero base tables**: the generated checks would
otherwise produce empty result sets on both sides, diff clean, and report PASS.

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

# (b) Every latin1 table must be checked for non-ASCII bytes. See
#     "latin1 tables" below for why. Do NOT hand-write the column list OR the
#     table list — both go stale silently: the dev snapshot has 2 latin1 tables,
#     prod has 10 (job_applications, job_postings, payroll_audit,
#     user_impersonation_log and the four _bak_2926_* as well), so select them
#     by `table_collation`, not by name. Generate the check from
#     information_schema and pipe it
#     straight back in; every count must be 0. No hand editing: each generated
#     line is a COMPLETE statement ending in ";", so there is no trailing
#     "UNION ALL" to delete at 11pm.
myq() { docker exec -i choice-mysql-dev mysql -uroot -prootpassword -N -B choice_marketing; }
myq <<'SQL' | myq
-- group_concat_max_len defaults to 1024 BYTES on MySQL 8 and MariaDB 10.6, and
-- overflowing it TRUNCATES with a warning and exit 0 — it would silently emit a
-- check covering fewer columns than intended. invoice_audit is already at 404
-- bytes and grows in previous_/current_ column PAIRS, so this is a question of
-- when, not whether. Raising the ceiling removes it entirely.
SET SESSION group_concat_max_len = 1000000;
SELECT CONCAT('SELECT ''', table_name, ''' t, COUNT(*) n FROM `', table_name, '` WHERE LENGTH(CONCAT_WS(''|'',',
       GROUP_CONCAT(CONCAT('IFNULL(`',column_name,'`,'''')') ORDER BY ordinal_position SEPARATOR ','),
       ')) <> CHAR_LENGTH(CONCAT_WS(''|'',',
       GROUP_CONCAT(CONCAT('IFNULL(`',column_name,'`,'''')') ORDER BY ordinal_position SEPARATOR ','),
       '));')
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema=c.table_schema AND t.table_name=c.table_name
   AND t.table_type='BASE TABLE'
 WHERE c.table_schema=DATABASE() AND t.table_collation LIKE 'latin1%'
   AND c.data_type IN ('varchar','text','mediumtext','longtext','char','tinytext')
 GROUP BY c.table_name;
SQL
#     Expect exactly one line per latin1 table; every n must be 0. No output at
#     all means the generator matched no columns — investigate, do not proceed.
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
empty. **Use a separate database inside it, not `choice_marketing`** — step 2
opens with `DROP SCHEMA public CASCADE`, and `choice_marketing` holds the
verified local import that is your only side-by-side reference if the cutover
load looks wrong. Everything below therefore parameterises the staging database
name in one place:

```bash
export STAGING_DB=choice_cutover     # export, not a bare assignment - see below
docker exec choice-postgres-dev psql -U choice -d postgres \
  -c "DROP DATABASE IF EXISTS ${STAGING_DB};" -c "CREATE DATABASE ${STAGING_DB} OWNER choice;"
```

**`export` it, and keep the same shell.** Every later block references
`${STAGING_DB}` under `set -u`, with **no** `:-choice_cutover` fallback, so an
unset variable stops the run immediately. That is on purpose. Earlier revisions
re-defaulted it in each block, which meant a new terminal opened halfway through
a multi-hour cutover silently reverted to `choice_cutover` — and because a
previous rehearsal leaves a fully populated `choice_cutover` behind, §3's
`pg_dump` would then **succeed** and ship the *previous* run's data to Neon,
with `validate.sh` comparing it against a source it happens to match and staying
green. If you do open a new shell, re-`export STAGING_DB` before anything else.

**Drop the staging database when the run is over** (`docker exec
choice-postgres-dev psql -U choice -d postgres -c "DROP DATABASE IF EXISTS
choice_cutover;"`), so a stale copy can never be mistaken for a fresh one.

`pg_dump` must be **≤ the Neon server major** (17.x): use the one inside the
container (`docker exec choice-postgres-dev pg_dump …`). `pg_restore`/`psql` on
the host may be newer — see Prerequisites.

### 1. Generate the cutover command file

**THREE lines change, not two.** `FROM` and `INTO` are the obvious pair, but the
load file ends with

```
  ALTER SCHEMA 'choice_marketing' RENAME TO 'public'
```

and pgloader names the target schema after the **source database**. Prod's
schema is `choice`, not `choice_marketing`, so on a prod-source run that line
renames a schema that does not exist. pgloader fails the whole load with
`Schema "choice_marketing" does not exist`; had it not, every table would have
been left in a `choice` schema that is not on the app's `search_path` and the
fixups' §0 guard (`public.employees` missing) would have caught it one step
later. Either way the run stops — but only if you remember the third line.

Generating the file keeps prod credentials out of git.

**Do not use `sed` for this.** An unescaped `&` in a sed replacement expands to
the whole match, and both Neon URLs and generated passwords routinely contain
`&`; the old recipe spliced the two URLs into each other and produced a file
that either failed to parse or, with a different password, silently connected
somewhere unintended. This loop substitutes each line literally:

```bash
set -euo pipefail
: "${STAGING_DB:?export STAGING_DB first - see 'Cutover run' above}"
SOURCE_SCHEMA='choice'                                                  # prod's database name
SOURCE_URL="mysql://USER:PASS@127.0.0.1:3307/${SOURCE_SCHEMA}"          # prod via ssh tunnel
STAGING_URL="postgresql://choice:choice@127.0.0.1:5433/${STAGING_DB}"   # NOT choice_marketing

while IFS= read -r line; do
  if   [[ $line =~ ^[[:space:]]*FROM[[:space:]]+mysql:// ]];      then printf '     FROM      %s\n' "$SOURCE_URL"
  elif [[ $line =~ ^[[:space:]]*INTO[[:space:]]+postgresql:// ]]; then printf '     INTO      %s\n' "$STAGING_URL"
  elif [[ $line =~ ^[[:space:]]*ALTER[[:space:]]+SCHEMA[[:space:]]+\' ]]; then
       printf "  ALTER SCHEMA '%s' RENAME TO 'public'\n" "$SOURCE_SCHEMA"
  else printf '%s\n' "$line"
  fi
done < scripts/pg-migration/local-import.load > /tmp/cutover-import.load

diff scripts/pg-migration/local-import.load /tmp/cutover-import.load  # must show ONLY those 3 lines
pgloader --dry-run /tmp/cutover-import.load        # parses + tests both connections
```

Take the password from the `DATABASE_URL` line of `.env.production` (parse it,
do not retype it) and keep it out of the terminal: build `SOURCE_URL` by
expanding a variable, never by echoing the URL. The 2026-08 prod password is
alphanumeric, so it needs no percent-encoding — re-check that before assuming
it, because pgloader's URL grammar will not accept a raw `@`, `:` or `/` in the
password field.

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
: "${STAGING_DB:?export STAGING_DB first - see 'Cutover run' above}"
# export these two: §3's acceptance gate needs MYSQL_PROD, and a bare assignment
# would not survive into it.
export PSQL_STAGING="docker exec -i choice-postgres-dev psql -U choice -d ${STAGING_DB}"
#   ^ note the database is `choice` - prod's schema name, NOT choice_marketing.
#     validate.sh derives MYSQL_DB from SELECT DATABASE() on this connection, so
#     naming the dev schema here aborts the gate rather than comparing anything.
export MYSQL_PROD="mysql --host=127.0.0.1 --port=3307 --user=USER --password=PASS --default-character-set=utf8mb4 -N -B choice"
export CUTOVER_RUN_ID="cutover-$(date -u +%Y%m%dT%H%M%SZ)"    # freshness marker, checked in §3

$PSQL_STAGING -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO choice;" \
  && pgloader /tmp/cutover-import.load \
  && docker cp scripts/pg-migration/post-import-fixups.sql choice-postgres-dev:/tmp/fixups.sql \
  && $PSQL_STAGING -v ON_ERROR_STOP=1 -f /tmp/fixups.sql \
  && MYSQL_CMD="$MYSQL_PROD" PSQL_CMD="$PSQL_STAGING" bash scripts/pg-migration/align-sequences.sh \
  && MYSQL_CMD="$MYSQL_PROD" PSQL_CMD="$PSQL_STAGING" bash scripts/pg-migration/validate.sh \
  && $PSQL_STAGING -v ON_ERROR_STOP=1 \
       -c "COMMENT ON SCHEMA public IS '${CUTOVER_RUN_ID}';"
```

The closing `COMMENT ON SCHEMA public` is the **freshness marker** §3 checks
before it dumps. It is written only if everything above it succeeded, and §2's
opening `DROP SCHEMA public CASCADE` removes any previous one, so its presence
means "this staging database was loaded and validated by *this* run". `pg_dump`
carries the comment, so after the restore you can ask Neon which run produced
the data that is live:

```bash
psql "$NEON_URL" -tAc "SELECT obj_description('public'::regnamespace, 'pg_namespace');"
```

**`PSQL_CMD` is not optional here** — and as of the 2026-08 revision the scripts
enforce that themselves: both abort with `PSQL_CMD is required` /
`MYSQL_CMD is required` rather than falling back to the dev containers. They used
to default, and passing only `MYSQL_CMD` — as an earlier version of this recipe
did — silently aligned (i.e. **wrote** `setval` to) and validated the *previous*
local import instead of the cutover staging database, printing
`VALIDATION PASSED` for a target you never loaded.

You do **not** need to set `MYSQL_DB`: it is derived from `SELECT DATABASE()` on
the `MYSQL_CMD` connection. Set it only if prod's schema name differs from the
database named in the connection string, and note `validate.sh` aborts if the
resolved schema reports zero base tables.

`validate.sh` takes the **connection only** in `PSQL_CMD`/`MYSQL_CMD` — it adds
psql's `-tAF<tab> -v ON_ERROR_STOP=1` itself. (Passing `-tAF'\t'` by hand is a
literal backslash-t, not a tab, and makes every multi-column check fail as if
the data were wrong.)

### 3. Move it to Neon

```bash
set -euo pipefail
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
: "${STAGING_DB:?export STAGING_DB first - see 'Cutover run' above}"
: "${CUTOVER_RUN_ID:?CUTOVER_RUN_ID is unset - it is set in §2; do not carry on in a new shell}"

# The DIRECT (non-pooler) endpoint. The exact variable name depends on how the
# env was pulled: `vercel env pull` on this project writes NEON_DATABASE_URL_UNPOOLED
# (there is also NEON_POSTGRES_URL_NON_POOLING); a hand-written .env may use
# DATABASE_URL_UNPOOLED. Resolve it explicitly and REFUSE TO PROCEED if it is
# empty — an empty "$NEON_URL" makes psql fall back to the local default
# connection, and the next line is DROP SCHEMA public CASCADE.
export NEON_URL="${NEON_DATABASE_URL_UNPOOLED:-${DATABASE_URL_UNPOOLED:-}}"
[ -n "$NEON_URL" ] || { echo "NEON_URL is empty - refusing to run DDL"; exit 1; }
case "$NEON_URL" in *-pooler*) echo "that is the POOLED endpoint - use the direct one"; exit 1;; esac
psql "$NEON_URL" -tAc 'select current_database(), version()'   # eyeball it before the DROP

# Refuse to ship a staging database this run did not load. A previous rehearsal
# leaves a fully populated choice_cutover behind, and pg_dump would happily
# succeed against it.
stamp=$(docker exec -i choice-postgres-dev psql -U choice -d "${STAGING_DB}" \
          -tAc "SELECT coalesce(obj_description('public'::regnamespace,'pg_namespace'),'')")
[ "$stamp" = "$CUTOVER_RUN_ID" ] || {
  echo "staging ${STAGING_DB} is stamped [${stamp}], expected [${CUTOVER_RUN_ID}] - re-run §2"; exit 1; }

docker exec choice-postgres-dev pg_dump -U choice -d "${STAGING_DB}" \
        --format=custom --no-owner --no-acl -f /tmp/cutover.dump \
  && docker cp choice-postgres-dev:/tmp/cutover.dump /tmp/cutover.dump \
  && psql "$NEON_URL" -v ON_ERROR_STOP=1 \
        -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' \
  && pg_restore --no-owner --no-acl --exit-on-error --single-transaction \
        -d "$NEON_URL" /tmp/cutover.dump \
  && psql "$NEON_URL" -v ON_ERROR_STOP=1 -c 'ANALYZE;'
```

**`--single-transaction` is what keeps a failed restore from leaving a
half-populated production database.** The restore is ~30 s of network round
trips; without it, a mid-flight failure (dropped Wi-Fi, a Neon compute
suspend/resume, an unexpected object conflict) leaves some tables loaded, some
empty, no FKs, and no automatic rollback — and because the chain is `&&`-joined,
the trailing `ANALYZE` is skipped too, so even a hand-completed restore ships
with no planner statistics. With it, Neon either has the whole database or the
empty schema you created one line earlier. (It composes with `--exit-on-error`;
it is incompatible with parallel `-j`, which this restore does not use.)

**If any step of that chain fails anyway, re-run the whole block from the
`DROP SCHEMA IF EXISTS public CASCADE` line.** The restore is idempotent only
via a full schema reset — never re-run `pg_restore` on top of a partial one. It
costs ~30 s, which is inside any sane cutover window. If the failure was in
`pg_dump` or `docker cp`, go back to §2 instead: the archive is the artefact, so
regenerate it rather than reusing a truncated file.

The trailing `ANALYZE` is not optional. `pg_restore` from a 17.x archive carries
no planner statistics, so straight after the restore 54 of the 69 relations have
never been analysed and the first real traffic plans every join off default
estimates. It costs ~1 s; autovacuum would otherwise get there minutes later,
which is exactly the window where everyone is watching.

Then run the acceptance gate **against Neon itself** — this is the run that
matters, the staging one is just an early warning. It is a **self-contained
block on purpose**: it re-resolves and re-guards both connections instead of
inheriting them, because the two variables it needs are the two that go missing.
`validate.sh` reads `${MYSQL_CMD:-…}`-style inputs no longer, but an empty
`MYSQL_CMD` exported from a dead shell used to substitute the *local dev
container* and pass, and `PSQL_CMD="psql \"$NEON_URL\""` with an unset
`NEON_URL` is the non-empty string `psql ""`, which quietly honours `PGHOST` /
`PGDATABASE` and connects to something local:

```bash
set -euo pipefail
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

# same resolution + guards as the block above - do not assume they are still set
export NEON_URL="${NEON_DATABASE_URL_UNPOOLED:-${DATABASE_URL_UNPOOLED:-}}"
[ -n "$NEON_URL" ] || { echo "NEON_URL is empty - refusing to validate"; exit 1; }
case "$NEON_URL" in *-pooler*) echo "that is the POOLED endpoint - use the direct one"; exit 1;; esac

# prod source, spelled out again rather than inherited (schema is `choice`)
MYSQL_PROD="mysql --host=127.0.0.1 --port=3307 --user=USER --password=PASS --default-character-set=utf8mb4 -N -B choice"
[ -n "$MYSQL_PROD" ] || { echo "MYSQL_PROD is empty - refusing to validate"; exit 1; }

MYSQL_CMD="$MYSQL_PROD" PSQL_CMD="psql \"$NEON_URL\"" \
  bash scripts/pg-migration/validate.sh
```

Read the first line of its output — `source schema <name>: <n> base tables` —
and confirm the name and count are prod's. That line exists because a gate
pointed at the wrong source is the one failure this gate cannot otherwise
detect: it compares two databases that agree with each other and prints
`VALIDATION PASSED`. This was reproduced: with `MYSQL_PROD` undefined, the old
one-line gate exited 0 having compared **Neon against the local dev snapshot**.

### 4. Flip the app to Neon

**`VALIDATION PASSED` in §3 does not mean the cutover is done.** At that point
Neon holds a correct copy of the data and **100 % of application traffic is
still on MySQL**: `src/lib/database/client.ts` reads one variable,
`process.env.DATABASE_URL`, and until you change it that variable still names
the prod MariaDB. This is the step that actually moves the app.

Use the **POOLED** endpoint here — `NEON_DATABASE_URL` (the hostname containing
`-pooler`), *not* the direct/unpooled one §3 restored through. The direct
endpoint's compute has `max_connections = 112` (measured); serverless functions
open connections per instance and will exhaust it. The direct endpoint is for
admin work only: `pg_dump`, `pg_restore`, `psql` by hand.

```bash
# 1. Set it for each environment that should move. `vercel env add` reads the
#    value from stdin, so the URL never lands in shell history.
printf '%s' "$NEON_DATABASE_URL" | vercel env add DATABASE_URL production
printf '%s' "$NEON_DATABASE_URL" | vercel env add DATABASE_URL preview
#    (remove the old value first if one exists: `vercel env rm DATABASE_URL production`)

# 2. Redeploy. Environment variables are baked in at build/boot - an existing
#    deployment keeps talking to MySQL until it is replaced.
vercel --prod

# 3. Confirm the endpoint you just configured is the right server holding the
#    right data. Note `inet_server_addr()` is useless here — through the pooler
#    it reports PgBouncer's own loopback (`::1/128`), not the compute. Use the
#    engine banner, the database name, and the run stamp §2 wrote:
psql "$NEON_DATABASE_URL" -tA -F'|' -c \
  "SELECT version(), current_database(), obj_description('public'::regnamespace,'pg_namespace');"
#    -> PostgreSQL 17.x ... | neondb | cutover-<the CUTOVER_RUN_ID from §2 of THIS run>
```

Then verify from the **running app**, not from your laptop — that is the only
thing that proves `DATABASE_URL` actually changed for the deployed code:

- sign in (auth is the first thing to touch the database) and load a payroll
  page that reads real rows;
- check the deployment's runtime logs for MySQL connection errors — an old
  deployment still holding the MariaDB URL fails here, and nowhere else;
- confirm a **write** lands on Neon (create and delete a throwaway record, then
  count it through `psql "$NEON_DATABASE_URL"`). A read-only check cannot
  distinguish "app is on Neon" from "app is on a MySQL replica that looks the
  same".

Order matters, and it is the order in "Cutover-specific notes" below: freeze
writes on MySQL → §1–§3 → flip `DATABASE_URL` → redeploy. Never reload after the
flip. Keep the MariaDB running and untouched until you are ready to give up the
rollback — reverting is putting the old `DATABASE_URL` back and redeploying,
which is only true while nothing has written to Neon that MySQL does not have.

### Measured timings (2026-08 rehearsal: local snapshot → staging → Neon)

Full dress rehearsal of this section, 60 tables / 303 769 rows / 31.6 MB, Neon in
`us-east-1` from a laptop on residential broadband:

| Stage | Wall clock (three runs) |
|---|---|
| `DROP SCHEMA` + `pgloader` into staging | 1.6 s / 1.4 s / 1.4 s |
| `post-import-fixups.sql` | 0.8 s / 0.8 s / 0.8 s |
| `align-sequences.sh` | 0.1 s / 0.1 s / 0.2 s |
| `validate.sh` vs staging | 1.9 s / 1.8 s / 2.0 s |
| `pg_dump -Fc` + `docker cp` (5.0 MB archive) | 0.6 s / 0.6 s / 0.6 s |
| `psql` schema reset on Neon | 0.3 s / 0.4 s / 0.7 s |
| **`pg_restore` → Neon** | **32.1 s / 28.9 s / 30.7 s** |
| `ANALYZE` on Neon | 0.9 s / 0.8 s / 1.1 s |
| `validate.sh` vs Neon | 8.8 s / 9.1 s / 9.8 s |
| **total data path** | **~47 s / ~44 s / ~48 s** |

Run 3 is the current recipe, i.e. `pg_restore --single-transaction`. Wrapping
the restore in one transaction costs nothing measurable (30.7 s, inside the
spread of the two unwrapped runs) — it is not a trade-off, take it.

The network hop is ~70 % of the whole thing and it is *all* round-trip latency,
not bandwidth — the archive is 5 MB. Budget the cutover window off the ~31 s
restore, and expect it to grow roughly with object count (168 indexes + 58 PKs +
28 FKs + 26 CHECKs + 16 triggers, all measured on Neon after the restore), not
with data size. Resulting Neon database size: **56 MB** logical / 58 466 304
bytes (Neon free tier allows 0.5 GB, so ~11 %).

### Cutover-specific notes

- **Never point `FROM` at prod without a read-only path.** pgloader only reads,
  but reach prod through an ssh tunnel to the droplet (`ssh -L 3307:127.0.0.1:3306
  drewpayment@206.81.0.201`) rather than exposing 3306.
- **Neon's DIRECT (non-pooled) endpoint** for the restore, not the `-pooler` one:
  `pg_restore` issues DDL and session-level `SET`s that PgBouncer in transaction
  mode breaks. The app keeps using the pooled endpoint afterwards — and that is
  a standing constraint on application code, not just a cutover detail. Neon's
  pooler is **PgBouncer in transaction mode**: measured on this project, 25
  concurrent clients were multiplexed onto 11 backends and 15 of them had their
  backend PID change between two statements of the same session. So nothing
  session-scoped may be relied on outside an explicit transaction — no session
  advisory locks, no `SET` of a GUC expected to persist, no server-side
  `PREPARE`/`EXECUTE`, no temp tables, no `LISTEN`/`NOTIFY`. A single-client
  probe of every one of those passes cleanly, so casual testing will not reveal
  a violation; it only breaks under concurrency, in production. The app is clean
  today (no advisory locks, `SET`, temp tables or `LISTEN` anywhere; all writes
  go through Kysely `db.transaction()`, which is safe) — keep it that way.
- **`WITH include drop` will drop and recreate every table in the target.** That
  is what makes the pipeline repeatable — and it is also why the cutover order is
  *freeze writes on MySQL → reload → validate → flip `DATABASE_URL` and redeploy
  (§4)*, never reload-after-flip.
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
MYSQL_CMD="$MYSQL_PROD" PSQL_CMD="$PSQL_STAGING" \
  bash scripts/pg-migration/align-sequences.sh
```

**Both** variables, always. This script `setval`s — it is the one script in the
pipeline that writes — and it has no default connection precisely so that a
forgotten `PSQL_CMD` aborts instead of mutating whatever the default named.

`validate.sh` check G reports any remaining gap as a `NOTE`; a sequence behind
`max(id)` is a hard `FAIL`.

**Known cosmetic, deliberately not fixed:** for a table that is empty in the
source *and* has no `AUTO_INCREMENT` counter to align to, pgloader's
`reset sequences` leaves the sequence at `last_value = 1, is_called = true`, so
the first row the app ever inserts gets id **2**, not 1. Eight tables on prod
2026-08 (`jobs`, `links`, `oauth_clients`,
`oauth_personal_access_clients`, `personal_access_tokens`, `product_marketing`,
`tagging_tag_groups`, `testimonial_types`). Nothing depends on id 1 existing,
`align-sequences.sh` is forward-only by design, and rewinding a sequence is the
one thing this pipeline must never do — so it stays.

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

### ENUM (20 columns) → plain `text` — `post-import-fixups.sql` §1

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

### Integer columns widened by pgloader → back to `integer` — `post-import-fixups.sql` §2 / §2b

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

**MariaDB display widths widen far more than the unsigned columns — §2b.**
Measured against prod 2026-08, and invisible in the dev snapshot because MySQL
8.0.19 removed integer display widths:

| Source (MariaDB) | Source (MySQL 8) | pgloader target | Count |
|---|---|---|---|
| `int(11)` signed | `int` | **`bigint`** (vs `integer` on MySQL 8) | 95 |
| `bigint(20) unsigned`, not auto-increment | `bigint unsigned` | **`numeric`** (vs `bigint`) | 1 (`personal_access_tokens.tokenable_id`) |

Both are the same failure as the unsigned case and worse in scope: 95 more
columns typed `string` by kysely-codegen. §2 now accepts `numeric` as well as
`bigint`, and **§2b** sweeps every remaining `bigint` column that is not one of
the 5 genuinely-signed source `BIGINT`s, range-asserting each before the cast.
§2b is expressed as a sweep rather than a 95-name list because the invariant is
"no bigint columns except those 5" — which is exactly what `validate.sh` check F
compares against the source's own signed-`BIGINT` count.

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

### `updated_at` maintenance (14 triggers) — `post-import-fixups.sql` §4 / §4a

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

The 14 pairs (`extra LIKE '%on update%'` in the source `information_schema`):

```
advances.updated_at                       products.updated_at
document_files.updated_at                 scheduled_expense_applications.updated_at
feature_flags.updated_at                  scheduled_expenses.updated_at
job_applications.updated_at               subscriber_subscriptions.updated_at
job_postings.updated_at                   subscribers.updated_at
password_resets.created_at                vendor_field_definitions.updated_at
prices.updated_at
product_marketing.updated_at
```

14, not 16: the dev snapshot also carries `daily_pay_enrollments.updated_at` and
`daily_pay_settings.updated_at`, and neither table exists on prod.

The script raises if any of those tables/columns is missing (list gone stale)
and asserts exactly 14 triggers exist at the end.

#### §4a — what pgloader does with `ON UPDATE` on its own, and why all of it is wrong

Counting our 14 triggers was never sufficient, and §4 alone was not enough to
make the target behave like the source. pgloader routes **every column carrying
the `on update current_timestamp()` extra** through its own built-in ON UPDATE
path *instead of* the user `CAST` rules in `local-import.load`. Measured against
prod 2026-08 — the 2×2 is clean, the columns differ in nothing but the extra:

| Source type | `ON UPDATE`? | What pgloader emitted |
|---|---|---|
| `datetime` | no | `timestamp` NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `datetime` | **yes** | `timestamptz`, **NULLable, no default** |
| `timestamp` | no | `timestamptz` NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `timestamp` | **yes** | `timestamptz`, **NULLable, no default** |

(Row 1 is `job_applications.submitted_at` / `job_postings.created_at`; row 2 is
`job_applications.updated_at` / `job_postings.updated_at`; row 3 is
`advances.created_at`, `subscribers.created_at`, …; row 4 is the other 12 of the
14.) Three consequences, all fixed in **§4a**, all now gate-visible:

1. **Lost `NOT NULL` + `DEFAULT` on all 14.** In the source every one is
   `NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()`, so MySQL
   stamps the row on INSERT when the column is omitted — which is what every
   insert path in the app relies on (no repository writes `updated_at` on
   insert). An unfixed target writes **NULL** into a column the generated types
   call `Date`. §4a re-applies `SET DEFAULT now()` and, after counting NULLs and
   naming the offender if there are any, `SET NOT NULL`.
2. **The 2 `datetime` columns landed `timestamp WITH time zone`** (row 2 above) —
   the only 2 violations of the `datetime` → `timestamp` decision in the whole
   import, and inconsistent with their own sibling columns in the same tables.
   §4a converts them with `AT TIME ZONE 'UTC'`, which is value-preserving because
   the import runs under `SET timezone TO 'UTC'` and the source server is UTC
   (Preflight). Verified against prod after the conversion: same count, same
   `min`, same `max`, zero NULLs on both sides — and `validate.sh` check C
   re-proves it for all 143 date-ish columns on every run.
3. **pgloader emitted its own trigger per table**: `on_update_current_timestamp`
   → `on_update_current_timestamp_<table>()`, whose entire body is the
   unconditional `NEW.<col> = now(); RETURN NEW;`. PostgreSQL fires triggers of
   the same kind in **name order**, and `on_update_current_timestamp` sorts
   before `trg_set_updated_at` — so ours ran *second*, on a NEW row whose column
   had already been overwritten. That made §4's explicit-assignment test
   (`NEW.col IS DISTINCT FROM OLD.col`) true for every UPDATE and the
   MySQL-matching "explicit assignment wins" semantics **dead code**: an explicit
   `SET updated_at = <value>` was silently discarded, and §7 still passed because
   it only counted *our* 14. §4a drops all 14 triggers (matched by name pattern,
   so a 15th ON UPDATE column added to the source later is still caught) plus the
   14 functions, once nothing references them.

§7 now additionally asserts: zero other BEFORE UPDATE triggers on those 14
tables, zero leftover `on_update_current_timestamp%` functions, all 14 columns
`NOT NULL` with a non-null default, and both ex-`datetime` columns
`timestamp without time zone`. `validate.sh` check F asserts the same shape from
the **source** side (`extra LIKE '%on update%'`), so the whole class is caught by
the gate and not only by the fixups.

Proven after the fix with three rolled-back probes (repeat them after any change
to §4/§4a — a rehearsal that skips them cannot tell working semantics from dead
code):

```sql
BEGIN;
-- 1. INSERT omitting the column must get now(), not NULL
INSERT INTO advances (agentid, vendor_id, amount, advance_date, issue_date, wkending, created_by)
VALUES (1,1,12.34,DATE '2026-08-08',DATE '2026-08-08',DATE '2026-08-08',1)
RETURNING updated_at;                                    -- 2026-08-08 05:44:21.066709+00
-- 2. explicit assignment must WIN
UPDATE advances SET notes='p', updated_at=TIMESTAMPTZ '2001-01-01 00:00:00+00'
 WHERE advance_id=(SELECT min(advance_id) FROM advances) RETURNING updated_at;   -- 2001-01-01
-- 3. an UPDATE that does not assign it must refresh it
UPDATE advances SET notes='p' WHERE advance_id=(SELECT min(advance_id) FROM advances)
RETURNING updated_at;                                    -- now()
ROLLBACK;
```

Run 2 and 3 against `job_postings` too: it is one of the re-typed naive columns,
and it is the case where `set_updated_at()` writes a `timestamp without time
zone` through `jsonb_populate_record`. Both pass.

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

### CHECK constraints (12) — `post-import-fixups.sql` §6

pgloader carries columns, indexes, primary keys and foreign keys. It does **not**
carry CHECK constraints: the source has **12**, an unfixed target has 0.

**12 is prod's number; the dev snapshot reports 5.** This is the MariaDB
difference the cutover notes warn about, and it is not cosmetic:

- Dev is **MySQL 8**, where `JSON` is a native column type carrying no CHECK. Its
  `payroll_audit.*_data` columns are `data_type='json'` — 0 CHECKs.
- Prod is **MariaDB 10.6**, where `JSON` is `LONGTEXT` + an auto-generated
  `json_valid()` CHECK **named after the column** (`document_files.tags`, not
  `document_files_chk_1`). Prod's six `payroll_audit.*_data` columns contribute
  6, and the prod-only `_bak_2926_invoices.custom_fields` a 7th.

`validate.sh` check F reads its expected CHECK total from the **source**
(`information_schema.table_constraints`, so 12 on prod) and adds one per ex-ENUM
column. Restoring only the dev-era 5 leaves the target 7 short and fails the
gate — so §6 restores all 12. That is also the faithful outcome: under MariaDB
those columns really are constrained today.

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

### Ex-ENUM value domains (20 columns) — `post-import-fixups.sql` §6b

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

The 20 triples are exactly the source ENUM definitions (21 against the dev
snapshot, which has a `daily_punch_records` table prod does not). Regenerate
with:

```sql
SELECT table_name, column_name, column_type FROM information_schema.columns
WHERE table_schema = DATABASE() AND data_type='enum' ORDER BY 1,2;
```

NULL satisfies a CHECK by definition, matching a nullable MySQL ENUM
(`document_files.status`/`.storage_type`, `job_postings.salary_type`,
`user_impersonation_log.end_reason` are the four nullable ones). The comparison
is **case-sensitive**, which is stricter than MySQL — `'ACTIVE'` used to be
accepted and folded to `'active'` by the column's `_ci` collation; now it is
rejected at the write instead of read back as a value the app never matches.

Adding a constraint validates the existing rows, so an out-of-domain value aborts
the whole fixup transaction. Zero violations in the 2026-08 snapshot: all 29
distinct live values across the 20 columns are in-domain. §6b asserts it
accounted for exactly 20.

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

`document_files` and `invoice_audit` are `latin1_swedish_ci` in the dev
snapshot; **on prod 10 of the 59 tables are** (those two plus
`job_applications`, `job_postings`, `payroll_audit`, `user_impersonation_log`
and the four `_bak_2926_*`). The rest are `utf8mb3`/`utf8mb4`. pgloader reads through the MySQL client protocol with a
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
| E payroll money, plan §4 shape | paystubs 14 083 groups, invoices 13 827, overrides 4 782, expenses 6 689, advances 2 | identical to the cent; for `invoices` the per-group count of **non-numeric** `amount` values (1 364 of 161 982 rows overall) is compared as its own column, not left to check D |
| E `lower(email)` collisions | `users` | empty on both, as required |
| F DECIMAL precision/scale | all 25 columns | identical, e.g. `paystubs.amount numeric(19,4)` |
| F schema shape | 0 boolean, 0 json/jsonb, 0 enum types, both ci-unique indexes present, and — compared against counts read from the **source**, not hard-coded — signed-bigint count, `updated_at` trigger count, CHECK-constraint count (source CHECKs + 1 per ex-ENUM column), 5 Stripe-id NOT NULLs. Against prod 2026-08: 5 / 14 / 32 / 20. | as designed |
| F `ON UPDATE` column shape | the source's `extra LIKE '%on update%'` columns (14 on prod), compared `table, column, is_nullable, has-default` against the target | identical — i.e. all 14 still `NOT NULL` with a `DEFAULT` after §4a. Plus **0** other BEFORE UPDATE triggers on those tables and **0** leftover `on_update_current_timestamp%` functions: counting our own 14 triggers cannot detect pgloader's, which fire first and defeat them (see §4a) |
| G sequences | every auto-increment column (46 on prod — the source's 46 `AUTO_INCREMENT` columns, one for one; the dev snapshot has 51) | next value > `max(id)` everywhere; equal to the source `AUTO_INCREMENT` after `align-sequences.sh`. Tables that are empty on prod report a NULL counter in the source, so there is nothing to align. |

Every line above is an assertion. Check F used to *print* its schema-shape
numbers without comparing them and check G's `DO` block could raise without psql
returning non-zero — a target with `boolean` flag columns, missing triggers and a
rewound `paystubs` sequence still printed `VALIDATION PASSED`. Both are now
compared and both feed the exit code; re-proven by fault injection (see
"Fault-injection self-test").

**All checks now run even after one fails.** `report()` piped `diff` into `head`,
and under `set -euo pipefail` `diff`'s exit 1 killed the script at the **first**
`FAIL` — so the operator got one diff and `aborted early` instead of the full
damage report, `FAILED` never accumulated, and checks E, F and G never ran at
all. The pipeline now ends in `|| true`; the non-zero exit comes from the
trailing `exit $FAILED`, which is where it always belonged. Verified: with two
faults injected (an extra table, and a dropped `DEFAULT` on
`advances.updated_at`) the run FAILs at check A, keeps going, FAILs again at
check F's `ON UPDATE` comparison, still executes check G, and exits 1.

Check G is **read-only**: it derives the next value from the sequence relation
(`last_value`/`is_called`) instead of calling `nextval()`, so it cannot leave
sequences shifted the way the earlier probe-and-reset version could.

### Fault-injection self-test

The gate is only worth what it catches. To re-prove it after changing
`validate.sh`, break the target on purpose and confirm a non-zero exit:

```bash
export MYSQL_CMD='docker exec -i choice-mysql-dev mysql --default-character-set=utf8mb4 -uroot -prootpassword -N -B choice_marketing'
export PSQL_CMD='docker exec -i choice-postgres-dev psql -U choice -d choice_marketing'

docker exec choice-postgres-dev psql -U choice -d choice_marketing -c "
  ALTER TABLE employees ADD COLUMN zz_fault_bool boolean;
  DROP TRIGGER trg_set_updated_at ON subscribers;
  SELECT setval('paystubs_id_seq', 100, true);
  ALTER TABLE advances DROP CONSTRAINT chk_advances_amount_positive;"
bash scripts/pg-migration/validate.sh; echo "exit=$?"     # must be non-zero
```

Then re-run the fixups (they restore the trigger and the constraint), drop the
fault column, and re-run `align-sequences.sh` (with both variables set) to put
`paystubs_id_seq` back.

Two more faults worth injecting, because they are the ones that used to pass:

```bash
env -u MYSQL_CMD PSQL_CMD="$PSQL_CMD" bash scripts/pg-migration/validate.sh
# must abort with "MYSQL_CMD is required", NOT compare the dev containers

MYSQL_CMD="$MYSQL_CMD" MYSQL_DB=nonexistent_schema PSQL_CMD="$PSQL_CMD" \
  bash scripts/pg-migration/validate.sh
# must abort with "reports 0 base tables", NOT diff two empty result sets to PASS
```

`invoices.amount` is a `varchar(255)` that also stores status strings (`"NA"`,
`"Account Blocked"`, …) — 1 364 of 161 982 rows. Check E sums only the fully
numeric rows on **both** sides and carries the per-group non-numeric row count as
an extra compared column, rather than relying on MySQL's silent string→number
coercion. Numeric total: `4,835,317.88` on both.

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

**`PSQL_CMD is required` / `MYSQL_CMD is required`.** Working as intended — the
scripts no longer default to the dev containers. Set both (see "Local run" for
copy-paste values, or §2/§3 for the cutover ones). Note `${VAR:-default}`
substitutes on **empty** as well as unset, which is why the old defaults turned
a variable exported empty by a dead shell into a silent run against the wrong
database rather than an error.

**`source schema 'x' reports 0 base tables`.** `MYSQL_DB` names a schema this
connection cannot see. It now defaults to `SELECT DATABASE()` on the `MYSQL_CMD`
connection, so this only appears if you set it by hand — unset it, or fix it. The
check exists because checks A–D and F build their SQL from `information_schema`:
an unseen schema yields empty result sets on both sides, which diff clean and
report `VALIDATION PASSED`.

**Staging is stamped `[...]`, expected `[cutover-…]`.** §3 refuses to `pg_dump` a
staging database this run did not load and validate. Either you are in a new
shell that lost `CUTOVER_RUN_ID`, or the staging database is left over from an
earlier rehearsal. Re-run §2; do not work around it by dropping the check — a
populated stale `choice_cutover` dumps and restores perfectly happily, and the
gate that follows compares it against a source it happens to match.

**`pg_restore` to Neon failed partway.** Re-run §3 from the
`DROP SCHEMA IF EXISTS public CASCADE` line, not from `pg_restore`. With
`--single-transaction` there is nothing to clean up, but a re-run on top of an
existing schema still conflicts. ~30 s.
