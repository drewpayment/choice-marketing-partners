-- ===========================================================================
-- post-import-fixups.sql
--
-- Runs immediately after `pgloader scripts/pg-migration/local-import.load`.
-- Turns pgloader's mechanical translation into the schema the app actually
-- needs. IDEMPOTENT: safe to run any number of times against an already-fixed
-- database (every step is a no-op once satisfied).
--
-- Usage:
--   psql "$TARGET_URL" -v ON_ERROR_STOP=1 \
--        -f scripts/pg-migration/post-import-fixups.sql
--
-- The whole script is one transaction: any failed assertion rolls the entire
-- fixup back, so the database is never left half-converted.
--
-- Sections:
--   1. ENUM columns -> text, enum types dropped
--   2. unsigned integers: bigint -> integer, with range assertions
--   2b. signed int columns MariaDB display widths also widened to bigint
--   3. case-insensitive unique indexes (vendors.name, users.email)
--   4. updated_at maintenance triggers (replaces ON UPDATE CURRENT_TIMESTAMP)
--   4a. undo pgloader's OWN ON UPDATE handling: drop its triggers/functions,
--       restore the NOT NULL + DEFAULT it dropped, re-type the 2 datetimes
--   5. drop the btree stand-ins pgloader emitted for MySQL FULLTEXT indexes
--   6. CHECK constraints pgloader does not carry across
--   6b. value-domain CHECK constraints for the 20 ex-ENUM columns
--   6c. NOT NULL on the 5 Stripe identifier columns
--   7. final assertions
-- ===========================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Guard: refuse to run against something that is not a fresh import.
-- ---------------------------------------------------------------------------
DO $guard$
BEGIN
    IF to_regclass('public.employees') IS NULL
       OR to_regclass('public.paystubs') IS NULL THEN
        RAISE EXCEPTION
            'post-import-fixups: public.employees / public.paystubs not found - '
            'is this the right database, and did pgloader finish?';
    END IF;
END
$guard$;


