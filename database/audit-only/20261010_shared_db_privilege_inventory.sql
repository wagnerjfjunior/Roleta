-- READ ONLY AUDIT: run only with authorized read-only SQL access.
-- No DDL, DML, SET ROLE or function execution.
SELECT n.nspname AS schema_name, n.nspacl AS schema_acl
FROM pg_catalog.pg_namespace n
WHERE n.nspname IN ('public','auth','forensic_evidence','roleta_audit')
ORDER BY n.nspname;

SELECT r.rolname, r.rolcanlogin, r.rolbypassrls, r.rolsuper
FROM pg_catalog.pg_roles r
WHERE r.rolname IN ('anon','authenticated','service_role','postgres','roleta_runtime')
ORDER BY r.rolname;

SELECT d.defaclrole::pg_catalog.regrole::text AS grantor_role,
       COALESCE(n.nspname,'(all schemas)') AS schema_name,
       d.defaclobjtype AS object_type,
       d.defaclacl::text AS default_acl
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
WHERE n.nspname='roleta_audit' OR d.defaclnamespace=0
ORDER BY grantor_role,schema_name,object_type;

SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       p.proacl AS function_acl
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='roleta_audit'
ORDER BY p.proname;

SELECT n.nspname AS schema_name, c.relname AS relation_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       c.relacl AS relation_acl
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='roleta_audit' AND c.relkind IN ('r','p','v','m')
ORDER BY c.relname;
