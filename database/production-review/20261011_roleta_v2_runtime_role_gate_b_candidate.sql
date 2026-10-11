-- F2-12 Gate B.0: dedicate a credential-less DB principal to ONLY the private
-- V2 append entrypoint. This is NOT activation; password remains NULL.
-- Shared Discador/MesaCliente schemas, default ACLs and roles untouched.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
 IF to_regrole('roleta_v2_writer') IS NOT NULL THEN
   RAISE EXCEPTION 'roleta_v2_writer already exists; migration is not repeatable';
 END IF;
 IF to_regprocedure('roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)') IS NULL THEN
   RAISE EXCEPTION 'Gate A.2 must be installed before runtime role';
 END IF;
END $preflight$;
-- LOGIN WITHOUT PASSWORD cannot authenticate over Supabase SCRAM.
CREATE ROLE roleta_v2_writer
 LOGIN PASSWORD NULL NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
 NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3;
ALTER ROLE roleta_v2_writer SET search_path='pg_catalog';
GRANT USAGE ON SCHEMA roleta_audit TO roleta_v2_writer;
GRANT EXECUTE ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb) TO roleta_v2_writer;
-- Never grant SELECT/INSERT/UPDATE/DELETE on the table or any schema CREATE.
DO $postflight$
BEGIN
 IF has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','SELECT')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','INSERT')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','UPDATE')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','DELETE')
 OR has_schema_privilege('roleta_v2_writer','roleta_audit','CREATE')
 OR NOT has_function_privilege('roleta_v2_writer','roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)','EXECUTE')
 OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname='roleta_v2_writer'
     AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
 OR (SELECT rolpassword IS NOT NULL FROM pg_roles WHERE rolname='roleta_v2_writer')
 THEN RAISE EXCEPTION 'unsafe F2-12 runtime privileges/credential'; END IF;
END $postflight$;
COMMIT;
