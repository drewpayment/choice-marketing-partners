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
--   3. case-insensitive unique indexes (vendors.name, users.email)
--   4. updated_at maintenance triggers (replaces ON UPDATE CURRENT_TIMESTAMP)
--   5. drop the btree stand-ins pgloader emitted for MySQL FULLTEXT indexes
--   6. CHECK constraints pgloader does not carry across
--   6b. value-domain CHECK constraints for the 21 ex-ENUM columns
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
-- (21 of them). Two problems with keeping them:
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
-- would silently retype 56 columns — including nearly every primary key and FK
-- the app arithmetic and `=== ` comparisons run on. Downcast them back.
--
-- SAFETY: each column is range-asserted BEFORE the ALTER. If any live value is
-- outside int4, the script raises and the whole transaction rolls back — we do
-- not want a silent truncation on a payroll database.
--
-- The list below is `column_type LIKE '%int unsigned%'` from the MySQL
-- information_schema (56 columns). Regenerate with:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema='choice_marketing'
--     AND column_type LIKE '%int unsigned%' AND data_type IN ('int','bigint');
-- The 6 `bigint unsigned` ones are: company_options.id, jobs.id,
-- manager_employees.id, personal_access_tokens.id, personal_access_tokens
-- .tokenable_id, user_notifications.id.
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
    n_done   int := 0;
    n_skip   int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
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

        IF curtype <> 'bigint' THEN
            RAISE EXCEPTION
                'post-import-fixups: %.% is % (expected bigint or integer) - '
                'refusing to guess', r.tbl, r.col, curtype;
        END IF;

        -- Range assertion. Fail loudly rather than truncate payroll keys.
        EXECUTE format('SELECT max(%I)::numeric, min(%I)::numeric FROM public.%I',
                       r.col, r.col, r.tbl)
           INTO maxval, minval;

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
-- One function, parameterised by column name via TG_ARGV[0], because the set is
-- not uniform: password_resets stamps `created_at`, not `updated_at`.
--
-- The 16 pairs below are exactly `extra LIKE '%on update%'` from the MySQL
-- information_schema. Regenerate with:
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema='choice_marketing' AND extra LIKE '%on update%';
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
            ('daily_pay_enrollments',          'updated_at'),
            ('daily_pay_settings',             'updated_at'),
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
-- constraints. The source has 5 and the target would silently end up with 0:
--
--   advances.chk_advances_amount_positive   CHECK (amount > 0)
--       Hand-authored in src/lib/database/migrations/010_..., applied to prod.
--       advances feed payroll totals, so losing it means a negative advance
--       from a bug or a bad payload propagates into paystub math with no
--       database-level backstop that exists on MySQL today.
--   document_files.tags / .metadata, invoices.custom_fields,
--   product_marketing.feature_list          CHECK (json_valid(col))
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
--   WHERE tc.table_schema='choice_marketing' AND tc.constraint_type='CHECK';
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
            ('advances',          'amount',        'chk_advances_amount_positive',            '%1$I > 0'),
            ('document_files',    'tags',          'chk_document_files_tags_json',            jsonpred),
            ('document_files',    'metadata',      'chk_document_files_metadata_json',        jsonpred),
            ('invoices',          'custom_fields', 'chk_invoices_custom_fields_json',         jsonpred),
            ('product_marketing', 'feature_list',  'chk_product_marketing_feature_list_json', jsonpred)
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
-- WHY: section 1 turns all 21 MySQL ENUM columns into plain `text`. That keeps
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
-- The 21 (table, column, allowed values) triples below are exactly the source
-- ENUM definitions. Regenerate with:
--   SELECT table_name, column_name, column_type FROM information_schema.columns
--   WHERE table_schema='choice_marketing' AND data_type='enum' ORDER BY 1,2;
--
-- NULL satisfies a CHECK by definition, matching MySQL, where a nullable ENUM
-- accepts NULL: document_files.status/.storage_type, job_postings.salary_type
-- and user_impersonation_log.end_reason are the nullable ones. The predicate
-- spells the NULL branch out anyway, to match §6's JSON predicates.
--
-- Adding a constraint validates existing rows, so an out-of-domain value aborts
-- the whole fixup transaction. Verified clean against the 2026-08 snapshot: all
-- 29 distinct live values across these 21 columns are in-domain.
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
            ('daily_punch_records',      'status',          ARRAY['pending','approved','declined','auto_rejected']),
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

    IF n_added + n_have <> 21 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: expected 21 ex-ENUM CHECK constraints, accounted %',
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
    n_trg         int;
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

    -- (b) none of the 56 formerly-unsigned columns is still bigint
    SELECT count(*) INTO n_big
      FROM (VALUES
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
     WHERE ic.data_type = 'bigint';
    IF n_big <> 0 THEN
        RAISE EXCEPTION 'ASSERT FAILED: % formerly-unsigned columns still bigint', n_big;
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

    -- (e) all 16 updated_at triggers present
    SELECT count(*) INTO n_trg
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND NOT tg.tgisinternal
       AND tg.tgname = 'trg_set_updated_at';
    IF n_trg <> 16 THEN
        RAISE EXCEPTION 'ASSERT FAILED: expected 16 trg_set_updated_at triggers, found %',
                        n_trg;
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

    -- (h) all 5 source CHECK constraints restored (pgloader carries none)
    SELECT count(*) INTO n_chk
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND con.contype='c'
       AND con.conname IN ('chk_advances_amount_positive',
                           'chk_document_files_tags_json',
                           'chk_document_files_metadata_json',
                           'chk_invoices_custom_fields_json',
                           'chk_product_marketing_feature_list_json');
    IF n_chk <> 5 THEN
        RAISE EXCEPTION
            'ASSERT FAILED: expected 5 restored CHECK constraints, found %', n_chk;
    END IF;

    RAISE NOTICE 'post-import-fixups: ALL ASSERTIONS PASSED';
END
$assert$;

COMMIT;

-- Statistics for the planner; outside the transaction on purpose.
ANALYZE;
