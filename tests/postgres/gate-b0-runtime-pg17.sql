-- Isolated PG17 runtime principal negative privilege check.
DO $assert$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roleta_v2_writer' AND rolcanlogin AND NOT rolbypassrls AND NOT rolsuper AND NOT rolcreaterole AND rolcreatedb AND rolpassword IS NULL)
 THEN RAISE EXCEPTION 'runtime login must exist without password or elevated rights'; END IF;
 IF NOT has_schema_privilege('roleta_v2_writer','roleta_audit','USAGE')
 OR has_schema_privilege('roleta_v2_writer','roleta_audit','CREATE')
 OR NOT has_function_privilege('roleta_v2_writer','roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)','EXECUTE')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','SELECT')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','INSERT')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','UPDATE')
 OR has_table_privilege('roleta_v2_writer','roleta_audit.prospective_evidence','DELETE')
 THEN RAISE EXCEPTION 'runtime principal must be function-only'; END IF;
 IF has_schema_privilege('authenticated','roleta_audit','USAGE')
 OR has_function_privilege('authenticated','roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'browser access accidentally granted'; END IF;
END $assert$;
