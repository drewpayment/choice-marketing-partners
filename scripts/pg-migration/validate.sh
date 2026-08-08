#!/usr/bin/env bash
# ===========================================================================
# validate.sh — MySQL/MariaDB vs PostgreSQL post-import reconciliation.
#
# Run AFTER local-import.load + post-import-fixups.sql. Exits non-zero on the
# first failed check, so it can gate a cutover.
#
# Checks
#   A  row count, every base table
#   B  every integer/tinyint/decimal column: min, max, SUM, null-count
#   C  every date/datetime/timestamp column: min, max, null-count
#   D  every table: total char-count AND total UTF-8 byte-count of all string
#      columns  (catches latin1 mojibake, truncation, double-encoding)
#   E  payroll money reconciliation, plan §4 shape:
#      per agent/vendor/issue_date COUNT+SUM for paystubs, invoices, overrides,
#      expenses, advances - plus, for invoices, the count of rows whose varchar
#      `amount` is NOT numeric (it doubles as a status field)
#   F  schema shape, every line a hard assertion: 0 boolean cols, 0 json/jsonb
#      cols, 0 enum types, DECIMAL precision/scale parity, and — with the
#      expected counts read from the SOURCE, not hard-coded — signed-bigint
#      count, updated_at trigger count, CHECK-constraint count (source CHECKs
#      plus one value-domain CHECK per ex-ENUM column, §6b), the 5 Stripe-id
#      NOT NULLs (§6c), plus both case-insensitive unique indexes; and — also
#      derived from the source — that every ON UPDATE CURRENT_TIMESTAMP column
#      is still NOT NULL with a DEFAULT on the target, and that nothing except
#      trg_set_updated_at fires BEFORE UPDATE (pgloader emits its own
#      unconditional on_update_current_timestamp trigger, which fires first)
#   G  sequence sanity: next value > max(id) for every auto-increment column,
#      and a notice where it is behind the source AUTO_INCREMENT counter.
#      READ-ONLY: the next value is read from the sequence relation, never by
#      calling nextval() (nextval is not transactional and cannot be undone).
#
# The engines are driven through command hooks so the same script runs locally
# (docker exec) and at cutover (real clients over the network). BOTH are
# REQUIRED — there is deliberately no default. A gate that defaults its
# connections degrades into "compared two databases nobody asked about" and
# still prints VALIDATION PASSED; that has happened. Supply the CONNECTION
# ONLY — the script appends psql's output-format and ON_ERROR_STOP flags
# itself, because getting the field separator wrong (e.g. '\t' inside single
# quotes, which is a literal backslash-t) makes every multi-column check fail
# as if the data were wrong.
#
# Local run (copy-paste):
#   MYSQL_CMD='docker exec -i choice-mysql-dev mysql --default-character-set=utf8mb4 -uroot -prootpassword -N -B choice_marketing' \
#   PSQL_CMD='docker exec -i choice-postgres-dev psql -U choice -d choice_marketing' \
#   ./scripts/pg-migration/validate.sh
#
# Cutover run:
#   MYSQL_CMD='mysql --host=... --user=... --password=... -N -B choice_marketing'
#   PSQL_CMD='psql "$NEON_URL"'
#
# MYSQL_DB names the schema whose information_schema drives checks A-D and F.
# It defaults to the database the connection itself selected (`SELECT
# DATABASE()`) so it cannot silently point at a different schema than
# MYSQL_CMD; a schema with no base tables aborts rather than comparing two
# empty result sets and reporting PASS.
# ===========================================================================
set -euo pipefail
export LC_ALL=C          # deterministic sort/join ordering on both sides

TAB=$'\t'
: "${MYSQL_CMD:?MYSQL_CMD is required (source connection ONLY; see the header for a copy-paste local value)}"
: "${PSQL_CMD:?PSQL_CMD is required (target connection ONLY; see the header for a copy-paste local value)}"

WORK=$(mktemp -d)
FAILED=0
trap 'rc=$?; rm -rf "$WORK";
      if [ "$rc" -ne 0 ] && [ "${REACHED_END:-0}" -eq 0 ]; then
          echo; echo "VALIDATION FAILED - aborted early (exit $rc); see the error above";
      fi' EXIT

