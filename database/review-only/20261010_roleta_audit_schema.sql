-- REVIEW ONLY. DO NOT EXECUTE WITHOUT EXPLICIT MIGRATION AUTHORIZATION.
-- F2-11: isolated append-only evidence ledger in shared Supabase.
-- Prerequisites: dedicated database role, private server-only connection, backups,
-- approved change window, verified PostgREST schema exposure and grants.
BEGIN;
CREATE SCHEMA IF NOT EXISTS roleta_audit;
REVOKE ALL ON SCHEMA roleta_audit FROM PUBLIC, anon, authenticated;
-- Never expose roleta_audit in Supabase API exposed schemas.
CREATE TABLE roleta_audit.evidence (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 1 AND 128),
  kind text NOT NULL CHECK (kind IN ('prediction','outcome','correction')),
  policy text,
  record_sha256 text NOT NULL UNIQUE CHECK (record_sha256 ~ '^[0-9a-f]{64}$'),
  prev_hash text CHECK (prev_hash IS NULL OR prev_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_subject text NOT NULL CHECK (length(actor_subject) BETWEEN 1 AND 256),
  CHECK ((kind = 'prediction' AND policy IN ('WEEKLY_FROZEN','CURRENT_SHADOW')) OR
         (kind IN ('outcome','correction') AND policy IS NULL))
);
CREATE UNIQUE INDEX evidence_prediction_once ON roleta_audit.evidence(event_id,policy)
 WHERE kind='prediction';
CREATE UNIQUE INDEX evidence_outcome_once ON roleta_audit.evidence(event_id)
 WHERE kind='outcome';
CREATE INDEX evidence_event_id_idx ON roleta_audit.evidence(event_id,id);
ALTER TABLE roleta_audit.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_audit.evidence FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated;
-- This table is intentionally inaccessible to client JWT roles.
-- Grant only SELECT/INSERT to a dedicated server-side role in a separate approved migration.
-- Critical: an INSERT privilege alone does not guarantee immutable rows, chronology,
-- atomic chain append, or valid JSON. Use a reviewed SECURITY DEFINER append function
-- with a fixed search_path, transaction lock, server-side hashing and schema validation,
-- and revoke direct INSERT from runtime roles. This draft is NOT a deployable ledger.
COMMIT;
