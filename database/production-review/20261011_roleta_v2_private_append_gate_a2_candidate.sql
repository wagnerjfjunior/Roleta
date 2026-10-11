-- SFJM F2-12 GATE A.2 — PRIVATE APPEND FUNCTION CANDIDATE.
-- REVIEW ONLY until dedicated PG17 rehearsal + permissions audit.
-- NEVER change existing grants, PUBLIC schema, auth or Discador/MesaCliente.
-- No EXECUTE grants are supplied. Gate B (app writes) remains CLOSED.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='roleta_audit')
 OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='roleta_audit.prospective_evidence'::regclass)
 THEN RAISE EXCEPTION 'Gate A storage must already exist'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='roleta_audit' AND p.proname='append_authenticated_person_evidence_v2')
 THEN RAISE EXCEPTION 'V2 append already exists: do not overwrite'; END IF;
END $preflight$;

-- For first roll-out the definer is the controlled database owner. Its EXECUTE
-- is revoked to PUBLIC and API/runtime roles in the creation transaction.
-- Replacing the definer with a narrowly owned append role is an outstanding
-- design gate before exposing the RPC; no runtime membership is granted here.
CREATE FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 p_canonical_bytes text,
 p_request_sha256 text,
 p_actor_subject text,
 p_event_id text,
 p_person_id text,
 p_recommendation_id text,
 p_policy text,
 p_idempotency_key text,
 p_payload jsonb
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog
SET row_security=off
AS $fn$
DECLARE
 v_envelope jsonb;
 v_expected jsonb;
 v_existing roleta_audit.prospective_evidence%ROWTYPE;
 v_supersedes bigint;
 v_previous text;
 v_record text;
 v_inserted bigint;
 v_revision int;
 v_position int;
 v_generated timestamptz;
 v_cutoff timestamptz;
 v_frozen timestamptz;
 v_parent text;
