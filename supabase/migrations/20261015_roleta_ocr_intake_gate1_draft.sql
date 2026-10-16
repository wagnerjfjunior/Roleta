-- SFJM Gate 1: additive, isolated draft migration. DO NOT APPLY until reviewed.
-- No browser or Make direct grants. Server-only, least-privilege roles to be granted separately.
CREATE SCHEMA IF NOT EXISTS roleta_intake;
CREATE TABLE IF NOT EXISTS roleta_intake.jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operator_sub text NOT NULL CHECK (length(operator_sub) BETWEEN 1 AND 128),
 image_sha256 text NOT NULL CHECK (image_sha256 ~ '^[0-9a-f]{64}$'),
 image_storage_path text,
 state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','PROCESSING','READY_FOR_REVIEW','FAILED')),
 result jsonb,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 CONSTRAINT ready_has_result CHECK (state <> 'READY_FOR_REVIEW' OR (result IS NOT NULL AND jsonb_typeof(result)='object')),
 CONSTRAINT no_result_before_ready CHECK (state = 'READY_FOR_REVIEW' OR result IS NULL),
 CONSTRAINT failed_has_error CHECK (state <> 'FAILED' OR error_code IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS jobs_operator_created_idx ON roleta_intake.jobs(operator_sub,created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_digest_idx ON roleta_intake.jobs(operator_sub,image_sha256,created_at DESC);
ALTER TABLE roleta_intake.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_intake.jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA roleta_intake FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE roleta_intake.jobs FROM PUBLIC, anon, authenticated;
-- No API grants are issued in this migration. Define narrowly scoped server
-- role, SECURITY DEFINER functions, authenticated callback, replay fencing,
-- retention and storage policies before enabling live writes.
