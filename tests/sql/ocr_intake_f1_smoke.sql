-- SFJM F1: execute against disposable PostgreSQL ONLY.
-- Prerequisite: roles anon and authenticated must exist (create them in the disposable DB
-- before applying migration), then apply the migration file.
-- Run as migration owner. This entire suite rolls back its fixtures.
BEGIN;
DO $$
DECLARE
 j uuid := gen_random_uuid();
 j2 uuid := gen_random_uuid();
 failed boolean;
BEGIN
 INSERT INTO roleta_intake.jobs(id,operator_sub,image_sha256)
 VALUES(j,'operator-A',repeat('a',64));
 -- READY cannot precede persisted result.
 failed := false;
 BEGIN
   UPDATE roleta_intake.jobs SET state='READY_FOR_REVIEW',finished_at=now() WHERE id=j;
 EXCEPTION WHEN OTHERS THEN failed := true;
 END;
 IF NOT failed THEN RAISE EXCEPTION 'READY without result unexpectedly succeeded'; END IF;
 -- Result cannot precede PROCESSING.
 failed := false;
 BEGIN
   INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
   VALUES(j,'gemini-3.8-flash','{"linhas":[]}'::jsonb,repeat('b',64));
 EXCEPTION WHEN OTHERS THEN failed := true;
 END;
 IF NOT failed THEN RAISE EXCEPTION 'result inserted before processing'; END IF;
 UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j;
 INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
 VALUES(j,'gemini-3.8-flash','{"linhas":[{"nome_lido":"Paola"}]}'::jsonb,repeat('b',64));
 UPDATE roleta_intake.jobs SET state='READY_FOR_REVIEW',finished_at=now() WHERE id=j;
 IF (SELECT raw_json->'linhas'->0->>'nome_lido' FROM roleta_intake.results WHERE job_id=j) <> 'Paola'
 THEN RAISE EXCEPTION 'JSON persistence failed'; END IF;
 -- Raw result cannot be modified.
 failed := false;
 BEGIN UPDATE roleta_intake.results SET raw_json='{}'::jsonb WHERE job_id=j;
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 IF NOT failed THEN RAISE EXCEPTION 'result mutation succeeded'; END IF;
 -- Raw result cannot be deleted.
 failed := false;
 BEGIN DELETE FROM roleta_intake.results WHERE job_id=j;
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 IF NOT failed THEN RAISE EXCEPTION 'result deletion succeeded'; END IF;
 -- No second result for the same job.
 failed := false;
 BEGIN INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
 VALUES(j,'gemini-3.6-flash','{}'::jsonb,repeat('c',64));
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 IF NOT failed THEN RAISE EXCEPTION 'duplicate result inserted'; END IF;
 -- Terminal state is irreversible.
 failed := false;
 BEGIN UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j;
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 IF NOT failed THEN RAISE EXCEPTION 'terminal state reverted'; END IF;
 -- Operator ownership is immutable.
 failed := false;
 BEGIN UPDATE roleta_intake.jobs SET operator_sub='operator-B' WHERE id=j;
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 IF NOT failed THEN RAISE EXCEPTION 'operator changed'; END IF;
 -- JSON must be an object.
 INSERT INTO roleta_intake.jobs(id,operator_sub,image_sha256)
 VALUES(j2,'operator-A',repeat('d',64));
 UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j2;
 failed := false;
 BEGIN INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
 VALUES(j2,'gemini-3.8-flash','[]'::jsonb,repeat('e',64));
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 IF NOT failed THEN RAISE EXCEPTION 'invalid JSON type inserted'; END IF;
 -- Ordinary roles have no schema access.
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
    AND has_schema_privilege('anon','roleta_intake','USAGE') THEN
   RAISE EXCEPTION 'anon has unexpected schema usage';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
    AND has_schema_privilege('authenticated','roleta_intake','USAGE') THEN
   RAISE EXCEPTION 'authenticated has unexpected schema usage';
 END IF;
END $$;
ROLLBACK;
