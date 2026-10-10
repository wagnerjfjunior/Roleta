-- Run only against a disposable CI PostgreSQL database.
-- This is a negative-permissions integration test, not an approval to deploy.
DO $$
BEGIN
 IF current_database() <> 'roleta_ci' THEN RAISE EXCEPTION 'Refusing non-disposable database %', current_database(); END IF;
END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE roleta_runtime LOGIN PASSWORD 'ci-only-not-a-production-secret' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE SCHEMA extensions;
ALTER EXTENSION pgcrypto SET SCHEMA extensions;
\i database/review-only/20261010_roleta_private_ledger_candidate.sql
\i database/review-only/20261010_append_prospective_evidence_prototype.sql
DO $$
DECLARE f regprocedure := 'roleta_audit.append_prospective_evidence_review(text,text,text,text,text,jsonb,text)'::regprocedure;
BEGIN
 IF has_schema_privilege('anon','roleta_audit','USAGE') THEN RAISE EXCEPTION 'anon schema access'; END IF;
 IF has_schema_privilege('authenticated','roleta_audit','USAGE') THEN RAISE EXCEPTION 'authenticated schema access'; END IF;
 IF has_schema_privilege('roleta_runtime','roleta_audit','USAGE') THEN RAISE EXCEPTION 'runtime schema access before approval'; END IF;
 IF has_function_privilege('anon',f,'EXECUTE') THEN RAISE EXCEPTION 'anon function EXECUTE'; END IF;
 IF has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION 'authenticated function EXECUTE'; END IF;
 IF has_function_privilege('roleta_runtime',f,'EXECUTE') THEN RAISE EXCEPTION 'runtime function EXECUTE before approval'; END IF;
 IF has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','SELECT') THEN RAISE EXCEPTION 'runtime SELECT'; END IF;
 IF has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','INSERT') THEN RAISE EXCEPTION 'runtime INSERT'; END IF;
 IF has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','UPDATE') THEN RAISE EXCEPTION 'runtime UPDATE'; END IF;
 IF has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','DELETE') THEN RAISE EXCEPTION 'runtime DELETE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='roleta_audit' AND c.relname='prospective_evidence' AND c.relrowsecurity AND c.relforcerowsecurity) THEN RAISE EXCEPTION 'RLS not forced'; END IF;
END $$;
