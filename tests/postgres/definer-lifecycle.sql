-- Disposable PostgreSQL only. Execute after role and permission tests.
\i database/review-only/20261010_definer_lifecycle_disposable.sql
DO $test$
DECLARE v text;h text;first_id bigint;replay_id bigint;
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'wrong database'; END IF;
 v:='{"event_id":"CI-LIFE","idempotency_key":"ci-lifecycle-pred-001","kind":"prediction","payload":{"N":10},"policy":"WEEKLY_FROZEN"}';
 h:=encode(extensions.digest(convert_to(v,'UTF8'),'sha256'),'hex');
 first_id:=roleta_audit.append_authenticated_evidence_ci(v,h,'CI-LIFE','prediction','WEEKLY_FROZEN','ci-lifecycle-pred-001','{"N":10}'::jsonb,'google:ci');
 replay_id:=roleta_audit.append_authenticated_evidence_ci(v,h,'CI-LIFE','prediction','WEEKLY_FROZEN','ci-lifecycle-pred-001','{"N":10}'::jsonb,'google:ci');
 IF first_id<>replay_id THEN RAISE EXCEPTION 'replay failure'; END IF;
 BEGIN
  PERFORM roleta_audit.append_authenticated_evidence_ci(v,h,'CI-LIFE','prediction','WEEKLY_FROZEN','ci-lifecycle-pred-001','{"N":10}'::jsonb,'google:other');
  RAISE EXCEPTION 'actor conflict accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='CI-LIFE')<>1 THEN RAISE EXCEPTION 'unexpected row count'; END IF;
END $test$;
