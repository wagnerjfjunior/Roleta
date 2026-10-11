-- F2-12 — READ ONLY preflight to run before Gate A.2 migration.
-- Never change shared schemas, roles or data through this file.
WITH state AS (
 SELECT
   current_database() AS database_name,
   current_user AS executing_as,
   current_setting('server_version') AS postgres_version,
   EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='roleta_audit') AS gate_a_schema,
   EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roleta_append_owner'
     AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper) AS restricted_owner,
   EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='roleta_audit' AND p.proname='append_authenticated_person_evidence_v2')
     AS gate_a2_already_applied,
   (SELECT count(*) FROM roleta_audit.prospective_evidence) AS row_count,
   has_schema_privilege('authenticated','roleta_audit','USAGE') AS browser_schema_access,
   has_schema_privilege('service_role','roleta_audit','USAGE') AS service_schema_access,
   has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','INSERT') AS direct_runtime_insert,
   (SELECT c.relrowsecurity AND c.relforcerowsecurity
    FROM pg_class c WHERE c.oid='roleta_audit.prospective_evidence'::regclass) AS force_rls
)
SELECT *,
 CASE WHEN gate_a_schema AND restricted_owner AND NOT gate_a2_already_applied
   AND row_count=0 AND NOT browser_schema_access AND NOT service_schema_access
   AND NOT direct_runtime_insert AND force_rls
 THEN 'READY_FOR_A2_REVIEW_ONLY'
 ELSE 'STOP_AND_INVESTIGATE' END AS deployment_gate
FROM state;