my() { eval "$MYSQL_CMD" 2>/dev/null | grep -v '^mysql:.*Warning' || true; }
# ON_ERROR_STOP is not optional: without it psql exits 0 even after a raised
# exception, and `set -e` never fires, so a failing check reports green.
pg() { eval "$PSQL_CMD -tAF'$TAB' -v ON_ERROR_STOP=1" 2>&1; }

report() { # $1=label $2=mysql-file $3=pg-file
    if diff -q "$2" "$3" >/dev/null; then
        printf '  PASS  %-58s (%s rows compared)\n' "$1" "$(wc -l < "$2" | tr -d ' ')"
    else
        printf '  FAIL  %-58s\n' "$1"
        # `|| true` is load-bearing. `diff` exits 1 when the files differ and
        # `set -o pipefail` propagates that through `head`, so under `set -e`
        # the FIRST failing check killed the whole run: FAILED never accumulated,
        # every later check (E, F, G) never executed, and the operator saw one
        # diff plus "aborted early" instead of the full damage report. The gate
        # still exits non-zero on any FAIL - that is the trailing `exit $FAILED`,
        # not this pipeline's status.
        diff "$2" "$3" | head -30 || true
        FAILED=1
    fi
}

expect() { # $1=label $2=expected $3=actual
    if [ "$2" = "$3" ]; then
        printf '  PASS  %-58s (%s)\n' "$1" "$3"
    else
        printf '  FAIL  %-58s expected [%s], got [%s]\n' "$1" "$2" "$3"
        FAILED=1
    fi
}

scalar_my() { my <<< "$1" | tr -d ' \r'; }

# Resolve the source schema from the connection itself, then prove it is really
# there. Checks A-D and F generate their SQL from information_schema, so a
# MYSQL_DB that names a schema this connection cannot see yields an EMPTY
# generator result on both sides — which diffs clean and reports PASS.
MYSQL_DB=${MYSQL_DB:-$(scalar_my 'SELECT DATABASE();')}
if [ -z "$MYSQL_DB" ] || [ "$MYSQL_DB" = "NULL" ]; then
    echo "validate: MYSQL_CMD selects no default database and MYSQL_DB is unset" >&2
    exit 1