-- ===========================================================================
-- 1. ENUM columns -> plain text
--
-- WHY: pgloader materialises one PostgreSQL enum type per MySQL ENUM column
-- (20 of them on prod). Two problems with keeping them:
--   * `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block, so every
--     future "add a status" migration becomes a special case in the migration
--     runner.
--   * kysely-codegen already emits string-union types from the app's own code;
--     plain `text` keeps those unions working verbatim and keeps inserts of
--     ordinary strings legal.
-- Value-domain enforcement belongs in CHECK constraints — those are
-- transactional. Restored in §6b below (plan §2.2: "ENUM columns -> text +
-- CHECK"); without it the string-union types the app asserts with
-- `$narrowType` would have nothing behind them.
--
-- The column DEFAULT is preserved: it is evaluated to its text value before the
-- type change and re-applied as a plain string literal afterwards.
-- ===========================================================================
DO $enums$
DECLARE
    r        record;
    defval   text;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl,
               a.attname AS col,
               pg_get_expr(d.adbin, d.adrelid) AS defexpr,
               a.attnotnull AS notnull
        FROM pg_attribute a
        JOIN pg_class     c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type      t ON t.oid = a.atttypid
        LEFT JOIN pg_attrdef d
               ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND t.typtype = 'e'
        ORDER BY 1, 2
    LOOP
        defval := NULL;
        IF r.defexpr IS NOT NULL THEN
            EXECUTE format('SELECT (%s)::text', r.defexpr) INTO defval;
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
                           r.tbl, r.col);
        END IF;

        EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
            r.tbl, r.col, r.col);

        IF defval IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %L',
                           r.tbl, r.col, defval);
        END IF;

        RAISE NOTICE 'enum->text: %.% (default %)',
                     r.tbl, r.col, COALESCE(quote_literal(defval), 'none');
    END LOOP;
END
$enums$;

-- Drop the now-unreferenced enum types.
DO $droptypes$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT t.typname AS tname
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typtype = 'e' AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP TYPE public.%I', r.tname);
        RAISE NOTICE 'dropped enum type %', r.tname;
    END LOOP;
END
$droptypes$;


-- ===========================================================================
-- 2. UNSIGNED integer columns: bigint -> integer
--
-- WHY: pgloader widens `int unsigned` and `bigint unsigned` to `bigint` because
-- the MySQL domains do not fit signed 32-bit. But kysely-codegen types
-- PostgreSQL `int8` as `string` (int8 exceeds JS safe-integer range), which
-- would silently retype 60 columns — including nearly every primary key and FK
-- the app arithmetic and `=== ` comparisons run on. Downcast them back.
--
-- SAFETY: each column is range-asserted BEFORE the ALTER. If any live value is
-- outside int4, the script raises and the whole transaction rolls back — we do
-- not want a silent truncation on a payroll database.
--
-- The list below is every unsigned int/bigint column in the source
-- information_schema (60 columns). Regenerate with:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema = DATABASE()
--     AND column_type LIKE '%unsigned%' AND data_type IN ('int','bigint')
--   ORDER BY table_name, column_name;
--
-- DO NOT use `column_type LIKE '%int unsigned%'` (what this comment said until
-- the 2026-08 cutover reconciliation). MySQL 8 dropped integer display widths,
-- so it renders `int unsigned` and the pattern matched; MariaDB 10.6 still
-- renders `int(10) unsigned`, where the `(10)` sits between `int` and
-- `unsigned` and the pattern matches NOTHING. Run against prod that query
-- returns 0 rows — i.e. it would have silently reported "no unsigned columns"
-- rather than raising, and every one of these 60 columns would have stayed
-- bigint. The `data_type IN ('int','bigint')` guard is still required: a bare
-- `%unsigned%` also picks up jobs.attempts and
-- user_notifications.paystub_notifier_type, which are `tinyint unsigned` and
-- land as smallint via the load file's tinyint cast rule, not as bigint.
--
-- The 6 `bigint unsigned` ones are: company_options.id, jobs.id,
-- manager_employees.id, personal_access_tokens.id, personal_access_tokens
-- .tokenable_id, user_notifications.id.
--
-- The 4 `_bak_2926_*` entries are prod-only 2023 scratch tables (432 rows
-- total). They flow through the import like any other table, so they are
-- downcast and range-asserted like any other table.
--
-- pgloader renders these columns as EITHER `bigint` OR unconstrained `numeric`,
-- and which one you get is engine-dependent — another display-width artefact:
--
--   * MySQL 8   `bigint unsigned`      -> bigint   (59/60 columns here)
--   * MariaDB   `bigint(20) unsigned`  -> numeric  (personal_access_tokens
--                                        .tokenable_id, the only non-auto-
--                                        increment bigint unsigned column)
--
-- The five other `bigint unsigned` columns are AUTO_INCREMENT, which pgloader
-- routes to bigserial (=> bigint) before the unsigned rule is reached, so they
-- are identical on both engines and this only ever bites the one column.
-- Measured on prod 2026-08; the dev snapshot cannot reproduce it. The loop
-- therefore accepts `numeric` as well as `bigint`, range-asserts it the same
-- way, and additionally asserts integrality (ALTER TYPE integer would ROUND a
-- fractional numeric rather than fail). Left as numeric it would also break
-- validate.sh check F, which compares DECIMAL precision/scale and would see a
-- target `numeric(,)` column with no source counterpart.
--
-- AUTO-INCREMENT is preserved: the `DEFAULT nextval(...)` and the owned
-- sequence survive `ALTER COLUMN ... TYPE`. The owned sequence is additionally
-- narrowed to `AS integer` so it can never hand out a value the column cannot
-- store (it would fail loudly at nextval instead of at INSERT).
-- ===========================================================================
DO $unsigned$
DECLARE
    r        record;
    curtype  text;
    maxval   numeric;
    minval   numeric;
    seqname  text;
    seqlast  numeric;
    n_frac   bigint;
    n_done   int := 0;
    n_skip   int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('_bak_2926_expenses','expid'),
            ('_bak_2926_invoices','invoice_id'),
            ('_bak_2926_overrides','ovrid'),
            ('_bak_2926_paystubs','id'),
            ('comments','from_user'),
            ('comments','id'),
            ('comments','on_post'),
            ('company_options','id'),
            ('documents','id'),
            ('employee_invoice','employee_id'),
            ('employee_invoice','invoice_id'),
            ('employee_permission','employee_id'),
            ('employee_permission','permission_id'),
            ('employee_user','employee_id'),
            ('employee_user','user_id'),
            ('employees','id'),
            ('expenses','expid'),
            ('invoice_audit','changed_by'),
            ('invoice_audit','invoice_id'),
            ('invoices','invoice_id'),
            ('jobs','available_at'),
            ('jobs','created_at'),
            ('jobs','id'),
            ('jobs','reserved_at'),
            ('links','id'),
            ('manager_employees','employee_id'),
            ('manager_employees','id'),
            ('manager_employees','manager_id'),
            ('oauth_access_tokens','client_id'),
            ('oauth_auth_codes','client_id'),
            ('oauth_clients','id'),
            ('oauth_personal_access_clients','client_id'),
            ('oauth_personal_access_clients','id'),
            ('overrides','ovrid'),
            ('payroll','agent_id'),
            ('payroll','id'),
            ('payroll_restriction','id'),
            ('paystubs','id'),
            ('permissions','id'),
            ('personal_access_tokens','id'),
            ('personal_access_tokens','tokenable_id'),
            ('posts','author_id'),
            ('posts','id'),
            ('scheduled_expense_applications','id'),
            ('subscriber_user','user_id'),
            ('tagging_tag_groups','id'),
            ('tagging_tagged','id'),
            ('tagging_tagged','taggable_id'),
            ('tagging_tags','count'),
            ('tagging_tags','id'),
            ('tagging_tags','tag_group_id'),
            ('testimonial_types','id'),
            ('testimonials','id'),
            ('user_impersonation_log','id'),
            ('user_notifications','employee_id'),
            ('user_notifications','id'),
            ('user_notifications','user_id'),
            ('users','uid'),
            ('vendor_field_definitions','vendor_id'),
            ('vendors','id')
        ) AS v(tbl, col)
    LOOP
        SELECT format_type(a.atttypid, a.atttypmod)
          INTO curtype
          FROM pg_attribute a
          JOIN pg_class     c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = r.tbl
           AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped;

        IF curtype IS NULL THEN
            RAISE EXCEPTION
                'post-import-fixups: expected column %.% is missing - the '
                'unsigned-column list is stale vs the source schema', r.tbl, r.col;
        END IF;

        IF curtype = 'integer' THEN
            n_skip := n_skip + 1;      -- already downcast; idempotent re-run
            CONTINUE;
        END IF;

        -- 'numeric' (UNCONSTRAINED — no precision/scale) is pgloader's other
        -- rendering of an unsigned integer; see the MariaDB note in the header.
        -- The match is on the exact string, so a real DECIMAL(p,s) still reads
        -- as 'numeric(10,2)' here and is refused.
        IF curtype NOT IN ('bigint', 'numeric') THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% is % (expected bigint, numeric or '
                'integer) - refusing to guess', r.tbl, r.col, curtype;
        END IF;

        -- Range assertion. Fail loudly rather than truncate payroll keys.
        EXECUTE format('SELECT max(%I)::numeric, min(%I)::numeric FROM public.%I',
                       r.col, r.col, r.tbl)
           INTO maxval, minval;

        -- ALTER ... TYPE integer ROUNDS a fractional numeric instead of
        -- erroring, so integrality is asserted explicitly before the cast. A
        -- bigint source column cannot be fractional; an unconstrained numeric
        -- one could be if the source type was ever something else.
        IF curtype = 'numeric' THEN
            EXECUTE format(
                'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND %I <> trunc(%I)',
                r.tbl, r.col, r.col, r.col) INTO n_frac;
            IF n_frac > 0 THEN
                RAISE EXCEPTION
                    'post-import-fixups: %.% is numeric with % fractional '
                    'value(s) - ALTER TYPE integer would silently round them',
                    r.tbl, r.col, n_frac;
            END IF;
        END IF;

        IF maxval IS NOT NULL AND maxval > 2147483647 THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% max value % exceeds int4 max 2147483647 - '
                'this column must stay bigint and the app types must handle it',
                r.tbl, r.col, maxval;
        END IF;
        IF minval IS NOT NULL AND minval < -2147483648 THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% min value % is below int4 min -2147483648',
                r.tbl, r.col, minval;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE integer',
                       r.tbl, r.col);

        -- Keep the identity sequence in the same domain as the column.
        seqname := pg_get_serial_sequence('public.' || quote_ident(r.tbl), r.col);
        IF seqname IS NOT NULL THEN
            EXECUTE format('SELECT last_value FROM %s', seqname) INTO seqlast;
            IF seqlast <= 2147483647 THEN
                EXECUTE format('ALTER SEQUENCE %s AS integer MAXVALUE 2147483647',
                               seqname);
            END IF;
        END IF;

        n_done := n_done + 1;
    END LOOP;

    RAISE NOTICE 'unsigned downcast: % converted, % already integer',
                 n_done, n_skip;
END
$unsigned$;


-- ===========================================================================
-- 2b. SIGNED int columns pgloader also widened to bigint
--
-- WHY: §2 handles the unsigned columns, which are wide on BOTH engines because
-- the unsigned domain genuinely does not fit int4. This block handles a second,
-- engine-specific widening that only appears when the source is MariaDB.
--
--   MySQL 8   `int`      -> integer   (display widths were removed in 8.0.19)
--   MariaDB   `int(11)`  -> bigint    (the typemod defeats pgloader's rule)
--
-- Measured on prod 2026-08: 95 columns, all source `int(11)` SIGNED (78 plain +
-- 17 auto_increment), land as bigint. The dev snapshot is MySQL 8 and cannot
-- reproduce it, which is why nothing upstream caught this. Left alone, those 95
-- columns are `int8`, kysely-codegen types int8 as `string`, and the app's
-- `=== 1` flag reads and numeric id comparisons break exactly the way §2's
-- header describes — but for nearly every remaining integer column in the
-- schema, not just the unsigned ones.
--
-- Expressed as a SWEEP rather than a 95-entry list, because the invariant the
-- app actually needs is "no bigint columns except the genuinely-signed BIGINTs",
-- and that is also precisely what validate.sh check F asserts (it compares the
-- target's bigint count against the SOURCE's signed-BIGINT count). A hard-coded
-- list of 95 names would restate the same thing less truthfully and rot faster.
--
-- The 5 exemptions are the source's genuinely-signed `BIGINT` columns.
-- Re-verify against prod with:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema = DATABASE() AND data_type='bigint'
--     AND column_type NOT LIKE '%unsigned%' ORDER BY 1,2;
-- Confirmed unchanged at the 2026-08 cutover. If the source ever gains a 6th,
-- this block would downcast it: the range assertion below stops that from
-- corrupting data, and validate.sh check F fails on the count mismatch, so the
-- staleness surfaces before anything ships.
--
-- Idempotent, and a no-op against a MySQL 8 source (nothing is bigint by then).
-- ===========================================================================
DO $signedint$
DECLARE
    r        record;
    maxval   numeric;
    minval   numeric;
    seqname  text;
    seqlast  numeric;
    n_done   int := 0;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl, a.attname AS col
        FROM pg_attribute a
        JOIN pg_class     c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND format_type(a.atttypid, a.atttypmod) = 'bigint'
          AND (c.relname, a.attname) NOT IN (
                ('document_files',      'file_size'),
                ('invoice_audit',       'id'),
                ('oauth_access_tokens', 'user_id'),
                ('oauth_auth_codes',    'user_id'),
                ('oauth_clients',       'user_id'))
        ORDER BY 1, 2
    LOOP
        -- Same range assertion as §2. A signed int(11) cannot exceed int4, so
        -- this should never fire; it is here so that a source column that is
        -- NOT what we think it is fails loudly instead of being truncated.
        EXECUTE format('SELECT max(%I)::numeric, min(%I)::numeric FROM public.%I',
                       r.col, r.col, r.tbl)
           INTO maxval, minval;

        IF maxval IS NOT NULL AND maxval > 2147483647 THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% max value % exceeds int4 max 2147483647 - '
                'this column is genuinely wide and belongs in the exemption list '
                'above (and in the app types)', r.tbl, r.col, maxval;
        END IF;
        IF minval IS NOT NULL AND minval < -2147483648 THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% min value % is below int4 min -2147483648',
                r.tbl, r.col, minval;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE integer',
                       r.tbl, r.col);

        seqname := pg_get_serial_sequence('public.' || quote_ident(r.tbl), r.col);
        IF seqname IS NOT NULL THEN
            EXECUTE format('SELECT last_value FROM %s', seqname) INTO seqlast;
            IF seqlast <= 2147483647 THEN
                EXECUTE format('ALTER SEQUENCE %s AS integer MAXVALUE 2147483647',
                               seqname);
            END IF;
        END IF;

        n_done := n_done + 1;
    END LOOP;

    RAISE NOTICE 'signed-int downcast (MariaDB display-width artefact): % converted',
                 n_done;
END
$signedint$;


-- ===========================================================================
-- 3. Case-insensitive unique indexes: vendors.name and users.email
--
-- WHY: every unique index in the source sits on a `_ci` collation
-- (utf8mb3_unicode_ci / utf8mb4_0900_ai_ci), i.e. it is case-INsensitive.
-- Postgres UNIQUE is case-SENSITIVE, so each of them silently widens at import.
-- Two of them are load-bearing for the app and are restored here; the rest are
-- deliberately left case-sensitive (full list + reasoning in README.md,
-- "Case-insensitive unique indexes").
--
--   vendors.name  — migration 008's `UNIQUE (name)`. Without the fix "Palmco"
--       and "palmco" both insert while VendorRepository.isNameAvailable (which
--       compares LOWER(name)) keeps rejecting the second: app and DB disagree,
--       and the disagreement surfaces as a 500 on vendor create.
--   users.email   — `users_email_unique`. Every auth lookup normalises to
--       lower(trim(email)) (Phase 1 item A), so two rows differing only in case
--       would leave one account unreachable: it could neither sign in nor
--       self-serve a password reset (the reset path gates on the same lookup).
--       Plan §2.3 item 1 requires this state to be unrepresentable.
--
-- pgloader renames source indexes to `idx_<source-oid>_<original-name>`, so the
-- imported index name is not stable across runs (observed both
-- `idx_19142_uk_vendors_name` and `idx_21284_uk_vendors_name`); the vendors
-- index is located by SHAPE (unique, non-primary, single plain column on
-- `name`) rather than by name.
--
-- The vendors case-sensitive index is dropped (fully redundant once the lower()
-- index exists, and the app never looks vendors up by exact name). The users
-- one is KEPT: `where email = <normalised>` is the hot auth lookup and an
-- expression index on lower(email) cannot serve it.
-- ===========================================================================

-- Pre-flight both indexes with an explicit, actionable error. CREATE UNIQUE
-- INDEX would also fail on a collision, but "Key (lower(name))=(x) is
-- duplicated" does not tell a cutover operator what to do about it.
DO $ci_precheck$
DECLARE dupes text;
BEGIN
    SELECT string_agg(format('%s (%s rows)', k, n), ', ')
      INTO dupes
      FROM (SELECT lower(name) k, count(*) n FROM public.vendors
             GROUP BY 1 HAVING count(*) > 1) d;
    IF dupes IS NOT NULL THEN
        RAISE EXCEPTION
            'vendors.name case-collisions block uk_vendors_name_lower: % - a '
            'human must merge them (scripts/merge-duplicate-vendors.ts) in the '
            'SOURCE database before cutover', dupes;
    END IF;

    SELECT string_agg(format('%s (%s rows)', k, n), ', ')
      INTO dupes
      FROM (SELECT lower(email) k, count(*) n FROM public.users
             GROUP BY 1 HAVING count(*) > 1) d;
    IF dupes IS NOT NULL THEN
        RAISE EXCEPTION
            'users.email case-collisions block uk_users_email_lower: % - these '
            'are legal under MySQL''s CI unique index but leave one account '
            'unreachable under Postgres. Adjudicate each pair by hand (they may '
            'be different people - see plan 2.3.1) before cutover', dupes;
    END IF;
END
$ci_precheck$;

DO $vendors$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT ic.relname AS idxname
        FROM pg_index i
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_class c ON c.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'vendors'
          AND i.indisunique
          AND NOT i.indisprimary
          AND i.indnatts = 1
          AND i.indexprs IS NULL          -- plain column index, not lower(name)
          AND (i.indkey::int2[])[0] = (
                SELECT a.attnum FROM pg_attribute a
                 WHERE a.attrelid = c.oid AND a.attname = 'name')
    LOOP
        EXECUTE format('DROP INDEX public.%I', r.idxname);
        RAISE NOTICE 'dropped case-sensitive vendors unique index %', r.idxname;
    END LOOP;
END
$vendors$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_vendors_name_lower
    ON public.vendors (lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email_lower
    ON public.users (lower(email));


-- ===========================================================================
-- 4. updated_at maintenance
--
-- WHY: MySQL's `ON UPDATE CURRENT_TIMESTAMP` has no PostgreSQL equivalent and
-- the app does NOT consistently write updated_at itself. Without this, every
-- one of these columns freezes at its import value.
--
-- Semantics deliberately match MySQL: the timestamp is refreshed only when the
-- UPDATE did not assign the column explicitly. If a statement sets updated_at
-- itself, that value wins — same as MySQL.
--
-- That last paragraph was DEAD CODE until §4a existed: pgloader emits its own
-- BEFORE UPDATE trigger on these same 14 tables, it sorts first by name, and it
-- overwrites the column unconditionally. §4a drops it. Do not run §4 without
-- §4a — installing this trigger alongside pgloader's is strictly worse than
-- neither, because it looks correct.
--
-- One function, parameterised by column name via TG_ARGV[0], because the set is
-- not uniform: password_resets stamps `created_at`, not `updated_at`.
--
-- The 14 pairs below are exactly `extra LIKE '%on update%'` from the source
-- information_schema. Regenerate with:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema = DATABASE() AND extra LIKE '%on update%'
--   ORDER BY table_name, column_name;
--
-- Was 16 until the 2026-08 cutover reconciliation: the dev snapshot carries
-- daily_pay_enrollments and daily_pay_settings, which do not exist on prod.
-- Regenerated against prod, the query returns 14.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
    col     text := COALESCE(TG_ARGV[0], 'updated_at');
    new_j   jsonb := to_jsonb(NEW);
    old_j   jsonb := to_jsonb(OLD);
BEGIN
    -- Explicit assignment wins (MySQL ON UPDATE CURRENT_TIMESTAMP semantics).
    IF new_j -> col IS DISTINCT FROM old_j -> col THEN
        RETURN NEW;
    END IF;
    RETURN jsonb_populate_record(
             NEW,
             new_j || jsonb_build_object(col, to_jsonb(clock_timestamp())));
END
$fn$;

COMMENT ON FUNCTION public.set_updated_at() IS
    'BEFORE UPDATE stand-in for MySQL ON UPDATE CURRENT_TIMESTAMP. '
    'Pass the target column as the trigger argument (defaults to updated_at).';

DO $triggers$
DECLARE
    r     record;
    n     int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('advances',                       'updated_at'),
            ('document_files',                 'updated_at'),
            ('feature_flags',                  'updated_at'),
            ('job_applications',               'updated_at'),
            ('job_postings',                   'updated_at'),
            ('password_resets',                'created_at'),
            ('prices',                         'updated_at'),
            ('product_marketing',              'updated_at'),
            ('products',                       'updated_at'),
            ('scheduled_expense_applications', 'updated_at'),
            ('scheduled_expenses',             'updated_at'),
            ('subscriber_subscriptions',       'updated_at'),
            ('subscribers',                    'updated_at'),
            ('vendor_field_definitions',       'updated_at')
        ) AS v(tbl, col)
    LOOP
        IF to_regclass('public.' || quote_ident(r.tbl)) IS NULL THEN
            RAISE EXCEPTION
                'post-import-fixups: table public.% missing - the updated_at '
                'trigger list is stale vs the source schema', r.tbl;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = r.tbl AND column_name = r.col) THEN
            RAISE EXCEPTION
                'post-import-fixups: column %.% missing - the updated_at '
                'trigger list is stale vs the source schema', r.tbl, r.col;
        END IF;

        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I',
                       r.tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(%L)',
            r.tbl, r.col);
        n := n + 1;
    END LOOP;

    RAISE NOTICE 'updated_at triggers installed: %', n;
END
$triggers$;


-- ===========================================================================
-- 4a. Undo pgloader's OWN ON UPDATE CURRENT_TIMESTAMP handling, and restore the
--     column shape it silently dropped.
--
-- Three defects, same 14 columns, all three found by adversarial review of the
-- 2026-08 cutover rehearsal and all three reproduced against prod.
--
-- ROOT CAUSE (one, shared): pgloader routes every column carrying the MySQL
-- `on update current_timestamp()` **extra** through its own built-in
-- ON-UPDATE code path instead of the user CAST rules in local-import.load.
-- Measured against prod 2026-08 the 2x2 is clean — the only variable is the
-- extra, and the columns differ in nothing else:
--
--   source type   ON UPDATE?   what pgloader emitted
--   -----------   ----------   ---------------------------------------------
--   datetime      no           timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
--   datetime      YES          timestamptz  NULL, no default
--   timestamp     no           timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP
--   timestamp     YES          timestamptz  NULL, no default
--
-- (row 1 = job_applications.submitted_at / job_postings.created_at,
--  row 2 = job_applications.updated_at  / job_postings.updated_at,
--  row 3 = advances.created_at, subscribers.created_at, ...,
--  row 4 = the other 12 of the 14.)
--
-- (1) NOT NULL + DEFAULT. In the source all 14 are
--     `NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()`, so
--     MySQL stamps the row on INSERT when the column is omitted — which is what
--     every insert path in the app relies on (no repository writes updated_at on
--     insert). An unfixed target writes NULL into a column the app's generated
--     types call `Date`. Restored below: SET DEFAULT now(), then SET NOT NULL
--     after proving the column holds no NULLs.
--
-- (2) THE TYPE OF THE 2 datetime COLUMNS (row 2 above). Because the ON UPDATE
--     path bypasses the CAST rules, `job_applications.updated_at` and
--     `job_postings.updated_at` land as `timestamp WITH time zone` while every
--     other MySQL datetime in the schema — including their own siblings
--     `job_applications.submitted_at` and `job_postings.created_at` — correctly
--     lands `timestamp WITHOUT time zone`. They are the ONLY 2 violations of the
--     datetime->timestamp decision in the whole import. Converted here with
--     `AT TIME ZONE 'UTC'`, which is value-preserving rather than merely
--     type-changing: the import runs under `SET timezone TO 'UTC'` and the
--     source server is UTC (README "Preflight"), so the instant and the naive
--     wall clock are the same number. validate.sh check C re-proves min/max/null
--     parity against the source afterwards.
--
-- (3) pgloader's OWN TRIGGERS. It emits, per table, a BEFORE UPDATE trigger
--     named `on_update_current_timestamp` calling
--     `on_update_current_timestamp_<table>()`, whose entire body is the
--     unconditional `NEW.<col> = now(); RETURN NEW;`. PostgreSQL fires triggers
--     of the same kind in NAME order and `on_update_current_timestamp` sorts
--     before `trg_set_updated_at`, so §4's trigger ran second, on a NEW row
--     whose column had already been overwritten. That made §4's
--     explicit-assignment test (`NEW.col IS DISTINCT FROM OLD.col`) true for
--     EVERY update and the MySQL-matching "explicit assignment wins" semantics
--     dead code: `UPDATE ... SET updated_at = <value>` was silently discarded.
--     Dropped here by NAME PATTERN (not by a table list, so a 15th ON UPDATE
--     column added to the source later is still caught), together with the
--     functions, which are dropped only once nothing references them.
--
-- Idempotent: every step is skipped when already satisfied.
-- ===========================================================================
DO $ouct$
DECLARE
    r        record;
    curtype  text;
    curdef   text;
    n_null   bigint;
    n_trg    int := 0;
    n_fn     int := 0;
    n_type   int := 0;
    n_def    int := 0;
    n_nn     int := 0;
    n_cols   int := 0;
BEGIN
    -- (a) pgloader's triggers, matched by name pattern.
    FOR r IN
        SELECT c.relname AS tbl, tg.tgname AS trg
          FROM pg_trigger   tg
          JOIN pg_class     c ON c.oid = tg.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND NOT tg.tgisinternal
           AND tg.tgname LIKE 'on\_update\_current\_timestamp%'
    LOOP
        EXECUTE format('DROP TRIGGER %I ON public.%I', r.trg, r.tbl);
        n_trg := n_trg + 1;
        RAISE NOTICE 'dropped pgloader trigger %.% (it overwrote NEW.% unconditionally)',
                     r.tbl, r.trg, 'updated_at';
    END LOOP;

    -- ... and their functions, but only once no trigger still points at them.
    FOR r IN
        SELECT p.proname
          FROM pg_proc      p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname LIKE 'on\_update\_current\_timestamp%'
           AND NOT EXISTS (SELECT 1 FROM pg_trigger tg WHERE tg.tgfoid = p.oid)
    LOOP
        EXECUTE format('DROP FUNCTION public.%I()', r.proname);
        n_fn := n_fn + 1;
    END LOOP;

    -- (b) the column shape, driven by the SAME 14-pair list as §4 plus the
    --     target type each column must end up with. Regenerate all three
    --     together (see §4's comment for the source query); the two
    --     `timestamp without time zone` entries are exactly the source's two
    --     `datetime` ON UPDATE columns.
    FOR r IN
        SELECT * FROM (VALUES
            ('advances',                       'updated_at', 'timestamp with time zone'),
            ('document_files',                 'updated_at', 'timestamp with time zone'),
            ('feature_flags',                  'updated_at', 'timestamp with time zone'),
            ('job_applications',               'updated_at', 'timestamp without time zone'),
            ('job_postings',                   'updated_at', 'timestamp without time zone'),
            ('password_resets',                'created_at', 'timestamp with time zone'),
            ('prices',                         'updated_at', 'timestamp with time zone'),
            ('product_marketing',              'updated_at', 'timestamp with time zone'),
            ('products',                       'updated_at', 'timestamp with time zone'),
            ('scheduled_expense_applications', 'updated_at', 'timestamp with time zone'),
            ('scheduled_expenses',             'updated_at', 'timestamp with time zone'),
            ('subscriber_subscriptions',       'updated_at', 'timestamp with time zone'),
            ('subscribers',                    'updated_at', 'timestamp with time zone'),
            ('vendor_field_definitions',       'updated_at', 'timestamp with time zone')
        ) AS v(tbl, col, want_type)
    LOOP
        SELECT data_type INTO curtype
          FROM information_schema.columns
         WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col;
        IF curtype IS NULL THEN
            RAISE EXCEPTION
                'post-import-fixups: column %.% missing - the ON UPDATE column '
                'list is stale vs the source schema', r.tbl, r.col;
        END IF;

        -- (b1) type: the MINOR-1 realignment. Value-preserving, see the header.
        IF curtype <> r.want_type THEN
            IF curtype = 'timestamp with time zone'
               AND r.want_type = 'timestamp without time zone' THEN
                EXECUTE format(
                    'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamp without time zone '
                    'USING (%I AT TIME ZONE ''UTC'')', r.tbl, r.col, r.col);
                n_type := n_type + 1;
                RAISE NOTICE 'retyped %.% timestamptz -> timestamp (source is datetime)',
                             r.tbl, r.col;
            ELSE
                RAISE EXCEPTION
                    'post-import-fixups: %.% is % but the source says it must be % - '
                    'pgloader''s cast behaviour changed, reconcile before cutover',
                    r.tbl, r.col, curtype, r.want_type;
            END IF;
        END IF;

        -- (b2) DEFAULT. `now()` is the direct equivalent of the source's
        --      `DEFAULT current_timestamp()`, and is what pgloader itself
        --      emitted (as CURRENT_TIMESTAMP) for the sibling columns that had
        --      no ON UPDATE - so the pair stays consistent under any session
        --      time zone.
        SELECT column_default INTO curdef
          FROM information_schema.columns
         WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col;
        IF curdef IS NULL THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT now()',
                           r.tbl, r.col);
            n_def := n_def + 1;
            RAISE NOTICE 'SET DEFAULT now() on %.%', r.tbl, r.col;
        END IF;

        -- (b3) NOT NULL, but never blindly: count first and name the offender.
        --      A NULL here means an insert already ran against the unfixed
        --      target, which a cutover operator has to know about.
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name=r.tbl
               AND column_name=r.col AND is_nullable='YES') THEN
            EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NULL',
                           r.tbl, r.col) INTO n_null;
            IF n_null > 0 THEN
                RAISE EXCEPTION
                    '%.% has % NULL row(s) but is NOT NULL in the source '
                    '(ON UPDATE CURRENT_TIMESTAMP columns are all NOT NULL '
                    'DEFAULT current_timestamp()). Something wrote to this '
                    'target before the fixups ran - reload rather than patch',
                    r.tbl, r.col, n_null;
            END IF;
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',
                           r.tbl, r.col);
            n_nn := n_nn + 1;
        END IF;

        n_cols := n_cols + 1;
    END LOOP;

    IF n_cols <> 14 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: expected 14 ON UPDATE columns, accounted %', n_cols;
    END IF;

    RAISE NOTICE
        'pgloader ON UPDATE cleanup: % trigger(s) + % function(s) dropped; '
        '% retyped, % defaults set, % set NOT NULL (of 14)',
        n_trg, n_fn, n_type, n_def, n_nn;
END
$ouct$;


-- ===========================================================================
-- 5. Drop the btree stand-ins pgloader emitted for MySQL FULLTEXT indexes
--
-- WHY: MySQL has 2 FULLTEXT indexes — document_files.idx_search(name,
-- description) and invoice_audit.idx_customer_search(current_first_name,
-- current_last_name, current_address, current_city). pgloader does not
-- understand FULLTEXT and reproduces them as multi-column btrees, which serve
-- no query in this app (there is no MATCH...AGAINST anywhere in the codebase —
-- search goes through LIKE/ILIKE) and cost write throughput plus, on
-- document_files.description (text), risk btree row-size errors on long values.
--
-- Deliberately NOT ported to tsvector/GIN: nothing would use it. If full-text
-- search is ever wanted, add a generated tsvector column + GIN index as a
-- normal migration.
--
-- Located by SHAPE (the exact key-column list), not by name: pgloader's
-- `idx_<source-oid>_<name>` prefix is not stable across runs, and a name-only
-- match would silently no-op if MariaDB 10.6 produced a different name at
-- cutover — leaving both stand-ins on prod while the script still printed
-- "ALL ASSERTIONS PASSED". Section 7 asserts that neither shape survives.
-- ===========================================================================
DO $fulltext$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT ic.relname AS idxname, c.relname AS tbl
        FROM pg_index i
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_class c  ON c.oid  = i.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND NOT i.indisprimary
          AND NOT i.indisunique
          AND i.indexprs IS NULL
          AND (
                (c.relname = 'document_files'
                 AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
                        FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(att, ord)
                        JOIN pg_attribute a
                          ON a.attrelid = i.indrelid AND a.attnum = k.att)
                     = ARRAY['name','description'])
             OR (c.relname = 'invoice_audit'
                 AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
                        FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(att, ord)
                        JOIN pg_attribute a
                          ON a.attrelid = i.indrelid AND a.attnum = k.att)
                     = ARRAY['current_first_name','current_last_name',
                             'current_address','current_city'])
              )
    LOOP
        EXECUTE format('DROP INDEX public.%I', r.idxname);
        RAISE NOTICE 'dropped un-ported FULLTEXT stand-in index %.%', r.tbl, r.idxname;
    END LOOP;
END
$fulltext$;


-- ===========================================================================
-- 6. CHECK constraints
--
-- WHY: pgloader carries columns, indexes, PKs and FKs — it does NOT carry CHECK
-- constraints. The source has 12 and the target would silently end up with 0:
--
--   advances.chk_advances_amount_positive   CHECK (amount > 0)
--       Hand-authored in src/lib/database/migrations/010_..., applied to prod.
--       advances feed payroll totals, so losing it means a negative advance
--       from a bug or a bad payload propagates into paystub math with no
--       database-level backstop that exists on MySQL today.
--   document_files.tags / .metadata, invoices.custom_fields,
--   product_marketing.feature_list, payroll_audit.{advances,expenses,invoices,
--   overrides,payroll,paystub}_data, _bak_2926_invoices.custom_fields
--                                           CHECK (json_valid(col))
--       These are MariaDB's implementation of a JSON column (JSON is LONGTEXT
--       + an auto-generated json_valid CHECK). We deliberately keep the columns
--       as `text` in Postgres (the app hand-parses; see the json->text cast
--       rule), which is exactly why the validity check has to be restored
--       explicitly: without it the columns become free-text and the app's
--       JSON.parse sites are the only thing standing between a malformed write
--       and a broken read. Phase 1 item E made those sites degrade gracefully;
--       this keeps the bad value out in the first place.
--
-- Regenerate the source list with:
--   SELECT tc.table_name, tc.constraint_name, cc.check_clause
--   FROM information_schema.table_constraints tc
--   JOIN information_schema.check_constraints cc USING (constraint_schema, constraint_name)
--   WHERE tc.table_schema = DATABASE() AND tc.constraint_type='CHECK';
--
-- ENGINE DRIFT — this list was 5 until the 2026-08 cutover reconciliation, and
-- 5 is the DEV number, not prod's. It is exactly the divergence README's
-- cutover note warns about, so spelling it out:
--
--   * The dev snapshot is MySQL 8, where JSON is a NATIVE column type. Its
--     `payroll_audit.*_data` columns are `data_type='json'` and carry NO
--     auto-generated CHECK — so dev's information_schema reports 5.
--   * Prod is MariaDB 10.6, where JSON is LONGTEXT + an auto-generated
--     `json_valid()` CHECK named after the COLUMN (`document_files.tags`, not
--     `document_files_chk_1`). Prod's `payroll_audit.*_data` are longtext and
--     contribute 6 CHECKs; the prod-only `_bak_2926_invoices.custom_fields`
--     contributes a 7th. Prod reports 12.
--
-- That matters beyond bookkeeping: validate.sh check F reads its expected CHECK
-- total from the SOURCE (`information_schema.table_constraints`, so 12 on prod)
-- and adds one per ex-ENUM column. Restoring only the dev-era 5 would leave the
-- target 7 short and fail the gate. Restoring all 12 is also the faithful
-- outcome — under MariaDB these columns really are constrained today, and
-- pgloader drops the constraint while keeping the column, which is precisely
-- the silent widening §6 exists to undo.
--
-- All 12 verified clean against prod before this run: 0 rows violate any
-- json_valid (incl. 165 287 invoices.custom_fields, 333 _bak_2926_invoices,
-- 6 payroll_audit) and 0 of 88 advances rows have amount <= 0.
--
-- The JSON predicate uses the SQL/JSON `IS JSON` predicate (PostgreSQL 16+,
-- built-in and immutable), which accepts the same value set as MySQL's
-- json_valid() including top-level scalars. On PG 15 and older there is no
-- built-in equivalent, so the script falls back to a cast probe and says so.
-- MySQL's json_valid(NULL) is NULL (constraint satisfied), so every predicate
-- is NULL-guarded the same way.
--
-- Adding a constraint validates existing rows, so a source row that violates it
-- aborts the whole fixup transaction — loudly, which is what we want.
-- ===========================================================================
DO $checks$
DECLARE
    r        record;
    jsonpred text;
    n_added  int := 0;
    n_have   int := 0;
BEGIN
    IF current_setting('server_version_num')::int >= 160000 THEN
        jsonpred := '%1$I IS NULL OR %1$I IS JSON';
    ELSE
        -- Pre-16 fallback: an invalid cast raises instead of returning false,
        -- so a violating row aborts with a cast error rather than a constraint
        -- error. Same outcome (the write is rejected), noisier message.
        RAISE NOTICE 'server is pre-16: using a cast probe instead of IS JSON';
        jsonpred := '%1$I IS NULL OR (%1$I)::jsonb IS NOT NULL';
    END IF;

    FOR r IN
        SELECT * FROM (VALUES
            ('advances',            'amount',         'chk_advances_amount_positive',              '%1$I > 0'),
            ('document_files',      'tags',           'chk_document_files_tags_json',              jsonpred),
            ('document_files',      'metadata',       'chk_document_files_metadata_json',          jsonpred),
            ('invoices',            'custom_fields',  'chk_invoices_custom_fields_json',           jsonpred),
            ('product_marketing',   'feature_list',   'chk_product_marketing_feature_list_json',   jsonpred),
            ('payroll_audit',       'advances_data',  'chk_payroll_audit_advances_data_json',      jsonpred),
            ('payroll_audit',       'expenses_data',  'chk_payroll_audit_expenses_data_json',      jsonpred),
            ('payroll_audit',       'invoices_data',  'chk_payroll_audit_invoices_data_json',      jsonpred),
            ('payroll_audit',       'overrides_data', 'chk_payroll_audit_overrides_data_json',     jsonpred),
            ('payroll_audit',       'payroll_data',   'chk_payroll_audit_payroll_data_json',       jsonpred),
            ('payroll_audit',       'paystub_data',   'chk_payroll_audit_paystub_data_json',       jsonpred),
            ('_bak_2926_invoices',  'custom_fields',  'chk__bak_2926_invoices_custom_fields_json', jsonpred)
        ) AS v(tbl, col, cname, expr_tmpl)
    LOOP
        IF to_regclass('public.' || quote_ident(r.tbl)) IS NULL THEN
            RAISE EXCEPTION
                'post-import-fixups: table public.% missing - the CHECK '
                'constraint list is stale vs the source schema', r.tbl;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col) THEN
            RAISE EXCEPTION
                'post-import-fixups: column %.% missing - the CHECK constraint '
                'list is stale vs the source schema', r.tbl, r.col;
        END IF;

        IF EXISTS (
            SELECT 1 FROM pg_constraint con
              JOIN pg_class c ON c.oid = con.conrelid
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = r.tbl
               AND con.conname = r.cname AND con.contype = 'c') THEN
            n_have := n_have + 1;           -- idempotent re-run
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s)',
                       r.tbl, r.cname, format(r.expr_tmpl, r.col));
        n_added := n_added + 1;
        RAISE NOTICE 'restored CHECK %.%', r.tbl, r.cname;
    END LOOP;

    RAISE NOTICE 'CHECK constraints: % added, % already present', n_added, n_have;
END
$checks$;


-- ===========================================================================
-- 6b. Value-domain CHECK constraints for the ex-ENUM columns
--
-- WHY: section 1 turns all 20 source ENUM columns into plain `text`. That keeps
-- the string-union types and transactional migrations (plan §2.2) but it also
-- drops the *only* thing that made those unions true. Plan §2.2 says
-- "ENUM columns -> text + CHECK"; this is the CHECK half. Without it:
--
--   * MySQL (strict mode) REJECTED `subscribers.status = 'Active'`; bare text
--     accepts it. `SubscriberRepository.updateSubscriber` spreads its input
--     straight into `.set()`, so any caller that skips Zod — a backfill, a
--     hand-written cutover fix, a new route — can write a value the reads never
--     match again (`getAllSubscribers({status:'active'})` compares text with
--     `=`, which is case-sensitive here). The row does not error; it silently
--     disappears from every admin list filter.
--   * The repositories assert these unions with Kysely `$narrowType<...>()`,
--     which is compile-time only. TypeScript then believes the value is one of
--     the literals, so no defensive branch exists downstream.
--
-- The 20 (table, column, allowed values) triples below are exactly the source
-- ENUM definitions. Regenerate with:
--   SELECT table_name, column_name, column_type FROM information_schema.columns
--   WHERE table_schema = DATABASE() AND data_type='enum' ORDER BY 1,2;
--
-- Was 21 until the 2026-08 cutover reconciliation: the dev snapshot carries
-- daily_punch_records.status, which does not exist on prod. Regenerated against
-- prod, the query returns 20 and every value array below matches byte for byte.
--
-- NULL satisfies a CHECK by definition, matching MySQL, where a nullable ENUM
-- accepts NULL: document_files.status/.storage_type, job_postings.salary_type
-- and user_impersonation_log.end_reason are the nullable ones. The predicate
-- spells the NULL branch out anyway, to match §6's JSON predicates.
--
-- Adding a constraint validates existing rows, so an out-of-domain value aborts
-- the whole fixup transaction. Verified clean against the 2026-08 snapshot: all
-- 29 distinct live values across these 20 columns are in-domain (re-verified
-- against prod at the 2026-08 cutover: 0 out-of-domain values).
--
-- These are NOT case-insensitive. MySQL ENUM comparison used the column's `_ci`
-- collation, so `'ACTIVE'` would have been *accepted* and stored as `'active'`.
-- Under Postgres it is rejected outright instead. That is stricter, not looser,
-- and it fails loudly at the write rather than silently at every later read —
-- which is the whole point of the constraint.
-- ===========================================================================
DO $enumchecks$
DECLARE
    r        record;
    n_added  int := 0;
    n_have   int := 0;
    coltype  text;
    expr     text;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('advance_audit',            'action_type',     ARRAY['CREATE','UPDATE','DELETE']),
            ('document_files',           'status',          ARRAY['uploading','active','archived','deleted']),
            ('document_files',           'storage_type',    ARRAY['vercel_blob']),
            ('expense_audit',            'action_type',     ARRAY['CREATE','UPDATE','DELETE']),
            ('feature_flag_overrides',   'context_type',    ARRAY['user','role','subscriber']),
            ('invoice_audit',            'action_type',     ARRAY['UPDATE','DELETE']),
            ('job_applications',         'status',          ARRAY['new','reviewing','contacted','rejected','hired']),
            ('job_postings',             'department',      ARRAY['sales','operations','engineering','marketing','admin','other']),
            ('job_postings',             'employment_type', ARRAY['full-time','part-time','contract','seasonal']),
            ('job_postings',             'salary_show_as',  ARRAY['range','starting-at','up-to','exact','hidden']),
            ('job_postings',             'salary_type',     ARRAY['hourly','annual']),
            ('job_postings',             'status',          ARRAY['draft','active','filled','closed']),
            ('job_postings',             'work_setting',    ARRAY['remote','hybrid','in-person']),
            ('prices',                   'interval',        ARRAY['month','quarter','year','one_time']),
            ('product_marketing',        'category',        ARRAY['tier','addon']),
            ('products',                 'type',            ARRAY['recurring','one_time','custom']),
            ('subscribers',              'status',          ARRAY['active','past_due','canceled','paused']),
            ('user_impersonation_log',   'end_reason',      ARRAY['manual','expired','rejected_mutation','superseded']),
            ('users',                    'role',            ARRAY['admin','author','subscriber']),
            ('vendor_field_definitions', 'source',          ARRAY['builtin','custom'])
        ) AS v(tbl, col, vals)
    LOOP
        IF to_regclass('public.' || quote_ident(r.tbl)) IS NULL THEN
            RAISE EXCEPTION
                'post-import-fixups: table public.% missing - the ex-ENUM '
                'CHECK list is stale vs the source schema', r.tbl;
        END IF;

        SELECT data_type INTO coltype
          FROM information_schema.columns
         WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col;

        IF coltype IS NULL THEN
            RAISE EXCEPTION
                'post-import-fixups: column %.% missing - the ex-ENUM CHECK '
                'list is stale vs the source schema', r.tbl, r.col;
        END IF;

        -- Section 1 must have run: a surviving enum type reports as USER-DEFINED
        -- and a CHECK on it would be redundant-but-wrong to add here.
        IF coltype NOT IN ('text', 'character varying', 'character') THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% is %, expected text - section 1 '
                '(enum->text) did not cover it', r.tbl, r.col, coltype;
        END IF;

        IF EXISTS (
            SELECT 1 FROM pg_constraint con
              JOIN pg_class c ON c.oid = con.conrelid
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = r.tbl
               AND con.conname = format('chk_%s_%s_enum', r.tbl, r.col)
               AND con.contype = 'c') THEN
            n_have := n_have + 1;           -- idempotent re-run
            CONTINUE;
        END IF;

        expr := format(
            '%1$I IS NULL OR %1$I IN (%2$s)',
            r.col,
            (SELECT string_agg(quote_literal(v), ', ') FROM unnest(r.vals) AS v));

        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s)',
                       r.tbl, format('chk_%s_%s_enum', r.tbl, r.col), expr);
        n_added := n_added + 1;
        RAISE NOTICE 'ex-ENUM CHECK %.% (%)', r.tbl, r.col, array_length(r.vals, 1);
    END LOOP;

    IF n_added + n_have <> 20 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: expected 20 ex-ENUM CHECK constraints, accounted %',
            n_added + n_have;
    END IF;

    RAISE NOTICE 'ex-ENUM CHECK constraints: % added, % already present',
                 n_added, n_have;
END
$enumchecks$;


-- ===========================================================================
-- 6c. NOT NULL on the five Stripe identifier columns
--
-- WHY: all five are `NULL: YES` in the source too, so the import is faithful —
-- but the app has always treated them as required. Every insert path lives in
-- exactly one repository each (ProductRepository.createProduct/createPrice,
-- SubscriberRepository.createSubscriber, BillingRepository.createSubscription/
-- .createPaymentRecord) and each takes the id as a non-optional argument; the
-- pre-migration hand-maintained types.ts declared them non-null. Under Kysely
-- that invariant is now spelled as `$narrowType<{...: NotNull}>()` at 9 read
-- sites — a compile-time assertion with nothing behind it.
--
-- A Stripe webhook race or a partial import that left, say,
-- payment_history.stripe_invoice_id NULL would hand a consumer a `null` at a
-- position TypeScript swears is `string`, and it would surface as a runtime
-- throw inside a Stripe SDK call, not as a type error. Making the column NOT
-- NULL turns the assertion into a fact the database enforces.
--
-- Safe: 0 NULLs in all five columns in the 2026-08 snapshot (re-checked before
-- each ALTER below, which would fail loudly anyway). Once kysely-codegen is
-- re-run against a database with these constraints, the 9 `NotNull` narrowings
-- become redundant and can be deleted.
-- ===========================================================================
DO $stripenn$
DECLARE
    r       record;
    n_null  bigint;
    n_set   int := 0;
    n_have  int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('products',                 'stripe_product_id'),
            ('prices',                   'stripe_price_id'),
            ('subscribers',              'stripe_customer_id'),
            ('subscriber_subscriptions', 'stripe_subscription_id'),
            ('payment_history',          'stripe_invoice_id')
        ) AS v(tbl, col)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col) THEN
            RAISE EXCEPTION
                'post-import-fixups: column %.% missing - the Stripe-id NOT '
                'NULL list is stale vs the source schema', r.tbl, r.col;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name=r.tbl
               AND column_name=r.col AND is_nullable='NO') THEN
            n_have := n_have + 1;           -- idempotent re-run
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NULL',
                       r.tbl, r.col) INTO n_null;
        IF n_null > 0 THEN
            RAISE EXCEPTION
                '%.% has % NULL row(s) - the app treats this Stripe id as '
                'required (see the repository insert paths). A human must '
                'backfill or delete those rows in the SOURCE database before '
                'cutover', r.tbl, r.col, n_null;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',
                       r.tbl, r.col);
        n_set := n_set + 1;
        RAISE NOTICE 'SET NOT NULL %.%', r.tbl, r.col;
    END LOOP;

    IF n_set + n_have <> 5 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: expected 5 NOT NULL Stripe id columns, accounted %',
            n_set + n_have;
    END IF;

    RAISE NOTICE 'Stripe id NOT NULL: % set, % already', n_set, n_have;
END
$stripenn$;


-- ===========================================================================
-- 7. Final assertions — the script must not "succeed" quietly on a bad import.
-- ===========================================================================
DO $assert$
DECLARE
    n_enum_cols   int;
    n_enum_types  int;
    n_big         int;
    n_big_other   int;
    n_trg         int;
    n_trg_other   int;
    n_ouct_fn     int;
    n_ts_shape    int;
    n_ts_naive    int;
    n_bool        int;
    n_jsonb       int;
    n_chk         int;
    n_vend_ci     int;
    n_ft          int;
BEGIN
    -- (a) zero enum-typed columns remain, and zero enum types remain
    SELECT count(*) INTO n_enum_cols
      FROM pg_attribute a
      JOIN pg_class     c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_type      t ON t.oid = a.atttypid
     WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0
       AND NOT a.attisdropped AND t.typtype='e';
    IF n_enum_cols <> 0 THEN
        RAISE EXCEPTION 'ASSERT FAILED: % enum-typed columns remain', n_enum_cols;
    END IF;

    SELECT count(*) INTO n_enum_types
      FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
     WHERE t.typtype='e' AND n.nspname='public';
    IF n_enum_types <> 0 THEN
        RAISE EXCEPTION 'ASSERT FAILED: % enum types remain', n_enum_types;
    END IF;

    -- (b) none of the 60 formerly-unsigned columns is still bigint
    --     (same list as §2 — regenerate BOTH together)
    SELECT count(*) INTO n_big
      FROM (VALUES
            ('_bak_2926_expenses','expid'),('_bak_2926_invoices','invoice_id'),
            ('_bak_2926_overrides','ovrid'),('_bak_2926_paystubs','id'),
            ('comments','from_user'),('comments','id'),('comments','on_post'),
            ('company_options','id'),('documents','id'),
            ('employee_invoice','employee_id'),('employee_invoice','invoice_id'),
            ('employee_permission','employee_id'),('employee_permission','permission_id'),
            ('employee_user','employee_id'),('employee_user','user_id'),
            ('employees','id'),('expenses','expid'),
            ('invoice_audit','changed_by'),('invoice_audit','invoice_id'),
            ('invoices','invoice_id'),('jobs','available_at'),('jobs','created_at'),
            ('jobs','id'),('jobs','reserved_at'),('links','id'),
            ('manager_employees','employee_id'),('manager_employees','id'),
            ('manager_employees','manager_id'),('oauth_access_tokens','client_id'),
            ('oauth_auth_codes','client_id'),('oauth_clients','id'),
            ('oauth_personal_access_clients','client_id'),
            ('oauth_personal_access_clients','id'),('overrides','ovrid'),
            ('payroll','agent_id'),('payroll','id'),('payroll_restriction','id'),
            ('paystubs','id'),('permissions','id'),('personal_access_tokens','id'),
            ('personal_access_tokens','tokenable_id'),('posts','author_id'),
            ('posts','id'),('scheduled_expense_applications','id'),
            ('subscriber_user','user_id'),('tagging_tag_groups','id'),
            ('tagging_tagged','id'),('tagging_tagged','taggable_id'),
            ('tagging_tags','count'),('tagging_tags','id'),
            ('tagging_tags','tag_group_id'),('testimonial_types','id'),
            ('testimonials','id'),('user_impersonation_log','id'),
            ('user_notifications','employee_id'),('user_notifications','id'),
            ('user_notifications','user_id'),('users','uid'),
            ('vendor_field_definitions','vendor_id'),('vendors','id')
           ) AS v(tbl,col)
      JOIN information_schema.columns ic
        ON ic.table_schema='public' AND ic.table_name=v.tbl
       AND ic.column_name=v.col
     WHERE ic.data_type IN ('bigint', 'numeric');
    IF n_big <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % formerly-unsigned columns are still bigint/numeric',
            n_big;
    END IF;

    -- (b2) NOTHING else is bigint either: after §2 + §2b the only bigint
    --      columns left must be the 5 genuinely-signed source BIGINTs. This is
    --      the invariant that keeps kysely-codegen from typing ids as `string`
    --      (int8 -> string), and it is what validate.sh check F compares
    --      against the source's own signed-BIGINT count.
    SELECT count(*) INTO n_big_other
      FROM information_schema.columns ic
     WHERE ic.table_schema='public' AND ic.data_type='bigint'
       AND (ic.table_name, ic.column_name) NOT IN (
             ('document_files',      'file_size'),
             ('invoice_audit',       'id'),
             ('oauth_access_tokens', 'user_id'),
             ('oauth_auth_codes',    'user_id'),
             ('oauth_clients',       'user_id'));
    IF n_big_other <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % unexpected bigint column(s) remain beyond the 5 '
            'genuinely-signed source BIGINTs - §2b did not cover them', n_big_other;
    END IF;

    -- (c) NO tinyint(1) became boolean anywhere. The app compares flags with
    --     `=== 1` and writes 1/0; a boolean column silently breaks all of it.
    SELECT count(*) INTO n_bool
      FROM information_schema.columns
     WHERE table_schema='public' AND data_type='boolean';
    IF n_bool <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % boolean columns exist - the tinyint cast rule did '
            'not take effect (app reads flags with === 1)', n_bool;
    END IF;

    -- (d) no json/jsonb columns: the app hand-parses JSON strings
    SELECT count(*) INTO n_jsonb
      FROM information_schema.columns
     WHERE table_schema='public' AND data_type IN ('json','jsonb');
    IF n_jsonb <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % json/jsonb columns exist - they must be text '
            '(node-postgres would auto-parse and JSON.parse(object) throws)', n_jsonb;
    END IF;

    -- (e) all 14 updated_at triggers present (see §4 — was 16 against the dev
    --     snapshot, which has two daily_pay tables prod does not)
    SELECT count(*) INTO n_trg
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND NOT tg.tgisinternal
       AND tg.tgname = 'trg_set_updated_at';
    IF n_trg <> 14 THEN
        RAISE EXCEPTION 'ASSERT FAILED: expected 14 trg_set_updated_at triggers, found %',
                        n_trg;
    END IF;

    -- (e2) ... and OURS IS THE ONLY ONE. Counting our 14 was never sufficient:
    --      pgloader's own `on_update_current_timestamp` BEFORE UPDATE triggers
    --      coexisted with them happily, fired FIRST (name order), and
    --      unconditionally overwrote the column - which silently turned §4's
    --      "explicit assignment wins" semantics into dead code while this
    --      assertion still passed. See §4a(3).
    SELECT count(*) INTO n_trg_other
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND NOT tg.tgisinternal
       AND (tg.tgtype & 2)  <> 0        -- BEFORE
       AND (tg.tgtype & 16) <> 0        -- UPDATE
       AND tg.tgname <> 'trg_set_updated_at'
       AND c.relname IN ('advances','document_files','feature_flags',
                         'job_applications','job_postings','password_resets',
                         'prices','product_marketing','products',
                         'scheduled_expense_applications','scheduled_expenses',
                         'subscriber_subscriptions','subscribers',
                         'vendor_field_definitions');
    IF n_trg_other <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % other BEFORE UPDATE trigger(s) on the 14 ON UPDATE '
            'tables - anything firing before trg_set_updated_at defeats it', n_trg_other;
    END IF;

    SELECT count(*) INTO n_ouct_fn
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname LIKE 'on\_update\_current\_timestamp%';
    IF n_ouct_fn <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % pgloader on_update_current_timestamp function(s) '
            'remain - §4a did not clean up', n_ouct_fn;
    END IF;

    -- (e3) each of the 14 columns is NOT NULL with a non-null DEFAULT, exactly
    --      as in the source. pgloader dropped both on every one of them, so the
    --      source stamped the row on INSERT and the target wrote NULL. §4a(1).
    SELECT count(*) INTO n_ts_shape
      FROM (VALUES
            ('advances','updated_at'),('document_files','updated_at'),
            ('feature_flags','updated_at'),('job_applications','updated_at'),
            ('job_postings','updated_at'),('password_resets','created_at'),
            ('prices','updated_at'),('product_marketing','updated_at'),
            ('products','updated_at'),('scheduled_expense_applications','updated_at'),
            ('scheduled_expenses','updated_at'),('subscriber_subscriptions','updated_at'),
            ('subscribers','updated_at'),('vendor_field_definitions','updated_at')
           ) AS v(tbl,col)
      JOIN information_schema.columns ic
        ON ic.table_schema='public' AND ic.table_name=v.tbl AND ic.column_name=v.col
     WHERE ic.is_nullable='NO' AND ic.column_default IS NOT NULL;
    IF n_ts_shape <> 14 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: only % of 14 ON UPDATE columns are NOT NULL with a '
            'DEFAULT - an INSERT that omits the column would write NULL', n_ts_shape;
    END IF;

    -- (e4) the 2 source `datetime` ON UPDATE columns are naive timestamps, like
    --      every other datetime in the schema. §4a(2) / MINOR-1.
    SELECT count(*) INTO n_ts_naive
      FROM information_schema.columns
     WHERE table_schema='public'
       AND (table_name, column_name) IN (('job_applications','updated_at'),
                                         ('job_postings','updated_at'))
       AND data_type = 'timestamp without time zone';
    IF n_ts_naive <> 2 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % of 2 source-datetime ON UPDATE columns are '
            '`timestamp without time zone` - pgloader''s ON UPDATE path types '
            'them timestamptz, against the datetime->timestamp decision', n_ts_naive;
    END IF;

    -- (f) the case-insensitive unique indexes exist ...
    IF to_regclass('public.uk_vendors_name_lower') IS NULL THEN
        RAISE EXCEPTION 'ASSERT FAILED: uk_vendors_name_lower missing';
    END IF;
    IF to_regclass('public.uk_users_email_lower') IS NULL THEN
        RAISE EXCEPTION 'ASSERT FAILED: uk_users_email_lower missing';
    END IF;

    --     ... and the case-SENSITIVE vendors one is really gone. Section 3
    --     finds it by shape; a shape miss would otherwise be silent.
    SELECT count(*) INTO n_vend_ci
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND c.relname='vendors'
       AND i.indisunique AND NOT i.indisprimary
       AND i.indnatts = 1 AND i.indexprs IS NULL
       AND (i.indkey::int2[])[0] = (SELECT a.attnum FROM pg_attribute a
                                     WHERE a.attrelid=c.oid AND a.attname='name');
    IF n_vend_ci <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % case-sensitive unique index(es) on vendors(name) '
            'still present - section 3''s shape match missed them', n_vend_ci;
    END IF;

    -- (g) neither FULLTEXT btree stand-in survived section 5 (also shape-matched)
    SELECT count(*) INTO n_ft
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND NOT i.indisprimary AND NOT i.indisunique
       AND i.indexprs IS NULL
       AND ( (c.relname='document_files'
              AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
                     FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(att, ord)
                     JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.att)
                  = ARRAY['name','description'])
          OR (c.relname='invoice_audit'
              AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
                     FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(att, ord)
                     JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.att)
                  = ARRAY['current_first_name','current_last_name',
                          'current_address','current_city']) );
    IF n_ft <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: % un-ported FULLTEXT btree stand-in(s) still present '
            '- section 5''s shape match missed them', n_ft;
    END IF;

    -- (h) all 12 source CHECK constraints restored (pgloader carries none).
    --     12, not the dev snapshot's 5: MariaDB 10.6 implements JSON as
    --     LONGTEXT + an auto-generated json_valid CHECK, so payroll_audit's six
    --     *_data columns and _bak_2926_invoices.custom_fields carry real source
    --     CHECKs that MySQL 8's native `json` type does not. See §6.
    SELECT count(*) INTO n_chk
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND con.contype='c'
       AND con.conname IN ('chk_advances_amount_positive',
                           'chk_document_files_tags_json',
                           'chk_document_files_metadata_json',
                           'chk_invoices_custom_fields_json',
                           'chk_product_marketing_feature_list_json',
                           'chk_payroll_audit_advances_data_json',
                           'chk_payroll_audit_expenses_data_json',
                           'chk_payroll_audit_invoices_data_json',
                           'chk_payroll_audit_overrides_data_json',
                           'chk_payroll_audit_payroll_data_json',
                           'chk_payroll_audit_paystub_data_json',
                           'chk__bak_2926_invoices_custom_fields_json');
    IF n_chk <> 12 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: expected 12 restored CHECK constraints, found %', n_chk;
    END IF;

    RAISE NOTICE 'post-import-fixups: ALL ASSERTIONS PASSED';
END
$assert$;

COMMIT;

-- Statistics for the planner; outside the transaction on purpose.
ANALYZE;
