-- DISPOSABLE TEST ONLY. NOT a production migration.
-- Replaces the CI permission-only function with an atomic lifecycle test implementation.
DO $guard$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable database required'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION roleta_audit.append_authenticated_evidence_ci(
 p_canonical text,p_sha text,p_event text,p_kind text,p_policy text,
 p_key text,p_payload jsonb,p_actor text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $fn$
DECLARE v_doc jsonb;v_old roleta_audit.prospective_evidence%ROWTYPE;
 v_prev text;v_id bigint;v_ts timestamptz;v_hash text;
BEGIN
 -- CI-only serialized append; no reliance on public tables or Discador data.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973,2);
 IF p_canonical IS NULL OR octet_length(p_canonical)>81920
 OR p_sha IS NULL OR p_sha !~ '^[0-9a-f]{64}$'
 OR p_actor IS NULL OR length(p_actor) NOT BETWEEN 1 AND 256
 OR p_event IS NULL OR p_event !~ '^[A-Za-z0-9_-]{1,128}$'
 OR p_key IS NULL OR p_key !~ '^[A-Za-z0-9_-]{16,128}$'
 OR p_kind IS NULL OR p_kind NOT IN ('prediction','outcome')
 OR (p_kind='prediction' AND (p_policy IS NULL OR p_policy NOT IN ('WEEKLY_FROZEN','CURRENT_SHADOW')))
 OR (p_kind='outcome' AND p_policy IS NOT NULL)
 OR p_payload IS NULL OR octet_length(p_payload::text)>65536
 THEN RAISE EXCEPTION 'invalid evidence fields'; END IF;
 IF encode(extensions.digest(convert_to(p_canonical,'UTF8'),'sha256'),'hex')<>p_sha
 THEN RAISE EXCEPTION 'canonical digest mismatch'; END IF;
 BEGIN v_doc:=p_canonical::jsonb;
 EXCEPTION WHEN others THEN RAISE EXCEPTION 'invalid canonical JSON'; END;
 IF jsonb_typeof(v_doc)<>'object'
 OR (SELECT count(*) FROM jsonb_object_keys(v_doc))<>5
 OR v_doc<>jsonb_build_object('event_id',p_event,'kind',p_kind,
 'policy',p_policy,'idempotency_key',p_key,'payload',p_payload)
 THEN RAISE EXCEPTION 'canonical binding mismatch'; END IF;
 SELECT * INTO v_old FROM roleta_audit.prospective_evidence
 WHERE idempotency_key=p_key;
 IF FOUND THEN
  IF v_old.request_sha256<>p_sha OR v_old.actor_subject<>p_actor THEN
   RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505';
  END IF;
  RETURN v_old.id;
 END IF;
 IF p_kind='prediction' THEN
  IF EXISTS(SELECT 1 FROM roleta_audit.prospective_evidence
  WHERE event_id=p_event AND kind='outcome') THEN RAISE EXCEPTION 'event closed'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM roleta_audit.prospective_evidence
  WHERE event_id=p_event AND kind='prediction') THEN RAISE EXCEPTION 'outcome without prediction'; END IF;
 END IF;
 SELECT record_sha256 INTO v_prev FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_ts:=clock_timestamp();
 -- CI-local digest; canonical envelope integration pending.
 v_hash:=encode(extensions.digest(convert_to(
  coalesce(v_prev,'')||':'||p_sha||':'||p_actor||':'||
  to_char(v_ts AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'UTF8'),'sha256'),'hex');
 INSERT INTO roleta_audit.prospective_evidence
 (event_id,kind,policy,idempotency_key,request_sha256,record_sha256,
 previous_record_sha256,payload,received_at,actor_subject)
 VALUES(p_event,p_kind,p_policy,p_key,p_sha,v_hash,v_prev,p_payload,v_ts,p_actor)
 RETURNING id INTO v_id;
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_evidence_ci(text,text,text,text,text,text,jsonb,text)
 FROM PUBLIC,anon,authenticated;
-- CREATE OR REPLACE preserves existing owner and runtime EXECUTE grant.