fi
n_src_tables=$(scalar_my "SELECT COUNT(*) FROM information_schema.tables
                           WHERE table_schema='${MYSQL_DB}' AND table_type='BASE TABLE';")
if [ "${n_src_tables:-0}" -lt 1 ]; then
    echo "validate: source schema '${MYSQL_DB}' reports ${n_src_tables:-0} base tables -" >&2
    echo "          refusing to 'compare' two empty result sets and call it a PASS" >&2
    exit 1
fi
echo "source schema ${MYSQL_DB}: ${n_src_tables} base tables"

# Build one big UNION ALL query on the MySQL side from a generator query.
# NOTE: the CONCAT()s below must stay on ONE line each — mysql --batch escapes a
# newline inside a result value as a literal \n, which then corrupts the
# generated SQL when it is fed back in.
my_union() { my <<< "$1" | awk 'NR>1{printf " UNION ALL "}{printf "%s",$0} END{print ";"}' | my | sort; }

echo "== A. row counts, every base table =="
my_union "SELECT CONCAT('SELECT ''', table_name, ''' t, COUNT(*) n FROM \`', table_name, '\`')
          FROM information_schema.tables
          WHERE table_schema='${MYSQL_DB}' AND table_type='BASE TABLE' ORDER BY table_name;" > "$WORK/a.my"
pg <<'SQL' | sort > "$WORK/a.pg"
SELECT string_agg(format('SELECT %L::text t, count(*) n FROM public.%I', table_name, table_name),
                  ' UNION ALL ' ORDER BY table_name) || ';'
FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
\gexec
SQL
report "row counts" "$WORK/a.my" "$WORK/a.pg"

echo "== B. numeric columns: min / max / SUM / nulls =="
my_union "SELECT CONCAT('SELECT ''',table_name,'.',column_name,''' c, CAST(IFNULL(MIN(\`',column_name,'\`),0) AS DECIMAL(40,6)) mn, CAST(IFNULL(MAX(\`',column_name,'\`),0) AS DECIMAL(40,6)) mx, CAST(IFNULL(SUM(\`',column_name,'\`),0) AS DECIMAL(40,6)) sm, IFNULL(SUM(\`',column_name,'\` IS NULL),0) nl FROM \`',table_name,'\`')
          FROM information_schema.columns
          WHERE table_schema='${MYSQL_DB}'
            AND data_type IN ('int','bigint','tinyint','smallint','mediumint','decimal')
          ORDER BY table_name, column_name;" > "$WORK/b.my"
pg <<'SQL' | sort > "$WORK/b.pg"
SELECT string_agg(format(
  'SELECT %L::text c, coalesce(min(%I),0)::numeric(40,6) mn, coalesce(max(%I),0)::numeric(40,6) mx,'
  ' coalesce(sum(%I),0)::numeric(40,6) sm, count(*) FILTER (WHERE %I IS NULL) nl FROM public.%I',
  table_name||'.'||column_name, column_name, column_name, column_name, column_name, table_name),
  ' UNION ALL ' ORDER BY table_name, column_name) || ';'
FROM information_schema.columns
WHERE table_schema='public' AND data_type IN ('integer','bigint','smallint','numeric')
\gexec
SQL
report "numeric min/max/sum/nulls" "$WORK/b.my" "$WORK/b.pg"

echo "== C. date & timestamp columns: min / max / nulls =="
# Normalisation: strip pg's +00 offset, collapse MySQL's literal NULL to empty,
# default a null count to 0. Zero-dates deliberately differ (they become NULL).
normdate() { sed -e 's/+00\t/\t/g' -e 's/+00$//' "$1" \
  | awk -F'\t' '{for(i=2;i<=4;i++) if($i=="NULL")$i=""; if($4=="")$4="0";
                 printf "%s\t%s\t%s\t%s\n",$1,$2,$3,$4}' | sort; }
my_union "SELECT CONCAT('SELECT ''',table_name,'.',column_name,''' c, CAST(MIN(\`',column_name,'\`) AS CHAR) mn, CAST(MAX(\`',column_name,'\`) AS CHAR) mx, SUM(\`',column_name,'\` IS NULL) nl FROM \`',table_name,'\`')
          FROM information_schema.columns
          WHERE table_schema='${MYSQL_DB}' AND data_type IN ('date','datetime','timestamp')
          ORDER BY table_name, column_name;" > "$WORK/c.my.raw"
pg <<'SQL' > "$WORK/c.pg.raw"
SET timezone='UTC';
SELECT string_agg(format(
  'SELECT %L::text c, min(%I)::text mn, max(%I)::text mx, count(*) FILTER (WHERE %I IS NULL) nl FROM public.%I',
  table_name||'.'||column_name, column_name, column_name, column_name, table_name),
  ' UNION ALL ' ORDER BY table_name, column_name) || ';'
FROM information_schema.columns
WHERE table_schema='public'
  AND data_type IN ('date','timestamp without time zone','timestamp with time zone')
\gexec
SQL
grep -v '^SET$' "$WORK/c.pg.raw" > "$WORK/c.pg.tmp" && mv "$WORK/c.pg.tmp" "$WORK/c.pg.raw"
normdate "$WORK/c.my.raw" > "$WORK/c.my"
normdate "$WORK/c.pg.raw" > "$WORK/c.pg"
# Known-and-intended exception: MySQL zero-dates land as NULL in Postgres.
grep -v '0000-00-00' "$WORK/c.my" > "$WORK/c.my.f"
grep -f <(cut -f1 "$WORK/c.my.f") "$WORK/c.pg" | sort > "$WORK/c.pg.f"
report "date/timestamp min/max/nulls (zero-dates excluded)" "$WORK/c.my.f" "$WORK/c.pg.f"
if grep -q '0000-00-00' "$WORK/c.my"; then
    echo "  NOTE  columns holding MySQL zero-dates (become NULL in pg, by design):"
    grep '0000-00-00' "$WORK/c.my" | sed 's/^/          /'
fi

echo "== D. string fidelity: char-count + utf8 byte-count per table (mojibake detector) =="
my_union "SELECT CONCAT('SELECT ''', t.table_name, ''' t, IFNULL(SUM(', g.expr, '),0) chars, IFNULL(SUM(', g.blen, '),0) bytes FROM \`', t.table_name, '\`')
          FROM information_schema.tables t
          JOIN (SELECT table_name,
                  GROUP_CONCAT(CONCAT('CHAR_LENGTH(IFNULL(\`',column_name,'\`,''''))') SEPARATOR '+') expr,
                  GROUP_CONCAT(CONCAT('LENGTH(CONVERT(IFNULL(\`',column_name,'\`,'''') USING utf8mb4))') SEPARATOR '+') blen
                FROM information_schema.columns
                WHERE table_schema='${MYSQL_DB}'
                  AND data_type IN ('varchar','text','mediumtext','longtext','char','tinytext','json','enum')
                GROUP BY table_name) g ON g.table_name=t.table_name
          WHERE t.table_schema='${MYSQL_DB}' AND t.table_type='BASE TABLE'
          ORDER BY t.table_name;" > "$WORK/d.my"
pg <<'SQL' | sort > "$WORK/d.pg"
SELECT string_agg(q, ' UNION ALL ' ORDER BY tn) || ';' FROM (
  SELECT c.table_name tn,
    format('SELECT %L::text t, coalesce(sum(%s),0) chars, coalesce(sum(%s),0) bytes FROM public.%I',
      c.table_name,
      string_agg(format('char_length(coalesce(%I,''''))', c.column_name), '+'),
      string_agg(format('octet_length(coalesce(%I,''''))', c.column_name), '+'),
      c.table_name) q
  FROM information_schema.columns c
  JOIN information_schema.tables tb
    ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
  WHERE c.table_schema='public' AND c.data_type IN ('character varying','text','character')
  GROUP BY c.table_name) s
\gexec
SQL
report "string char + byte counts per table" "$WORK/d.my" "$WORK/d.pg"

echo "== E. payroll money reconciliation (plan §4) =="
# invoices.amount is a varchar that also stores status strings ("NA",
# "Account Blocked", ...) - 1 364 of 161 982 rows in the 2026-08 snapshot. Both
# sides sum only the rows that are fully numeric (rather than relying on MySQL's
# silent string->number coercion, which would quietly read "NA" as 0 on one side
# only) AND carry the non-numeric row count as its own compared column, so a row
# that changed from a status string to a number - or vice versa - fails here and
# not merely in check D's aggregate byte totals.
recon() { # $1=label $2=mysql-sql $3=pg-sql
    my <<< "$2" > "$WORK/e.my"
    pg <<< "$3" | sed 's/+00$//' > "$WORK/e.pg"
    report "$1" "$WORK/e.my" "$WORK/e.pg"
}
recon "paystubs  by agent/vendor/issue_date" \
  "SELECT agent_id, vendor_id, issue_date, COUNT(*), CAST(SUM(amount) AS DECIMAL(30,4)) FROM paystubs GROUP BY 1,2,3 ORDER BY 1,2,3;" \
  "SELECT agent_id, vendor_id, issue_date, COUNT(*), SUM(amount)::numeric(30,4) FROM paystubs GROUP BY 1,2,3 ORDER BY 1,2,3;"
recon "invoices  by agent/vendor/issue_date" \
  "SELECT agentid, vendor, issue_date, COUNT(*), CAST(SUM(CASE WHEN amount REGEXP '^-?[0-9]+([.][0-9]+)?\$' THEN CAST(amount AS DECIMAL(30,4)) ELSE 0 END) AS DECIMAL(30,4)), CAST(SUM(CASE WHEN amount REGEXP '^-?[0-9]+([.][0-9]+)?\$' THEN 0 ELSE 1 END) AS SIGNED) FROM invoices GROUP BY 1,2,3 ORDER BY 1,2,3;" \
  "SELECT agentid, vendor, issue_date, COUNT(*), SUM(CASE WHEN amount ~ '^-?[0-9]+([.][0-9]+)?\$' THEN amount::numeric ELSE 0 END)::numeric(30,4), SUM(CASE WHEN amount ~ '^-?[0-9]+([.][0-9]+)?\$' THEN 0 ELSE 1 END)::bigint FROM invoices GROUP BY 1,2,3 ORDER BY 1,2,3;"
recon "overrides by agent/vendor/issue_date" \
  "SELECT agentid, vendor_id, issue_date, COUNT(*), CAST(SUM(total) AS DECIMAL(30,4)), CAST(SUM(commission) AS DECIMAL(30,4)) FROM overrides GROUP BY 1,2,3 ORDER BY 1,2,3;" \
  "SELECT agentid, vendor_id, issue_date, COUNT(*), SUM(total)::numeric(30,4), SUM(commission)::numeric(30,4) FROM overrides GROUP BY 1,2,3 ORDER BY 1,2,3;"
recon "expenses  by agent/vendor/issue_date" \
  "SELECT agentid, vendor_id, issue_date, COUNT(*), CAST(SUM(amount) AS DECIMAL(30,4)) FROM expenses GROUP BY 1,2,3 ORDER BY 1,2,3;" \
  "SELECT agentid, vendor_id, issue_date, COUNT(*), SUM(amount)::numeric(30,4) FROM expenses GROUP BY 1,2,3 ORDER BY 1,2,3;"
recon "advances  by agent/issue_date" \
  "SELECT agentid, issue_date, COUNT(*), CAST(SUM(amount) AS DECIMAL(30,4)) FROM advances GROUP BY 1,2 ORDER BY 1,2;" \
  "SELECT agentid, issue_date, COUNT(*), SUM(amount)::numeric(30,4) FROM advances GROUP BY 1,2 ORDER BY 1,2;"
recon "users lower(email) collision groups" \
  "SELECT LOWER(email), COUNT(*) FROM users GROUP BY 1 HAVING COUNT(*)>1 ORDER BY 1;" \
  "SELECT lower(email), COUNT(*) FROM users GROUP BY 1 HAVING COUNT(*)>1 ORDER BY 1;"

echo "== F. schema shape =="
# Both sides go through the shell's `sort` under LC_ALL=C, exactly as checks
# A-D do, rather than trusting each engine's own ORDER BY. The two engines do
# NOT agree on collation: MySQL's utf8 _ci collations sort a leading underscore
# AFTER the alphanumerics, glibc/ICU in Postgres sorts it before. With prod's
# four `_bak_2926_*` tables in the picture that produced a 10-line diff in which
# every row was present on both sides - a pure ordering artefact reported as a
# schema mismatch. (The dev snapshot has no underscore-prefixed table, so this
# check agreed by luck.) This comparison is about the SET of tuples; imposing
# one sort order on both sides is what makes it mean that.
my <<SQL | sort > "$WORK/f.my"
SELECT table_name, column_name, CONCAT('numeric(',numeric_precision,',',numeric_scale,')'), is_nullable
FROM information_schema.columns WHERE table_schema='${MYSQL_DB}' AND data_type='decimal' ORDER BY 1,2;
SQL
pg <<'SQL' | sort > "$WORK/f.pg"
SELECT table_name, column_name, 'numeric('||numeric_precision||','||numeric_scale||')', is_nullable
FROM information_schema.columns WHERE table_schema='public' AND data_type='numeric' ORDER BY 1,2;
SQL
report "DECIMAL -> numeric precision/scale/nullability" "$WORK/f.my" "$WORK/f.pg"

# Expectations come from the SOURCE wherever they can, so the check does not
# quietly encode this snapshot's numbers (prod is MariaDB 10.6, not MySQL 8).
exp_bigint=$(scalar_my "SELECT COUNT(*) FROM information_schema.columns
                         WHERE table_schema='${MYSQL_DB}' AND data_type='bigint'
                           AND column_type NOT LIKE '%unsigned%';")
exp_trg=$(scalar_my "SELECT COUNT(*) FROM information_schema.columns
                      WHERE table_schema='${MYSQL_DB}' AND extra LIKE '%on update%';")
exp_chk=$(scalar_my "SELECT COUNT(*) FROM information_schema.table_constraints
                      WHERE table_schema='${MYSQL_DB}' AND constraint_type='CHECK';")
# post-import-fixups §6b adds one value-domain CHECK per ex-ENUM column, so the
# target legitimately carries MORE CHECK constraints than the source: the source
# expressed those domains in the column TYPE, which §1 flattened to text.
exp_enum_chk=$(scalar_my "SELECT COUNT(*) FROM information_schema.columns
                           WHERE table_schema='${MYSQL_DB}' AND data_type='enum';")
exp_chk_total=$(( exp_chk + exp_enum_chk ))
# post-import-fixups §6c: the 5 Stripe identifier columns.
exp_stripe_nn=5

pg > "$WORK/f2.pg" <<'SQL'
SELECT 'boolean_columns', count(*)::text
  FROM information_schema.columns WHERE table_schema='public' AND data_type='boolean'
UNION ALL SELECT 'json_columns',
  count(*)::text FROM information_schema.columns WHERE table_schema='public' AND data_type IN ('json','jsonb')
UNION ALL SELECT 'enum_types',
  count(*)::text FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typtype='e' AND n.nspname='public'
UNION ALL SELECT 'bigint_columns',
  count(*)::text FROM information_schema.columns WHERE table_schema='public' AND data_type='bigint'
UNION ALL SELECT 'updated_at_triggers',
  count(*)::text FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND NOT tg.tgisinternal AND tg.tgname='trg_set_updated_at'
UNION ALL SELECT 'other_before_update_triggers',
  count(*)::text FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND NOT tg.tgisinternal
    AND (tg.tgtype & 2) <> 0 AND (tg.tgtype & 16) <> 0
    AND tg.tgname <> 'trg_set_updated_at'
UNION ALL SELECT 'pgloader_on_update_functions',
  count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'on\_update\_current\_timestamp%'
UNION ALL SELECT 'check_constraints',
  count(*)::text FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='c'
UNION ALL SELECT 'enum_check_constraints',
  count(*)::text FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND con.contype='c' AND con.conname LIKE 'chk\_%\_enum'
UNION ALL SELECT 'stripe_id_not_null',
  count(*)::text FROM information_schema.columns
  WHERE table_schema='public' AND is_nullable='NO'
    AND (table_name, column_name) IN (
      ('products','stripe_product_id'), ('prices','stripe_price_id'),
      ('subscribers','stripe_customer_id'),
      ('subscriber_subscriptions','stripe_subscription_id'),
      ('payment_history','stripe_invoice_id'))
UNION ALL SELECT 'uk_vendors_name_lower',
  (to_regclass('public.uk_vendors_name_lower') IS NOT NULL)::text
UNION ALL SELECT 'uk_users_email_lower',
  (to_regclass('public.uk_users_email_lower') IS NOT NULL)::text;
SQL
fval() { awk -F'\t' -v k="$1" '$1==k{print $2}' "$WORK/f2.pg"; }

expect "boolean columns (0 - app reads flags with === 1)"      0            "$(fval boolean_columns)"
expect "json/jsonb columns (0 - app hand-parses JSON strings)" 0            "$(fval json_columns)"
expect "enum types (0 - converted to text)"                    0            "$(fval enum_types)"
expect "bigint columns (= source signed BIGINT count)"         "$exp_bigint" "$(fval bigint_columns)"
expect "trg_set_updated_at triggers (= source ON UPDATE count)" "$exp_trg"   "$(fval updated_at_triggers)"
# pgloader emits its OWN `on_update_current_timestamp` BEFORE UPDATE trigger per
# ON UPDATE table. It sorts before trg_set_updated_at, fires first, and
# overwrites the column unconditionally - which makes our explicit-assignment-
# wins semantics dead code while the count above still reads 14. Counting ours
# was never enough; nothing else may fire BEFORE UPDATE.
expect "other BEFORE UPDATE triggers (0 - ours must be alone)" 0 "$(fval other_before_update_triggers)"
expect "leftover pgloader on_update_current_timestamp fns (0)" 0 "$(fval pgloader_on_update_functions)"
expect "CHECK constraints (= source CHECK count + 1/ex-ENUM column)" "$exp_chk_total" "$(fval check_constraints)"
expect "ex-ENUM value-domain CHECKs (= source ENUM column count)" "$exp_enum_chk" "$(fval enum_check_constraints)"
expect "Stripe id columns NOT NULL"                            "$exp_stripe_nn" "$(fval stripe_id_not_null)"
expect "uk_vendors_name_lower present"                         true            "$(fval uk_vendors_name_lower)"
expect "uk_users_email_lower present"                          true            "$(fval uk_users_email_lower)"

# Column shape of the source's ON UPDATE CURRENT_TIMESTAMP columns, derived from
# the SOURCE (`extra LIKE '%on update%'`) rather than named here, so the whole
# failure class is gate-visible: pgloader routes those columns through its own
# built-in ON UPDATE path instead of the CAST rules and emits them NULLABLE with
# NO DEFAULT. The source stamps the row on INSERT when the column is omitted;
# an unfixed target writes NULL into a column the app's types call `Date`.
# post-import-fixups §4a restores both.
my <<SQL | sort > "$WORK/f3.my"
SELECT table_name, column_name, is_nullable, IF(column_default IS NULL,'f','t')
  FROM information_schema.columns
 WHERE table_schema='${MYSQL_DB}' AND extra LIKE '%on update%' ORDER BY 1,2;
SQL
n_ouct=$(wc -l < "$WORK/f3.my" | tr -d ' ')
if [ "$n_ouct" -lt 1 ]; then
    # Not a pass. An empty generator result would otherwise diff clean against an
    # empty target result - the same trap the zero-base-tables guard exists for.
    printf '  FAIL  %-58s\n' "ON UPDATE column shape (source returned 0 columns)"
    echo "        prod 2026-08 has 14; investigate before proceeding"
    FAILED=1
else
    ouct_vals=$(cut -f1,2 "$WORK/f3.my" \
      | awk -F'\t' 'NR>1{printf ","} {printf "(%c%s%c,%c%s%c)", 39,$1,39, 39,$2,39}')
    pg <<SQL | sort > "$WORK/f3.pg"
SELECT c.table_name, c.column_name, c.is_nullable,
       CASE WHEN c.column_default IS NULL THEN 'f' ELSE 't' END
  FROM information_schema.columns c
  JOIN (VALUES ${ouct_vals}) AS v(t, cn)
    ON v.t = c.table_name AND v.cn = c.column_name
 WHERE c.table_schema='public' ORDER BY 1,2;
SQL
    report "ON UPDATE cols: NOT NULL + DEFAULT preserved ($n_ouct)" "$WORK/f3.my" "$WORK/f3.pg"
fi

echo "== G. sequence sanity: next value > max(id), vs source AUTO_INCREMENT =="
# READ-ONLY. The old version called nextval() and then setval() to put it back;
# nextval is not transactional, so an interrupted run left sequences shifted and
# the reset also clobbered the is_called state of empty-table sequences. Here the
# next value is derived from the sequence relation instead.
pg <<'SQL' | sort > "$WORK/g.pg"
SELECT string_agg(format(
  'SELECT %L::text t, %L::text c, coalesce(max(%I),0)::text mx,'
  ' (SELECT (CASE WHEN is_called THEN last_value+1 ELSE last_value END)::text FROM %s) nx'
  ' FROM public.%I',
  c.relname, a.attname, a.attname,
  pg_get_serial_sequence('public.'||quote_ident(c.relname), a.attname), c.relname),
  ' UNION ALL ' ORDER BY c.relname, a.attname) || ';'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND pg_get_serial_sequence('public.'||quote_ident(c.relname), a.attname) IS NOT NULL
\gexec
SQL
my <<SQL | sort > "$WORK/g.my"
SELECT table_name, auto_increment FROM information_schema.tables
 WHERE table_schema='${MYSQL_DB}' AND auto_increment IS NOT NULL ORDER BY table_name;
SQL
n_seq=$(wc -l < "$WORK/g.pg" | tr -d ' ')
seq_out=$(join -t"$TAB" -1 1 -2 1 -a1 -o 0,1.2,1.3,1.4,2.2 "$WORK/g.pg" "$WORK/g.my" \
  | awk -F'\t' '
      $4+0 <= $3+0 && $3+0 > 0 { printf "FAIL\tsequence behind: %s.%s next=%s but max=%s\n",$1,$2,$4,$3; next }
      $5 != "" && $4+0 < $5+0   { printf "NOTE\t%s.%s next=%s is below the source AUTO_INCREMENT %s - those ids were burned in MySQL and will be re-issued\n",$1,$2,$4,$5 }
    ')
if printf '%s' "$seq_out" | grep -q '^FAIL'; then
    printf '  FAIL  %-58s\n' "sequence positions ($n_seq auto-increment columns)"
    printf '%s\n' "$seq_out" | grep '^FAIL' | sed 's/^FAIL\t/        /'
    FAILED=1
else
    printf '  PASS  %-58s (%s columns checked)\n' "sequence next value > max(id)" "$n_seq"
fi
if printf '%s' "$seq_out" | grep -q '^NOTE'; then
    echo "  NOTE  sequences below the source AUTO_INCREMENT counter (id reuse):"
    printf '%s\n' "$seq_out" | grep '^NOTE' | sed 's/^NOTE\t/        /'
    echo "        Align them with the README step \"Align sequences with the source counters\"."
fi

echo
REACHED_END=1
if [ "$FAILED" -eq 0 ]; then
    echo "VALIDATION PASSED"
else
    echo "VALIDATION FAILED - see FAIL lines above"
fi
exit "$FAILED"
