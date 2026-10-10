-- CI only. Must run AFTER disposable-security.sql in roleta_ci.
\i database/review-only/20261010_definer_privilege_disposable_candidate.sql
DO $test$
DECLARE f regprocedure:='roleta_audit.append_authenticated_evidence_ci(text,text,text,text,text,text,jsonb,text)'::regprocedure;
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'wrong DB'; END IF;
 IF NOT has_function_privilege('roleta_runtime',f,'EXECUTE') THEN RAISE EXCEPTION 'runtime cannot EXECUTE'; END IF;
 IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION 'browser roles can EXECUTE'; END IF;
 IF has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','SELECT')
 OR has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','INSERT')
 OR has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','UPDATE')
 OR has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','DELETE')
 THEN RAISE EXCEPTION 'runtime has table privilege'; END IF;
 IF has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','UPDATE')
 OR has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','DELETE')
 THEN RAISE EXCEPTION 'owner can mutate ledger'; END IF;
 IF (SELECT rolbypassrls FROM pg_roles WHERE rolname='roleta_append_owner')
 OR (SELECT rolbypassrls FROM pg_roles WHERE rolname='roleta_runtime')
 THEN RAISE EXCEPTION 'RLS bypass detected'; END IF;
END $test$;
-- Actual independent privilege evaluation, not only has_* catalog queries.
SET ROLE roleta_runtime;
DO $test$
DECLARE v_canonical text:='{"event_id":"CI-DEF-1","idempotency_key":"ci-definer-key-0001","kind":"prediction","payload":{"N":10},"policy":"WEEKLY_FROZEN"}';
DECLARE v_sha text:='f4d12b498a2cb7dddf57610cd8301d1bcc93cb4ea4788a8749922197d02f1a93';
BEGIN
 -- Expected digest calculated independently from canonical UTF-8 fixture bytes.
 IF roleta_audit.append_authenticated_evidence_ci(v_canonical,v_sha,'CI-DEF-1','prediction','WEEKLY_FROZEN','ci-definer-key-0001','{"N":10}'::jsonb,'google:ci-user')<1
 THEN RAISE EXCEPTION 'expected append'; END IF;
 BEGIN
  PERFORM roleta_audit.append_authenticated_evidence_ci(v_canonical,repeat('0',64),'CI-DEF-2','prediction','WEEKLY_FROZEN','ci-definer-key-0002','{"N":10}'::jsonb,'google:ci-user');
  RAISE EXCEPTION 'tampered hash accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'canonical digest mismatch' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM roleta_audit.append_authenticated_evidence_ci(v_canonical,v_sha,'CI-DEF-2','prediction','WEEKLY_FROZEN','ci-definer-key-0001','{"N":10}'::jsonb,'google:ci-user');
  RAISE EXCEPTION 'tampered event accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'canonical binding mismatch' THEN RAISE; END IF;
 END;
 BEGIN
  EXECUTE 'SELECT count(*) FROM roleta_audit.prospective_evidence';
  RAISE EXCEPTION 'direct runtime SELECT unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  EXECUTE 'DELETE FROM roleta_audit.prospective_evidence';
  RAISE EXCEPTION 'direct runtime DELETE unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
RESET ROLE;
DO $test$
BEGIN
 IF (SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='CI-DEF-1')<>1
 THEN RAISE EXCEPTION 'append missing'; END IF;
END $test$;
