-- CI-only cross-schema isolation sentinel; never execute on shared production.
DO $guard$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable database required'; END IF;
END $guard$;
-- Stand-in for unrelated Discador data: no production schema or rows are copied.
CREATE SCHEMA discador_ci_private;
CREATE TABLE discador_ci_private.customer_sentinel(
 id integer PRIMARY KEY, secret text NOT NULL
);
INSERT INTO discador_ci_private.customer_sentinel VALUES (1,'CI-DO-NOT-READ');
REVOKE ALL ON SCHEMA discador_ci_private FROM PUBLIC,anon,authenticated,roleta_runtime,roleta_append_owner;
REVOKE ALL ON TABLE discador_ci_private.customer_sentinel FROM PUBLIC,anon,authenticated,roleta_runtime,roleta_append_owner;
DO $check$
DECLARE f regprocedure:='roleta_audit.append_authenticated_evidence_ci(text,text,text,text,text,text,jsonb,text)'::regprocedure;
BEGIN
 IF has_schema_privilege('roleta_runtime','discador_ci_private','USAGE')
 OR has_schema_privilege('roleta_append_owner','discador_ci_private','USAGE')
 OR has_table_privilege('roleta_runtime','discador_ci_private.customer_sentinel','SELECT')
 OR has_table_privilege('roleta_append_owner','discador_ci_private.customer_sentinel','SELECT')
 OR has_table_privilege('roleta_runtime','discador_ci_private.customer_sentinel','UPDATE')
 OR has_table_privilege('roleta_append_owner','discador_ci_private.customer_sentinel','DELETE')
 THEN RAISE EXCEPTION 'cross-schema privilege leak'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid=f) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'definer security flag missing'; END IF;
 IF (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=f)<>'roleta_append_owner'
 THEN RAISE EXCEPTION 'unexpected function owner'; END IF;
 IF (SELECT proconfig FROM pg_proc WHERE oid=f) IS NULL
 OR NOT ('search_path=pg_catalog'::text=ANY((SELECT proconfig FROM pg_proc WHERE oid=f)))
 THEN RAISE EXCEPTION 'unsafe function search_path'; END IF;
END $check$;
SET ROLE roleta_runtime;
DO $deny$
BEGIN
 BEGIN
  EXECUTE 'SELECT secret FROM discador_ci_private.customer_sentinel';
  RAISE EXCEPTION 'runtime read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  EXECUTE 'UPDATE discador_ci_private.customer_sentinel SET secret=''tampered''';
  RAISE EXCEPTION 'runtime update succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  EXECUTE 'DELETE FROM discador_ci_private.customer_sentinel';
  RAISE EXCEPTION 'runtime delete succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  EXECUTE 'INSERT INTO discador_ci_private.customer_sentinel VALUES (2,''tampered'')';
  RAISE EXCEPTION 'runtime insert succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $deny$;
RESET ROLE;
SET ROLE roleta_append_owner;
DO $deny$
BEGIN
 BEGIN
  EXECUTE 'SELECT secret FROM discador_ci_private.customer_sentinel';
  RAISE EXCEPTION 'definer owner read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  EXECUTE 'DELETE FROM discador_ci_private.customer_sentinel';
  RAISE EXCEPTION 'definer owner delete succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $deny$;
RESET ROLE;
DO $verify$
BEGIN
 IF (SELECT secret FROM discador_ci_private.customer_sentinel WHERE id=1)<>'CI-DO-NOT-READ'
 OR (SELECT count(*) FROM discador_ci_private.customer_sentinel)<>1
 THEN RAISE EXCEPTION 'sentinel was modified'; END IF;
END $verify$;