BEGIN
 -- Coarse budgets are not a substitute for backend origin/CSRF/security checks.
 IF p_canonical_bytes IS NULL OR octet_length(p_canonical_bytes)>81920
    OR p_request_sha256 !~ '^[0-9a-f]{64}$'
    OR p_actor_subject !~ '^google:[A-Za-z0-9_-]{1,128}$'
    OR p_event_id !~ '^[A-Za-z0-9_-]{1,128}$'
    OR p_person_id !~ '^[A-Za-z0-9_-]{1,128}$'
    OR p_recommendation_id !~ '^[A-Za-z0-9_-]{1,128}$'
    OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
    OR p_policy NOT IN ('WEEKLY_FROZEN','CURRENT_SHADOW')
    OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR octet_length(p_payload::text)>65536
 THEN RAISE EXCEPTION 'invalid V2 append envelope'; END IF;
 IF encode(extensions.digest(convert_to(p_canonical_bytes,'UTF8'),'sha256'),'hex')
       <> p_request_sha256
 THEN RAISE EXCEPTION 'V2 request digest mismatch'; END IF;
 BEGIN
  v_envelope:=p_canonical_bytes::jsonb;
 EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'V2 canonical content is not JSON';
 END;
 -- Structural equality ties every positional argument to the signed bytes.
 v_expected:=jsonb_build_object(
  'version','rlt-person-evidence-v2',
  'actor_subject',p_actor_subject,'event_id',p_event_id,
  'kind','prediction','policy',p_policy,'person_id',p_person_id,
  'recommendation_id',p_recommendation_id,
  'revision_number',p_payload->'revision_number',
  'idempotency_key',p_idempotency_key,'payload',p_payload
 );
 IF v_envelope IS DISTINCT FROM v_expected
 THEN RAISE EXCEPTION 'V2 envelope fields mismatch'; END IF;
 IF p_payload->>'person_id' IS DISTINCT FROM p_person_id
  OR p_payload->>'recommendation_id' IS DISTINCT FROM p_recommendation_id
  OR jsonb_typeof(p_payload->'revision_number') <> 'number'
  OR jsonb_typeof(p_payload->'physical_position') <> 'number'
 THEN RAISE EXCEPTION 'V2 person payload mismatch'; END IF;
 -- Strict numeric and UTC encoding: PostgreSQL casts can otherwise accept
 -- fractional revision values or permissive local timestamps.
 IF p_payload->>'revision_number' !~ '^[1-9][0-9]*
  v_position:=(p_payload->>'physical_position')::int;
  v_generated:=(p_payload->>'generated_at')::timestamptz;
  v_cutoff:=(p_payload->>'data_cutoff')::timestamptz;
  v_frozen:=(p_payload->>'frozen_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'invalid V2 typed fields'; 
 END;
 IF v_revision<1 OR v_position<1 OR v_generated IS NULL OR v_cutoff IS NULL
    OR v_cutoff>v_generated OR v_generated>clock_timestamp()
 THEN RAISE EXCEPTION 'invalid V2 temporal or revision fields'; END IF;
 IF p_policy='WEEKLY_FROZEN' AND
   (v_revision<>1 OR v_frozen IS NULL OR v_frozen<v_generated)
 THEN RAISE EXCEPTION 'invalid frozen revision'; END IF;
 IF p_policy='CURRENT_SHADOW' AND v_revision=1
    AND p_payload->>'supersedes_recommendation_id' IS NOT NULL
 THEN RAISE EXCEPTION 'initial shadow has predecessor'; END IF;
 v_parent:=p_payload->>'supersedes_recommendation_id';
 IF p_policy='CURRENT_SHADOW' AND v_revision>1 AND
    (v_parent IS NULL OR v_parent !~ '^[A-Za-z0-9_-]{1,128}$')
 THEN RAISE EXCEPTION 'missing shadow predecessor'; END IF;

 -- Lock before idempotency and chain lookup. Matches trigger's advisory lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 SELECT * INTO v_existing FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.request_sha256=p_request_sha256
   AND v_existing.actor_subject=p_actor_subject
   AND v_existing.recommendation_id=p_recommendation_id
  THEN RETURN v_existing.id; END IF;
  RAISE EXCEPTION 'idempotency conflict';
 END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
            WHERE recommendation_id=p_recommendation_id)
 THEN RAISE EXCEPTION 'recommendation ID conflict'; END IF;
 IF v_parent IS NOT NULL THEN
  SELECT id INTO v_supersedes FROM roleta_audit.prospective_evidence
   WHERE recommendation_id=v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown predecessor'; END IF;
 END IF;
 SELECT record_sha256 INTO v_previous
 FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_record:=encode(extensions.digest(
   convert_to('rlt-chain-v2|'||coalesce(v_previous,'GENESIS')
     ||'|'||p_request_sha256||'|'||p_actor_subject
     ||'|'||p_recommendation_id,'UTF8'),'sha256'),'hex');

 INSERT INTO roleta_audit.prospective_evidence(
  event_id,kind,person_id,recommendation_id,policy,revision_number,
  supersedes_id,physical_position,generated_at,data_cutoff,frozen_at,
  idempotency_key,request_sha256,record_sha256,previous_record_sha256,
  payload,actor_subject
 ) VALUES(
  p_event_id,'prediction',p_person_id,p_recommendation_id,p_policy,v_revision,
  v_supersedes,v_position,v_generated,v_cutoff,v_frozen,
  p_idempotency_key,p_request_sha256,v_record,v_previous,
  p_payload,p_actor_subject
 ) RETURNING id INTO v_inserted;
 RETURN v_inserted;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role, roleta_runtime, roleta_append_owner;
