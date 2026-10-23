-- SFJM F4 draft. Must be applied AFTER F1/F2/F3 in disposable PostgreSQL.
-- These are server-only RPCs: identity comes from verified Google session in API.
CREATE OR REPLACE FUNCTION roleta_intake.create_job(p_operator_sub text,p_image_sha256 text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_id uuid;
BEGIN
 IF p_operator_sub IS NULL OR length(p_operator_sub) NOT BETWEEN 1 AND 128
    OR p_image_sha256 IS NULL OR p_image_sha256 !~ '^[a-f0-9]{64}$' THEN
   RAISE EXCEPTION 'invalid job identity';
 END IF;
 -- Serialize creation for one operator+photo digest, avoid concurrent duplicates.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_operator_sub||':'||p_image_sha256,0));
 SELECT id INTO v_id FROM roleta_intake.jobs
 WHERE operator_sub=p_operator_sub AND image_sha256=p_image_sha256
   AND state IN ('QUEUED','PROCESSING','READY_FOR_REVIEW')
 ORDER BY created_at DESC LIMIT 1;
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 INSERT INTO roleta_intake.jobs(operator_sub,image_sha256)
 VALUES(p_operator_sub,p_image_sha256) RETURNING id INTO v_id;
 RETURN v_id;
END $fn$;
ALTER FUNCTION roleta_intake.create_job(text,text) OWNER TO roleta_intake_executor;
REVOKE ALL ON FUNCTION roleta_intake.create_job(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION roleta_intake.create_job(text,text) TO roleta_intake_api;

CREATE OR REPLACE FUNCTION roleta_intake.start_job(p_job_id uuid,p_operator_sub text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_state text;
BEGIN
 SELECT state INTO v_state FROM roleta_intake.jobs
 WHERE id=p_job_id AND operator_sub=p_operator_sub FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF v_state='PROCESSING' THEN RETURN false; END IF;
 IF v_state<>'QUEUED' THEN RETURN false; END IF;
 UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=p_job_id;
 RETURN true;
END $fn$;
ALTER FUNCTION roleta_intake.start_job(uuid,text) OWNER TO roleta_intake_executor;
REVOKE ALL ON FUNCTION roleta_intake.start_job(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION roleta_intake.start_job(uuid,text) TO roleta_intake_api;

CREATE OR REPLACE FUNCTION roleta_intake.read_job(p_job_id uuid,p_operator_sub text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_payload jsonb;
BEGIN
 SELECT jsonb_build_object('job_id',j.id,'state',j.state,
    'created_at',j.created_at,'updated_at',j.updated_at,'error_code',j.error_code,
    'model_id',r.model_id,'result',r.raw_json)
 INTO v_payload
 FROM roleta_intake.jobs j
 LEFT JOIN roleta_intake.results r ON r.job_id=j.id
 WHERE j.id=p_job_id AND j.operator_sub=p_operator_sub;
 RETURN v_payload;
END $fn$;
ALTER FUNCTION roleta_intake.read_job(uuid,text) OWNER TO roleta_intake_executor;
REVOKE ALL ON FUNCTION roleta_intake.read_job(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION roleta_intake.read_job(uuid,text) TO roleta_intake_api;

-- Record a confirmed dispatch failure without overwriting a concurrent completed callback.
CREATE OR REPLACE FUNCTION roleta_intake.fail_dispatch(p_job_id uuid,p_operator_sub text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_state text;
BEGIN
 SELECT state INTO v_state FROM roleta_intake.jobs
 WHERE id=p_job_id AND operator_sub=p_operator_sub FOR UPDATE;
 IF NOT FOUND OR v_state <> 'PROCESSING' THEN RETURN false; END IF;
 UPDATE roleta_intake.jobs
 SET state='FAILED',error_code='MAKE_DISPATCH_FAILED',finished_at=now()
 WHERE id=p_job_id;
 RETURN true;
END $fn$;
ALTER FUNCTION roleta_intake.fail_dispatch(uuid,text) OWNER TO roleta_intake_executor;
REVOKE ALL ON FUNCTION roleta_intake.fail_dispatch(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION roleta_intake.fail_dispatch(uuid,text) TO roleta_intake_api;

-- Authenticated terminal failure, after bounded provider retries are exhausted.
-- Row locking serializes failure against success. Nonce + state commit atomically.
CREATE OR REPLACE FUNCTION roleta_intake.fail_callback(p_job_id uuid,p_nonce text,p_error_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_state text; v_error text;
BEGIN
 IF p_nonce IS NULL OR p_nonce !~ '^[a-zA-Z0-9_-]{16,128}$'
 OR p_error_code IS NULL OR p_error_code NOT IN
 ('GEMINI_503_EXHAUSTED','GEMINI_RATE_LIMIT_EXHAUSTED','GEMINI_REQUEST_FAILED') THEN
  RAISE EXCEPTION 'invalid failure payload';
 END IF;
 SELECT state,error_code INTO v_state,v_error FROM roleta_intake.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown Gemini job'; END IF;
 INSERT INTO roleta_intake.callback_nonces(job_id,nonce) VALUES(p_job_id,p_nonce);
 IF v_state='READY_FOR_REVIEW' THEN RETURN 'ALREADY_SAVED'; END IF;
 IF v_state='FAILED' THEN
  IF v_error=p_error_code THEN RETURN 'ALREADY_FAILED'; END IF;
  RAISE EXCEPTION 'conflicting Gemini completion';
 END IF;
 IF v_state<>'PROCESSING' THEN RAISE EXCEPTION 'job is not PROCESSING'; END IF;
 UPDATE roleta_intake.jobs SET state='FAILED',error_code=p_error_code,finished_at=now() WHERE id=p_job_id;
 RETURN 'FAILED_SAVED';
END $fn$;
ALTER FUNCTION roleta_intake.fail_callback(uuid,text,text) OWNER TO roleta_intake_executor;
REVOKE ALL ON FUNCTION roleta_intake.fail_callback(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION roleta_intake.fail_callback(uuid,text,text) TO roleta_intake_api;
