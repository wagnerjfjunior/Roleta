-- SFJM F2-12 / GATE A CANDIDATE (2026-10-11).
-- REVIEW ONLY. NOT APPROVED TO RUN, EVEN WITH OPERATOR AUTHORIZATION,
-- UNTIL FULL DISPOSABLE PG17 REHEARSAL AND EFFECTIVE-PRIVILEGE AUDIT PASS.
-- This is the storage/bootstrap portion ONLY: no write RPC, no API route,
-- no runtime grants, no migrations of existing shared app objects.
--
-- REQUIREMENTS: private schema not exposed in PostgREST; no existing
-- roleta_audit schema/roles; operator backup verified and targeted rollback.
-- Never drop an existing schema if a retry encounters these objects.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

DO $preflight$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='roleta_audit')
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
      ('roleta_runtime','roleta_append_owner'))
 THEN RAISE EXCEPTION 'existing Roleta objects: abort, do not overwrite'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n
  ON n.oid=e.extnamespace WHERE e.extname='pgcrypto' AND n.nspname='extensions')
 THEN RAISE EXCEPTION 'pgcrypto in extensions required'; END IF;
END $preflight$;

CREATE ROLE roleta_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;
CREATE ROLE roleta_append_owner NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;

CREATE SCHEMA roleta_audit;
REVOKE ALL ON SCHEMA roleta_audit FROM PUBLIC;
-- Do not GRANT schema access to runtime or append owner before tested write RPC.
-- In particular no role memberships, no exposure via PostgREST, no browser grants.

-- New database objects default to function EXECUTE for PUBLIC; there are no
-- functions here. Future migration MUST REVOKE EXECUTE within same transaction.
CREATE TABLE roleta_audit.prospective_evidence (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id text NOT NULL CHECK (event_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  kind text NOT NULL CHECK (kind IN ('prediction','outcome')),
  person_id text,
  policy text,
  revision_number integer,
  supersedes_id bigint,
  physical_position integer,
  generated_at timestamptz,
  data_cutoff timestamptz,
  frozen_at timestamptz,
  idempotency_key text NOT NULL UNIQUE CHECK (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  record_sha256 text NOT NULL UNIQUE CHECK (record_sha256 ~ '^[0-9a-f]{64}$'),
  previous_record_sha256 text CHECK (previous_record_sha256 IS NULL OR previous_record_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_subject text NOT NULL CHECK (length(actor_subject) BETWEEN 1 AND 256),
  CONSTRAINT prospective_supersedes_id_fk FOREIGN KEY (supersedes_id)
    REFERENCES roleta_audit.prospective_evidence(id),
  CONSTRAINT prospective_shape_ck CHECK (
    (kind='prediction' AND person_id ~ '^[A-Za-z0-9_-]{1,128}$'
     AND policy IN ('WEEKLY_FROZEN','CURRENT_SHADOW')
     AND revision_number>=1 AND physical_position>0
     AND generated_at IS NOT NULL AND data_cutoff IS NOT NULL
     AND data_cutoff<=generated_at
     AND (frozen_at IS NULL OR frozen_at<=generated_at)
     AND ((policy='WEEKLY_FROZEN' AND revision_number=1
           AND supersedes_id IS NULL AND frozen_at IS NOT NULL)
      OR (policy='CURRENT_SHADOW'
          AND ((revision_number=1 AND supersedes_id IS NULL)
            OR (revision_number>1 AND supersedes_id IS NOT NULL)))))
    OR (kind='outcome' AND person_id IS NULL AND policy IS NULL
        AND revision_number IS NULL AND supersedes_id IS NULL
        AND physical_position IS NULL AND generated_at IS NULL
        AND data_cutoff IS NULL AND frozen_at IS NULL)
  )
);

CREATE UNIQUE INDEX prospective_weekly_person_once
  ON roleta_audit.prospective_evidence(event_id,person_id)
  WHERE kind='prediction' AND policy='WEEKLY_FROZEN';
CREATE UNIQUE INDEX prospective_current_person_revision_once
  ON roleta_audit.prospective_evidence(event_id,person_id,revision_number)
  WHERE kind='prediction' AND policy='CURRENT_SHADOW';
CREATE UNIQUE INDEX prospective_outcome_event_once
  ON roleta_audit.prospective_evidence(event_id)
  WHERE kind='outcome';

ALTER TABLE roleta_audit.prospective_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_audit.prospective_evidence FORCE ROW LEVEL SECURITY;

-- Deliberately NO RLS policies, grants or executable append routines:
-- even a privileged connector should not be wired until Gate B.
REVOKE ALL ON ALL TABLES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated, service_role;
-- Avoid altering any existing schema/table/policy/grant of Discador or MesaCliente.
COMMIT;