COMMIT;

 OR p_payload->>'physical_position' !~ '^[1-9][0-9]*
  v_position:=(p_payload->>'physical_position')::int;
  v_generated:=(p_payload->>'generated_at')::timestamptz;
  v_cutoff:=(p_payload->>'data_cutoff')::timestamptz;
  v_frozen:=(p_payload->>'frozen_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'invalid V2 typed fields'; 
 END;
 IF v_revision<1 OR v_position<1 OR v_generated IS NULL OR v_cutoff IS NULL
    OR v_cutoff>v_generated OR v_generated>clock_timestamp()
 THEN RAISE EXCEPTION 'invalid V2 temporal or revision fields'; END IF;
 IF p_policy='WEEKLY_FROZEN' AND
   (v_revision<>1 OR v_frozen IS NULL OR v_frozen<v_generated)
 THEN RAISE EXCEPTION 'invalid frozen revision'; END IF;
 IF p_policy='CURRENT_SHADOW' AND v_revision=1
    AND p_payload->>'supersedes_recommendation_id' IS NOT NULL
 THEN RAISE EXCEPTION 'initial shadow has predecessor'; END IF;
 v_parent:=p_payload->>'supersedes_recommendation_id';
 IF p_policy='CURRENT_SHADOW' AND v_revision>1 AND
    (v_parent IS NULL OR v_parent !~ '^[A-Za-z0-9_-]{1,128}$')
 THEN RAISE EXCEPTION 'missing shadow predecessor'; END IF;

 -- Lock before idempotency and chain lookup. Matches trigger's advisory lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 SELECT * INTO v_existing FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.request_sha256=p_request_sha256
   AND v_existing.actor_subject=p_actor_subject
   AND v_existing.recommendation_id=p_recommendation_id
  THEN RETURN v_existing.id; END IF;
  RAISE EXCEPTION 'idempotency conflict';
 END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
            WHERE recommendation_id=p_recommendation_id)
 THEN RAISE EXCEPTION 'recommendation ID conflict'; END IF;
 IF v_parent IS NOT NULL THEN
  SELECT id INTO v_supersedes FROM roleta_audit.prospective_evidence
   WHERE recommendation_id=v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown predecessor'; END IF;
 END IF;
 SELECT record_sha256 INTO v_previous
 FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_record:=encode(extensions.digest(
   convert_to('rlt-chain-v2|'||coalesce(v_previous,'GENESIS')
     ||'|'||p_request_sha256||'|'||p_actor_subject
     ||'|'||p_recommendation_id,'UTF8'),'sha256'),'hex');

 INSERT INTO roleta_audit.prospective_evidence(
  event_id,kind,person_id,recommendation_id,policy,revision_number,
  supersedes_id,physical_position,generated_at,data_cutoff,frozen_at,
  idempotency_key,request_sha256,record_sha256,previous_record_sha256,
  payload,actor_subject
 ) VALUES(
  p_event_id,'prediction',p_person_id,p_recommendation_id,p_policy,v_revision,
  v_supersedes,v_position,v_generated,v_cutoff,v_frozen,
  p_idempotency_key,p_request_sha256,v_record,v_previous,
  p_payload,p_actor_subject
 ) RETURNING id INTO v_inserted;
 RETURN v_inserted;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role, roleta_runtime, roleta_append_owner;
