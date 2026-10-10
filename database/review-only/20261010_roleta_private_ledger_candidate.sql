-- REVIEW ONLY — NEVER EXECUTE IN DISCador-MesaCliente WITHOUT SPECIFIC APPROVAL.
-- This file is a migration candidate for a disposable PostgreSQL test instance.
-- NOT production-ready: DB-side canonical hashing and authenticated append RPC pending.
BEGIN;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='roleta_audit') THEN
  RAISE EXCEPTION 'roleta_audit already exists: manual review required';
 END IF;
END $$;
CREATE SCHEMA roleta_audit;
REVOKE ALL ON SCHEMA roleta_audit FROM PUBLIC;
REVOKE ALL ON SCHEMA roleta_audit FROM anon, authenticated;
CREATE TABLE roleta_audit.prospective_evidence (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id text NOT NULL CHECK(event_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 kind text NOT NULL CHECK(kind IN ('prediction','outcome','correction')),
 policy text,
 idempotency_key text NOT NULL UNIQUE CHECK(idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[0-9a-f]{64}$'),
 record_sha256 text NOT NULL UNIQUE CHECK(record_sha256 ~ '^[0-9a-f]{64}$'),
 previous_record_sha256 text CHECK(previous_record_sha256 IS NULL OR previous_record_sha256 ~ '^[0-9a-f]{64}$'),
 payload jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor_subject text NOT NULL CHECK(length(actor_subject) BETWEEN 1 AND 256),
 CHECK ((kind='prediction' AND policy IN ('WEEKLY_FROZEN','CURRENT_SHADOW'))
     OR (kind IN ('outcome','correction') AND policy IS NULL))
);
CREATE UNIQUE INDEX prospective_prediction_once
 ON roleta_audit.prospective_evidence(event_id,policy) WHERE kind='prediction';
CREATE UNIQUE INDEX prospective_outcome_once
 ON roleta_audit.prospective_evidence(event_id) WHERE kind='outcome';
ALTER TABLE roleta_audit.prospective_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_audit.prospective_evidence FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated;
-- NO GRANTS to runtime roles in this candidate. Fail-closed until append function is audited.
-- No direct insert is authorized. No exposed PostgREST schema changes.
COMMIT;
