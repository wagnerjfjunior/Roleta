-- SFJM F2 DRAFT: atomic Gemini callback. Isolated branch only; NOT DEPLOYED.
-- SECURITY INVOKER: requires explicitly granted privileges; none are granted here.
CREATE OR REPLACE FUNCTION roleta_intake.complete_gemini_job(
 p_job_id uuid, p_model_id text, p_raw_json jsonb, p_raw_sha256 text
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $complete_gemini$
DECLARE
 v_state text;
 v_existing roleta_intake.results%ROWTYPE;
BEGIN
 IF p_job_id IS NULL OR p_model_id IS NULL OR p_raw_json IS NULL OR p_raw_sha256 IS NULL THEN
   RAISE EXCEPTION 'missing Gemini completion argument';
 END IF;
 IF length(p_model_id) NOT BETWEEN 1 AND 128
    OR p_raw_sha256 !~ '^[0-9a-f]{64}$'
    OR jsonb_typeof(p_raw_json) <> 'object' THEN
   RAISE EXCEPTION 'invalid Gemini completion payload';
 END IF;
 -- Row lock serializes concurrent callbacks for this job.
 SELECT state INTO v_state FROM roleta_intake.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown Gemini job'; END IF;
 IF v_state='READY_FOR_REVIEW' THEN
   SELECT * INTO v_existing FROM roleta_intake.results WHERE job_id=p_job_id;
   IF FOUND AND v_existing.model_id=p_model_id
     AND v_existing.raw_json=p_raw_json
     AND v_existing.raw_sha256=p_raw_sha256 THEN
      RETURN 'ALREADY_SAVED';
   END IF;
   RAISE EXCEPTION 'conflicting Gemini completion';
 END IF;
 IF v_state <> 'PROCESSING' THEN RAISE EXCEPTION 'job is not PROCESSING'; END IF;
 INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
 VALUES(p_job_id,p_model_id,p_raw_json,p_raw_sha256);
 UPDATE roleta_intake.jobs
 SET state='READY_FOR_REVIEW',finished_at=now(),error_code=NULL
 WHERE id=p_job_id;
 RETURN 'SAVED';
END
$complete_gemini$;
REVOKE ALL ON FUNCTION roleta_intake.complete_gemini_job(uuid,text,jsonb,text)
 FROM PUBLIC,anon,authenticated;
-- No grant to Make/browser, no deployed callback or credentials.