COMMIT;

 OR p_payload->>'generated_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,3})?Z
  v_position:=(p_payload->>'physical_position')::int;
  v_generated:=(p_payload->>'generated_at')::timestamptz;
  v_cutoff:=(p_payload->>'data_cutoff')::timestamptz;
  v_frozen:=(p_payload->>'frozen_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'invalid V2 typed fields'; 
 END;
 IF v_revision<1 OR v_position<1 OR v_generated IS NULL OR v_cutoff IS NULL
    OR v_cutoff>v_generated OR v_generated>clock_timestamp()
 THEN RAISE EXCEPTION 'invalid V2 temporal or revision fields'; END IF;
 IF p_policy='WEEKLY_FROZEN' AND
   (v_revision<>1 OR v_frozen IS NULL OR v_frozen<v_generated)
 THEN RAISE EXCEPTION 'invalid frozen revision'; END IF;
 IF p_policy='CURRENT_SHADOW' AND v_revision=1
    AND p_payload->>'supersedes_recommendation_id' IS NOT NULL
 THEN RAISE EXCEPTION 'initial shadow has predecessor'; END IF;
 v_parent:=p_payload->>'supersedes_recommendation_id';
 IF p_policy='CURRENT_SHADOW' AND v_revision>1 AND
    (v_parent IS NULL OR v_parent !~ '^[A-Za-z0-9_-]{1,128}$')
 THEN RAISE EXCEPTION 'missing shadow predecessor'; END IF;

 -- Lock before idempotency and chain lookup. Matches trigger's advisory lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 SELECT * INTO v_existing FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.request_sha256=p_request_sha256
   AND v_existing.actor_subject=p_actor_subject
   AND v_existing.recommendation_id=p_recommendation_id
  THEN RETURN v_existing.id; END IF;
  RAISE EXCEPTION 'idempotency conflict';
 END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
            WHERE recommendation_id=p_recommendation_id)
 THEN RAISE EXCEPTION 'recommendation ID conflict'; END IF;
 IF v_parent IS NOT NULL THEN
  SELECT id INTO v_supersedes FROM roleta_audit.prospective_evidence
   WHERE recommendation_id=v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown predecessor'; END IF;
 END IF;
 SELECT record_sha256 INTO v_previous
 FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_record:=encode(extensions.digest(
   convert_to('rlt-chain-v2|'||coalesce(v_previous,'GENESIS')
     ||'|'||p_request_sha256||'|'||p_actor_subject
     ||'|'||p_recommendation_id,'UTF8'),'sha256'),'hex');

 INSERT INTO roleta_audit.prospective_evidence(
  event_id,kind,person_id,recommendation_id,policy,revision_number,
  supersedes_id,physical_position,generated_at,data_cutoff,frozen_at,
  idempotency_key,request_sha256,record_sha256,previous_record_sha256,
  payload,actor_subject
 ) VALUES(
  p_event_id,'prediction',p_person_id,p_recommendation_id,p_policy,v_revision,
  v_supersedes,v_position,v_generated,v_cutoff,v_frozen,
  p_idempotency_key,p_request_sha256,v_record,v_previous,
  p_payload,p_actor_subject
 ) RETURNING id INTO v_inserted;
 RETURN v_inserted;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role, roleta_runtime, roleta_append_owner;
COMMIT;

 OR p_payload->>'data_cutoff' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,3})?Z
  v_position:=(p_payload->>'physical_position')::int;
  v_generated:=(p_payload->>'generated_at')::timestamptz;
  v_cutoff:=(p_payload->>'data_cutoff')::timestamptz;
  v_frozen:=(p_payload->>'frozen_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'invalid V2 typed fields'; 
 END;
 IF v_revision<1 OR v_position<1 OR v_generated IS NULL OR v_cutoff IS NULL
    OR v_cutoff>v_generated OR v_generated>clock_timestamp()
 THEN RAISE EXCEPTION 'invalid V2 temporal or revision fields'; END IF;
 IF p_policy='WEEKLY_FROZEN' AND
   (v_revision<>1 OR v_frozen IS NULL OR v_frozen<v_generated)
 THEN RAISE EXCEPTION 'invalid frozen revision'; END IF;
 IF p_policy='CURRENT_SHADOW' AND v_revision=1
    AND p_payload->>'supersedes_recommendation_id' IS NOT NULL
 THEN RAISE EXCEPTION 'initial shadow has predecessor'; END IF;
 v_parent:=p_payload->>'supersedes_recommendation_id';
 IF p_policy='CURRENT_SHADOW' AND v_revision>1 AND
    (v_parent IS NULL OR v_parent !~ '^[A-Za-z0-9_-]{1,128}$')
 THEN RAISE EXCEPTION 'missing shadow predecessor'; END IF;

 -- Lock before idempotency and chain lookup. Matches trigger's advisory lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 SELECT * INTO v_existing FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.request_sha256=p_request_sha256
   AND v_existing.actor_subject=p_actor_subject
   AND v_existing.recommendation_id=p_recommendation_id
  THEN RETURN v_existing.id; END IF;
  RAISE EXCEPTION 'idempotency conflict';
 END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
            WHERE recommendation_id=p_recommendation_id)
 THEN RAISE EXCEPTION 'recommendation ID conflict'; END IF;
 IF v_parent IS NOT NULL THEN
  SELECT id INTO v_supersedes FROM roleta_audit.prospective_evidence
   WHERE recommendation_id=v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown predecessor'; END IF;
 END IF;
 SELECT record_sha256 INTO v_previous
 FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_record:=encode(extensions.digest(
   convert_to('rlt-chain-v2|'||coalesce(v_previous,'GENESIS')
     ||'|'||p_request_sha256||'|'||p_actor_subject
     ||'|'||p_recommendation_id,'UTF8'),'sha256'),'hex');

 INSERT INTO roleta_audit.prospective_evidence(
  event_id,kind,person_id,recommendation_id,policy,revision_number,
  supersedes_id,physical_position,generated_at,data_cutoff,frozen_at,
  idempotency_key,request_sha256,record_sha256,previous_record_sha256,
  payload,actor_subject
 ) VALUES(
  p_event_id,'prediction',p_person_id,p_recommendation_id,p_policy,v_revision,
  v_supersedes,v_position,v_generated,v_cutoff,v_frozen,
  p_idempotency_key,p_request_sha256,v_record,v_previous,
  p_payload,p_actor_subject
 ) RETURNING id INTO v_inserted;
 RETURN v_inserted;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role, roleta_runtime, roleta_append_owner;
