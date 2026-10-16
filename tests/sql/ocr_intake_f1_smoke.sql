-- SFJM F1 isolated PostgreSQL smoke/regression test. Run ONLY in disposable database.
-- Apply 20261015_roleta_ocr_intake_gate1_draft.sql first.
BEGIN;
DO $$
DECLARE j uuid := gen_random_uuid();
BEGIN
 INSERT INTO roleta_intake.jobs(id,operator_sub,image_sha256)
 VALUES(j,'test-operator',repeat('a',64));
 UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j;
 INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
 VALUES(j,'gemini-3.8-flash','{"linhas":[{"nome_lido":"Paola"}]}'::jsonb,repeat('b',64));
 UPDATE roleta_intake.jobs SET state='READY_FOR_REVIEW',finished_at=now() WHERE id=j;
 IF (SELECT state FROM roleta_intake.jobs WHERE id=j) <> 'READY_FOR_REVIEW' THEN
   RAISE EXCEPTION 'ready state not stored';
 END IF;
 IF (SELECT raw_json->'linhas'->0->>'nome_lido' FROM roleta_intake.results WHERE job_id=j) <> 'Paola' THEN
   RAISE EXCEPTION 'Gemini JSON lost';
 END IF;
 -- Savepoint tests are performed by independent SQL transactions in CI; this file verifies positive path.
END $$;
ROLLBACK;
-- Required negative tests for F1 gate:
-- 1) attempt UPDATE/DELETE on roleta_intake.results -> exception
-- 2) READY_FOR_REVIEW -> PROCESSING -> exception
-- 3) UPDATE jobs.operator_sub -> exception
-- 4) insert malformed raw_json / raw_sha256 -> exception
-- 5) anon/authenticated SELECT -> permission denied
-- 6) identical job_id in results -> PK violation
-- 7) rollback atomicity when results insertion fails (F2 transactional function)
