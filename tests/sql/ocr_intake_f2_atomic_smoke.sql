-- SFJM F2 atomic completion tests; disposable PostgreSQL only.
-- Prerequisites: F1 schema + F2 draft function installed. Run as owner.
BEGIN;
DO $tests$
DECLARE
 j uuid := gen_random_uuid();
 k uuid := gen_random_uuid();
 result text;
 rejected boolean;
BEGIN
 INSERT INTO roleta_intake.jobs(id,operator_sub,image_sha256)
 VALUES (j,'operator-test',repeat('a',64)),(k,'operator-test',repeat('b',64));

 rejected := false;
 BEGIN
   PERFORM roleta_intake.complete_gemini_job(j,'gemini-3.8-flash','{"linhas":[]}'::jsonb,repeat('c',64));
 EXCEPTION WHEN OTHERS THEN rejected := true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'QUEUED completion accepted'; END IF;

 UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j;
 SELECT roleta_intake.complete_gemini_job(j,'gemini-3.8-flash','{"linhas":[]}'::jsonb,repeat('c',64)) INTO result;
 IF result <> 'SAVED' THEN RAISE EXCEPTION 'first completion failed'; END IF;
 IF (SELECT count(*) FROM roleta_intake.results WHERE job_id=j) <> 1 THEN
   RAISE EXCEPTION 'result count != 1';
 END IF;
 IF (SELECT state FROM roleta_intake.jobs WHERE id=j) <> 'READY_FOR_REVIEW' THEN
   RAISE EXCEPTION 'job not READY';
 END IF;

 SELECT roleta_intake.complete_gemini_job(j,'gemini-3.8-flash','{"linhas":[]}'::jsonb,repeat('c',64)) INTO result;
 IF result <> 'ALREADY_SAVED' THEN RAISE EXCEPTION 'idempotent replay failed'; END IF;

 rejected := false;
 BEGIN
   PERFORM roleta_intake.complete_gemini_job(j,'gemini-3.6-flash','{"linhas":[]}'::jsonb,repeat('c',64));
 EXCEPTION WHEN OTHERS THEN rejected := true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'conflicting replay accepted'; END IF;

 UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=k;
 rejected := false;
 BEGIN
   PERFORM roleta_intake.complete_gemini_job(k,'gemini-3.8-flash','[]'::jsonb,repeat('d',64));
 EXCEPTION WHEN OTHERS THEN rejected := true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'invalid JSON accepted'; END IF;
 IF EXISTS(SELECT 1 FROM roleta_intake.results WHERE job_id=k)
    OR (SELECT state FROM roleta_intake.jobs WHERE id=k) <> 'PROCESSING' THEN
   RAISE EXCEPTION 'partial write survived failed completion';
 END IF;
END
$tests$;
ROLLBACK;