COMMIT;

 OR (p_payload->>'frozen_at' IS NOT NULL AND
     p_payload->>'frozen_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,3})?Z
  v_position:=(p_payload->>'physical_position')::int;
  v_generated:=(p_payload->>'generated_at')::timestamptz;
  v_cutoff:=(p_payload->>'data_cutoff')::timestamptz;
  v_frozen:=(p_payload->>'frozen_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'invalid V2 typed fields'; 
 END;
 IF v_revision<1 OR v_position<1 OR v_generated IS NULL OR v_cutoff IS NULL
    OR v_cutoff>v_generated OR v_generated>clock_timestamp()
 THEN RAISE EXCEPTION 'invalid V2 temporal or revision fields'; END IF;
 IF p_policy='WEEKLY_FROZEN' AND
   (v_revision<>1 OR v_frozen IS NULL OR v_frozen<v_generated)
 THEN RAISE EXCEPTION 'invalid frozen revision'; END IF;
 IF p_policy='CURRENT_SHADOW' AND v_revision=1
    AND p_payload->>'supersedes_recommendation_id' IS NOT NULL
 THEN RAISE EXCEPTION 'initial shadow has predecessor'; END IF;
 v_parent:=p_payload->>'supersedes_recommendation_id';
 IF p_policy='CURRENT_SHADOW' AND v_revision>1 AND
    (v_parent IS NULL OR v_parent !~ '^[A-Za-z0-9_-]{1,128}$')
 THEN RAISE EXCEPTION 'missing shadow predecessor'; END IF;

 -- Lock before idempotency and chain lookup. Matches trigger's advisory lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 SELECT * INTO v_existing FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.request_sha256=p_request_sha256
   AND v_existing.actor_subject=p_actor_subject
   AND v_existing.recommendation_id=p_recommendation_id
  THEN RETURN v_existing.id; END IF;
  RAISE EXCEPTION 'idempotency conflict';
 END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
            WHERE recommendation_id=p_recommendation_id)
 THEN RAISE EXCEPTION 'recommendation ID conflict'; END IF;
 IF v_parent IS NOT NULL THEN
  SELECT id INTO v_supersedes FROM roleta_audit.prospective_evidence
   WHERE recommendation_id=v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown predecessor'; END IF;
 END IF;
 SELECT record_sha256 INTO v_previous
 FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_record:=encode(extensions.digest(
   convert_to('rlt-chain-v2|'||coalesce(v_previous,'GENESIS')
     ||'|'||p_request_sha256||'|'||p_actor_subject
     ||'|'||p_recommendation_id,'UTF8'),'sha256'),'hex');

 INSERT INTO roleta_audit.prospective_evidence(
  event_id,kind,person_id,recommendation_id,policy,revision_number,
  supersedes_id,physical_position,generated_at,data_cutoff,frozen_at,
  idempotency_key,request_sha256,record_sha256,previous_record_sha256,
  payload,actor_subject
 ) VALUES(
  p_event_id,'prediction',p_person_id,p_recommendation_id,p_policy,v_revision,
  v_supersedes,v_position,v_generated,v_cutoff,v_frozen,
  p_idempotency_key,p_request_sha256,v_record,v_previous,
  p_payload,p_actor_subject
 ) RETURNING id INTO v_inserted;
 RETURN v_inserted;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role, roleta_runtime, roleta_append_owner;
COMMIT;
)
 THEN RAISE EXCEPTION 'invalid V2 number or UTC timestamp'; END IF;
 BEGIN
  v_revision:=(p_payload->>'revision_number')::int;
  v_position:=(p_payload->>'physical_position')::int;
  v_generated:=(p_payload->>'generated_at')::timestamptz;
  v_cutoff:=(p_payload->>'data_cutoff')::timestamptz;
  v_frozen:=(p_payload->>'frozen_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'invalid V2 typed fields'; 
 END;
 IF v_revision<1 OR v_position<1 OR v_generated IS NULL OR v_cutoff IS NULL
    OR v_cutoff>v_generated OR v_generated>clock_timestamp()
 THEN RAISE EXCEPTION 'invalid V2 temporal or revision fields'; END IF;
 IF p_policy='WEEKLY_FROZEN' AND
   (v_revision<>1 OR v_frozen IS NULL OR v_frozen<v_generated)
 THEN RAISE EXCEPTION 'invalid frozen revision'; END IF;
 IF p_policy='CURRENT_SHADOW' AND v_revision=1
    AND p_payload->>'supersedes_recommendation_id' IS NOT NULL
 THEN RAISE EXCEPTION 'initial shadow has predecessor'; END IF;
 v_parent:=p_payload->>'supersedes_recommendation_id';
 IF p_policy='CURRENT_SHADOW' AND v_revision>1 AND
    (v_parent IS NULL OR v_parent !~ '^[A-Za-z0-9_-]{1,128}$')
 THEN RAISE EXCEPTION 'missing shadow predecessor'; END IF;

 -- Lock before idempotency and chain lookup. Matches trigger's advisory lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,12);
 SELECT * INTO v_existing FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.request_sha256=p_request_sha256
   AND v_existing.actor_subject=p_actor_subject
   AND v_existing.recommendation_id=p_recommendation_id
  THEN RETURN v_existing.id; END IF;
  RAISE EXCEPTION 'idempotency conflict';
 END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
            WHERE recommendation_id=p_recommendation_id)
 THEN RAISE EXCEPTION 'recommendation ID conflict'; END IF;
 IF v_parent IS NOT NULL THEN
  SELECT id INTO v_supersedes FROM roleta_audit.prospective_evidence
   WHERE recommendation_id=v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown predecessor'; END IF;
 END IF;
 SELECT record_sha256 INTO v_previous
 FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_record:=encode(extensions.digest(
   convert_to('rlt-chain-v2|'||coalesce(v_previous,'GENESIS')
     ||'|'||p_request_sha256||'|'||p_actor_subject
     ||'|'||p_recommendation_id,'UTF8'),'sha256'),'hex');

 INSERT INTO roleta_audit.prospective_evidence(
  event_id,kind,person_id,recommendation_id,policy,revision_number,
  supersedes_id,physical_position,generated_at,data_cutoff,frozen_at,
  idempotency_key,request_sha256,record_sha256,previous_record_sha256,
  payload,actor_subject
 ) VALUES(
  p_event_id,'prediction',p_person_id,p_recommendation_id,p_policy,v_revision,
  v_supersedes,v_position,v_generated,v_cutoff,v_frozen,
  p_idempotency_key,p_request_sha256,v_record,v_previous,
  p_payload,p_actor_subject
 ) RETURNING id INTO v_inserted;
 RETURN v_inserted;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_person_evidence_v2(
 text,text,text,text,text,text,text,text,jsonb)
 FROM PUBLIC, anon, authenticated, service_role, roleta_runtime, roleta_append_owner;
COMMIT;
