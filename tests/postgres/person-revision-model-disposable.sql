-- DISPOSABLE PG CI ONLY: prove per-person prediction identity and revision constraints.
-- NOT a production migration; this table is a design test fixture.
DO $guard$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable DB required'; END IF;
END $guard$;

CREATE TABLE roleta_audit.prospective_person_revision_ci (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id text NOT NULL CHECK(event_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 person_id text NOT NULL CHECK(person_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 policy text NOT NULL CHECK(policy IN ('WEEKLY_FROZEN','CURRENT_SHADOW')),
 revision_number integer NOT NULL CHECK(revision_number >= 1),
 supersedes_id bigint REFERENCES roleta_audit.prospective_person_revision_ci(id),
 frozen_at timestamptz,
 generated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 data_cutoff timestamptz NOT NULL,
 position integer NOT NULL CHECK(position>0),
 idempotency_key text NOT NULL UNIQUE,
 CHECK(generated_at >= data_cutoff),
 CHECK((policy='WEEKLY_FROZEN' AND revision_number=1 AND supersedes_id IS NULL AND frozen_at IS NOT NULL)
   OR (policy='CURRENT_SHADOW' AND ((revision_number=1 AND supersedes_id IS NULL)
    OR (revision_number>1 AND supersedes_id IS NOT NULL)))),
 CHECK(frozen_at IS NULL OR frozen_at <= generated_at)
);
CREATE UNIQUE INDEX prospective_person_weekly_once_ci
 ON roleta_audit.prospective_person_revision_ci(event_id,person_id)
 WHERE policy='WEEKLY_FROZEN';
CREATE UNIQUE INDEX prospective_person_current_revision_ci
 ON roleta_audit.prospective_person_revision_ci(event_id,person_id,revision_number)
 WHERE policy='CURRENT_SHADOW';
ALTER TABLE roleta_audit.prospective_person_revision_ci ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_audit.prospective_person_revision_ci FORCE ROW LEVEL SECURITY;

-- Enforce same-event same-person predecessor and monotone revision.
CREATE FUNCTION roleta_audit.enforce_person_revision_ci()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog
AS $fn$
DECLARE p roleta_audit.prospective_person_revision_ci%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'append-only revisions'; END IF;
 IF NEW.policy='CURRENT_SHADOW' AND NEW.revision_number>1 THEN
   SELECT * INTO p FROM roleta_audit.prospective_person_revision_ci WHERE id=NEW.supersedes_id;
   IF NOT FOUND OR p.event_id<>NEW.event_id OR p.person_id<>NEW.person_id
       OR p.policy<>'CURRENT_SHADOW' OR p.revision_number<>NEW.revision_number-1
       OR p.frozen_at IS NOT NULL
   THEN RAISE EXCEPTION 'invalid revision predecessor'; END IF;
 END IF;
 -- Never insert a new diagnostic revision after a frozen predecessor.
 IF NEW.policy='CURRENT_SHADOW' AND EXISTS(
   SELECT 1 FROM roleta_audit.prospective_person_revision_ci
   WHERE event_id=NEW.event_id AND person_id=NEW.person_id
     AND policy='CURRENT_SHADOW' AND frozen_at IS NOT NULL
 ) THEN RAISE EXCEPTION 'current track already frozen'; END IF;
 RETURN NEW;
END
$fn$;
CREATE TRIGGER prospective_person_revision_ci_guard
 BEFORE INSERT OR UPDATE OR DELETE ON roleta_audit.prospective_person_revision_ci
 FOR EACH ROW EXECUTE FUNCTION roleta_audit.enforce_person_revision_ci();
REVOKE ALL ON TABLE roleta_audit.prospective_person_revision_ci FROM PUBLIC,anon,authenticated,roleta_runtime;
REVOKE ALL ON FUNCTION roleta_audit.enforce_person_revision_ci() FROM PUBLIC,anon,authenticated,roleta_runtime;

-- Test with local fixture roles only (superuser CI fixture insertion).
INSERT INTO roleta_audit.prospective_person_revision_ci
(event_id,person_id,policy,revision_number,frozen_at,generated_at,data_cutoff,position,idempotency_key)
VALUES
('CI-TEAM-1','wagner','WEEKLY_FROZEN',1,'2026-10-10 19:00+00','2026-10-10 19:00+00','2026-10-10 18:00+00',14,'ci-team-wagner-weekly'),
('CI-TEAM-1','laura','WEEKLY_FROZEN',1,'2026-10-10 19:00+00','2026-10-10 19:00+00','2026-10-10 18:00+00',3,'ci-team-laura-weekly');
INSERT INTO roleta_audit.prospective_person_revision_ci
(event_id,person_id,policy,revision_number,generated_at,data_cutoff,position,idempotency_key)
VALUES ('CI-TEAM-1','wagner','CURRENT_SHADOW',1,'2026-10-10 19:01+00','2026-10-10 18:00+00',22,'ci-team-wagner-current1');

INSERT INTO roleta_audit.prospective_person_revision_ci
(event_id,person_id,policy,revision_number,supersedes_id,generated_at,data_cutoff,position,idempotency_key)
SELECT 'CI-TEAM-1','wagner','CURRENT_SHADOW',2,id,
 '2026-10-10 19:02+00','2026-10-10 18:01+00',9,'ci-team-wagner-current2'
FROM roleta_audit.prospective_person_revision_ci
WHERE event_id='CI-TEAM-1' AND person_id='wagner' AND policy='CURRENT_SHADOW' AND revision_number=1;

DO $test$
BEGIN
 IF (SELECT count(*) FROM roleta_audit.prospective_person_revision_ci WHERE event_id='CI-TEAM-1')<>4 THEN
  RAISE EXCEPTION 'per-person rows missing'; END IF;
 BEGIN
  INSERT INTO roleta_audit.prospective_person_revision_ci
  (event_id,person_id,policy,revision_number,frozen_at,generated_at,data_cutoff,position,idempotency_key)
  VALUES ('CI-TEAM-1','wagner','WEEKLY_FROZEN',1,'2026-10-10 19:00+00','2026-10-10 19:00+00','2026-10-10 18:00+00',8,'ci-duplicate-weekly');
  RAISE EXCEPTION 'duplicate weekly accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO roleta_audit.prospective_person_revision_ci
  (event_id,person_id,policy,revision_number,supersedes_id,generated_at,data_cutoff,position,idempotency_key)
  SELECT 'CI-TEAM-1','laura','CURRENT_SHADOW',2,id,
   '2026-10-10 19:03+00','2026-10-10 18:01+00',7,'ci-cross-person'
  FROM roleta_audit.prospective_person_revision_ci
  WHERE event_id='CI-TEAM-1' AND person_id='wagner' AND policy='CURRENT_SHADOW' AND revision_number=1;
  RAISE EXCEPTION 'cross-person supersession accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'invalid revision predecessor' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE roleta_audit.prospective_person_revision_ci SET position=1 WHERE id=1;
  RAISE EXCEPTION 'UPDATE accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'append-only revisions' THEN RAISE; END IF;
 END;
 BEGIN
  DELETE FROM roleta_audit.prospective_person_revision_ci WHERE id=1;
  RAISE EXCEPTION 'DELETE accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'append-only revisions' THEN RAISE; END IF;
 END;
END $test$;
