-- SFJM F3/F4 disposable PostgreSQL role isolation and callback replay smoke.
BEGIN;
DO $tests$
DECLARE
 j uuid; v jsonb; digest text; outcome text; blocked boolean;
BEGIN
 -- The API role must never have direct table privileges or bypass RLS.
 IF (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname='roleta_intake_api')
 OR (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname='roleta_intake_executor') THEN
  RAISE EXCEPTION 'privileged intake role';
 END IF;
 IF has_table_privilege('roleta_intake_api','roleta_intake.jobs','SELECT')
 OR has_table_privilege('roleta_intake_api','roleta_intake.results','INSERT')
 OR has_table_privilege('roleta_intake_api','roleta_intake.callback_nonces','INSERT') THEN
  RAISE EXCEPTION 'API has direct table access';
 END IF;
 IF NOT (SELECT relforcerowsecurity FROM pg_class WHERE oid='roleta_intake.callback_nonces'::regclass) THEN
  RAISE EXCEPTION 'nonce table missing FORCE RLS';
 END IF;
END $tests$;
SET LOCAL ROLE roleta_intake_api;
DO $tests$
DECLARE j uuid; v jsonb; digest text; outcome text; blocked boolean;
BEGIN
 -- API has EXECUTE only; operator isolation is enforced by supplied verified sub.
 j:=roleta_intake.create_job('operator-A',repeat('a',64));
 IF j IS NULL THEN RAISE EXCEPTION 'create failed'; END IF;
 IF roleta_intake.read_job(j,'operator-B') IS NOT NULL THEN RAISE EXCEPTION 'cross-operator read'; END IF;
 IF roleta_intake.start_job(j,'operator-B') THEN RAISE EXCEPTION 'cross-operator start'; END IF;
 IF NOT roleta_intake.start_job(j,'operator-A') THEN RAISE EXCEPTION 'owner start failed'; END IF;
 IF roleta_intake.start_job(j,'operator-A') THEN RAISE EXCEPTION 'duplicate dispatch permitted'; END IF;
 digest:=encode(sha256(convert_to('{"linhas":[]}'::jsonb::text,'UTF8')),'hex');
 outcome:=roleta_intake.complete_signed_callback(j,'uniqueNonce1234567890','gemini-test','{"linhas":[]}'::jsonb,digest);
 IF outcome<>'SAVED' THEN RAISE EXCEPTION 'callback failed'; END IF;
 v:=roleta_intake.read_job(j,'operator-A');
 IF v->>'state'<>'READY_FOR_REVIEW' OR v->'result' IS NULL THEN RAISE EXCEPTION 'result missing'; END IF;
 blocked:=false;
 BEGIN
  PERFORM roleta_intake.complete_signed_callback(j,'uniqueNonce1234567890','gemini-test','{"linhas":[]}'::jsonb,digest);
 EXCEPTION WHEN unique_violation THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'replayed nonce accepted'; END IF;
 blocked:=false;
 BEGIN
  EXECUTE 'SELECT count(*) FROM roleta_intake.jobs';
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'API direct table read succeeded'; END IF;
END $tests$;
RESET ROLE;
ROLLBACK;
