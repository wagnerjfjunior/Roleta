-- SFJM F3 draft. DISPOSABLE PostgreSQL ONLY until AppSec approves.
-- Separate non-bypass execution identity; API login has EXECUTE only.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='roleta_intake_executor') THEN
   CREATE ROLE roleta_intake_executor NOLOGIN NOSUPERUSER NOBYPASSRLS;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='roleta_intake_api') THEN
   CREATE ROLE roleta_intake_api LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
 END IF;
END $$;
-- Credentials and login provisioning MUST be handled separately via secret manager.
REVOKE ALL ON SCHEMA roleta_intake FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA roleta_intake TO roleta_intake_executor, roleta_intake_api;
GRANT SELECT,INSERT,UPDATE ON roleta_intake.jobs TO roleta_intake_executor;
GRANT SELECT,INSERT ON roleta_intake.results TO roleta_intake_executor;
-- No direct table grants to roleta_intake_api.
CREATE POLICY intake_executor_jobs_select ON roleta_intake.jobs
 FOR SELECT TO roleta_intake_executor USING (true);
CREATE POLICY intake_executor_jobs_insert ON roleta_intake.jobs
 FOR INSERT TO roleta_intake_executor WITH CHECK (true);
CREATE POLICY intake_executor_jobs_update ON roleta_intake.jobs
 FOR UPDATE TO roleta_intake_executor USING (true) WITH CHECK (true);
CREATE POLICY intake_executor_results_select ON roleta_intake.results
 FOR SELECT TO roleta_intake_executor USING (true);
CREATE POLICY intake_executor_results_insert ON roleta_intake.results
 FOR INSERT TO roleta_intake_executor WITH CHECK (true);
CREATE TABLE roleta_intake.callback_nonces(
 job_id uuid NOT NULL REFERENCES roleta_intake.jobs(id) ON DELETE RESTRICT,
 nonce text NOT NULL CHECK(nonce ~ '^[a-zA-Z0-9_-]{16,128}$'),
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(job_id,nonce)
);
ALTER TABLE roleta_intake.callback_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_intake.callback_nonces FORCE ROW LEVEL SECURITY;
REVOKE ALL ON roleta_intake.callback_nonces FROM PUBLIC,anon,authenticated,service_role;
GRANT INSERT ON roleta_intake.callback_nonces TO roleta_intake_executor;
CREATE POLICY intake_executor_nonce_insert ON roleta_intake.callback_nonces
 FOR INSERT TO roleta_intake_executor WITH CHECK(true);
-- Replace F2 invoker function with bounded SECURITY DEFINER, using the non-bypass role.
ALTER FUNCTION roleta_intake.complete_gemini_job(uuid,text,jsonb,text) OWNER TO roleta_intake_executor;
ALTER FUNCTION roleta_intake.complete_gemini_job(uuid,text,jsonb,text) SECURITY DEFINER;
-- SECURITY DEFINER complete requires grants on jobs/results to executor; API gets no table grants.
REVOKE ALL ON FUNCTION roleta_intake.complete_gemini_job(uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated,service_role,roleta_intake_api;
-- Atomic nonce reservation and completion in a single SQL transaction.
CREATE OR REPLACE FUNCTION roleta_intake.complete_signed_callback(
 p_job_id uuid,p_nonce text,p_model_id text,p_raw_json jsonb,p_raw_sha256 text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog
AS $callback$
DECLARE v_result text;
BEGIN
 IF p_nonce IS NULL OR p_nonce !~ '^[a-zA-Z0-9_-]{16,128}$' THEN
  RAISE EXCEPTION 'invalid callback nonce';
 END IF;
 -- Same transaction: any failure rolls back the nonce and the result.
 INSERT INTO roleta_intake.callback_nonces(job_id,nonce) VALUES(p_job_id,p_nonce);
 v_result:=roleta_intake.complete_gemini_job(p_job_id,p_model_id,p_raw_json,p_raw_sha256);
 RETURN v_result;
END $callback$;
ALTER FUNCTION roleta_intake.complete_signed_callback(uuid,text,text,jsonb,text) OWNER TO roleta_intake_executor;
REVOKE ALL ON FUNCTION roleta_intake.complete_signed_callback(uuid,text,text,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION roleta_intake.complete_signed_callback(uuid,text,text,jsonb,text) TO roleta_intake_api;
-- Note: duplicate nonce is rejected even when the result is idempotently saved.
-- Separate read/create/start APIs require dedicated restricted functions; no direct table grants.
