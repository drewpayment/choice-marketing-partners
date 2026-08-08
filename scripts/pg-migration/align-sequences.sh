#!/usr/bin/env bash
# ===========================================================================
# align-sequences.sh — advance the imported Postgres sequences to the SOURCE
# AUTO_INCREMENT counters.
#
# WHY: pgloader's `reset sequences` sets every sequence to max(id). MySQL's
# AUTO_INCREMENT counter is >= that and diverges wherever rows were deleted
# (7 tables in the 2026-08 snapshot). Without this step Postgres re-issues ids
# MySQL already burned, so surviving references — audit rows, emailed links,
# blob paths — silently start pointing at a different record than they did
# before the cutover.
#
# Safe by construction:
#   * only ever moves a sequence FORWARD (target = greatest(source counter,
#     max(id)+1, current next value));
#   * reads the current position from the sequence relation, never by calling
#     nextval();
#   * idempotent — a second run reports "0 advanced".
#
# Run AFTER post-import-fixups.sql (the sequences are narrowed to `AS integer`
# there, so an absurd counter fails loudly here instead of at INSERT time).
#
# BOTH connections are REQUIRED — there is deliberately no default. This script
# WRITES (setval), so a defaulted PSQL_CMD would silently mutate whichever
# database the default happened to name (historically the verified local import
# in `choice_marketing`) while leaving the database you actually loaded
# unaligned. Supply the CONNECTION ONLY; the script appends psql's
# output-format and ON_ERROR_STOP flags itself.
#
# Local run (copy-paste):
#   MYSQL_CMD='docker exec -i choice-mysql-dev mysql --default-character-set=utf8mb4 -uroot -prootpassword -N -B choice_marketing' \
#   PSQL_CMD='docker exec -i choice-postgres-dev psql -U choice -d choice_marketing' \
#   bash scripts/pg-migration/align-sequences.sh
#
# Cutover run:
#   MYSQL_CMD='mysql --host=... -N -B choice_marketing'    # source, read-only
#   PSQL_CMD='psql "$STAGING_URL"'                         # connection ONLY
#
# MYSQL_DB names the schema whose information_schema is read. It defaults to the
# database the connection itself selected (`SELECT DATABASE()`), so it cannot
# drift away from MYSQL_CMD; override it only if they genuinely differ.
# ===========================================================================
set -euo pipefail
export LC_ALL=C

TAB=$'\t'
: "${MYSQL_CMD:?MYSQL_CMD is required (source connection ONLY; see the header for a copy-paste local value)}"
: "${PSQL_CMD:?PSQL_CMD is required (target connection ONLY; this script WRITES, so it must never default)}"

my() { eval "$MYSQL_CMD" 2>/dev/null | grep -v '^mysql:.*Warning' || true; }
pg() { eval "$PSQL_CMD -tAF'$TAB' -v ON_ERROR_STOP=1" 2>&1; }

MYSQL_DB=${MYSQL_DB:-$(my <<< 'SELECT DATABASE();' | tr -d ' \r')}
if [ -z "$MYSQL_DB" ] || [ "$MYSQL_DB" = "NULL" ]; then
    echo "align-sequences: MYSQL_CMD selects no default database and MYSQL_DB is unset" >&2
    exit 1
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# (table, auto-increment column, counter) straight from the source.
my <<SQL > "$WORK/counters"
SELECT CONCAT('(', QUOTE(t.table_name), ',', QUOTE(c.column_name), ',', t.auto_increment, ')')
  FROM information_schema.tables t
  JOIN information_schema.columns c
    ON c.table_schema = t.table_schema AND c.table_name = t.table_name
   AND c.extra LIKE '%auto_increment%'
 WHERE t.table_schema = '${MYSQL_DB}' AND t.auto_increment IS NOT NULL
 ORDER BY t.table_name;
SQL

if [ ! -s "$WORK/counters" ]; then
    echo "align-sequences: the source reported no AUTO_INCREMENT counters - refusing to guess" >&2
    exit 1
fi

VALUES=$(paste -sd, - < "$WORK/counters")

pg <<SQL
DO \$align\$
DECLARE
    r        record;
    seq      text;
    mx       bigint;
    cur      bigint;
    target   bigint;
    n_moved  int := 0;
    n_ok     int := 0;
BEGIN
    FOR r IN SELECT * FROM (VALUES ${VALUES}) AS v(tbl, col, ai)
    LOOP
        IF to_regclass('public.' || quote_ident(r.tbl)) IS NULL THEN
            CONTINUE;                       -- table not imported (nothing to align)
        END IF;
        seq := pg_get_serial_sequence('public.' || quote_ident(r.tbl), r.col);
        IF seq IS NULL THEN
            RAISE EXCEPTION
                'align-sequences: %.% has no owned sequence in the target - the '
                'import did not reproduce its AUTO_INCREMENT', r.tbl, r.col;
        END IF;

        EXECUTE format('SELECT coalesce(max(%I),0) FROM public.%I', r.col, r.tbl)
           INTO mx;
        EXECUTE format(
            'SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END FROM %s',
            seq) INTO cur;

        target := greatest(r.ai::bigint, mx + 1, cur);   -- never move backwards
        IF target > cur THEN
            PERFORM setval(seq, target - 1, true);       -- next value == target
            RAISE NOTICE 'advanced %.%: next % -> % (source AUTO_INCREMENT %, max %)',
                         r.tbl, r.col, cur, target, r.ai, mx;
            n_moved := n_moved + 1;
        ELSE
            n_ok := n_ok + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'align-sequences: % advanced, % already at or ahead of the source counter',
                 n_moved, n_ok;
END
\$align\$;
SQL
