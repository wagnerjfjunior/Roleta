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
     AND (frozen_at IS NULL OR frozen_at>=generated_at)
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

-- Append-only integrity trigger. This is a structural guard, NOT the
-- authenticated writer. Dedicated server RPC, canonical hash verification
-- and chain continuity remain a separate security review.
CREATE FUNCTION roleta_audit.guard_prospective_evidence()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $fn$
DECLARE
 v_previous roleta_audit.prospective_evidence%ROWTYPE;
 v_last_rev integer;
BEGIN
 IF TG_OP<>'INSERT' THEN
  RAISE EXCEPTION 'prospective evidence is append-only';
 END IF;
 -- Serialize integrity checks and lifecycle state for concurrent appends.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 IF NEW.kind='prediction' THEN
  IF NEW.generated_at>NEW.received_at OR
     (NEW.frozen_at IS NOT NULL AND NEW.frozen_at>NEW.received_at)
  THEN RAISE EXCEPTION 'prediction timestamp is in the future'; END IF;
  IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
             WHERE event_id=NEW.event_id AND kind='outcome')
  THEN RAISE EXCEPTION 'event already adjudicated'; END IF;
  IF NEW.policy='CURRENT_SHADOW' THEN
   SELECT max(revision_number) INTO v_last_rev
    FROM roleta_audit.prospective_evidence
    WHERE event_id=NEW.event_id AND person_id=NEW.person_id
      AND kind='prediction' AND policy='CURRENT_SHADOW';
   IF NEW.revision_number<>coalesce(v_last_rev,0)+1
   THEN RAISE EXCEPTION 'nonsequential current revision'; END IF;
   IF NEW.revision_number>1 THEN
    SELECT * INTO v_previous FROM roleta_audit.prospective_evidence
     WHERE id=NEW.supersedes_id;
    IF NOT FOUND OR v_previous.event_id<>NEW.event_id
       OR v_previous.person_id<>NEW.person_id
       OR v_previous.policy<>'CURRENT_SHADOW'
       OR v_previous.kind<>'prediction'
       OR v_previous.revision_number<>NEW.revision_number-1
       OR v_previous.frozen_at IS NOT NULL
    THEN RAISE EXCEPTION 'invalid revision predecessor'; END IF;
   END IF;
   IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
       WHERE event_id=NEW.event_id AND person_id=NEW.person_id
         AND kind='prediction' AND policy='CURRENT_SHADOW'
         AND frozen_at IS NOT NULL)
   THEN RAISE EXCEPTION 'current track frozen'; END IF;
  END IF;
 ELSE
  IF NOT EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
       WHERE event_id=NEW.event_id AND kind='prediction')
  THEN RAISE EXCEPTION 'outcome without prediction'; END IF;
 END IF;
 RETURN NEW;
END $fn$;

CREATE TRIGGER prospective_append_only_guard
 BEFORE INSERT OR UPDATE OR DELETE ON roleta_audit.prospective_evidence
 FOR EACH ROW EXECUTE FUNCTION roleta_audit.guard_prospective_evidence();
REVOKE ALL ON FUNCTION roleta_audit.guard_prospective_evidence() FROM PUBLIC,anon,authenticated,service_role;

-- Deliberately NO RLS policies, grants or executable append routines:
-- even a privileged connector should not be wired until Gate B.
REVOKE ALL ON ALL TABLES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated, service_role;
-- Avoid altering any existing schema/table/policy/grant of Discador or MesaCliente.
COMMIT;
