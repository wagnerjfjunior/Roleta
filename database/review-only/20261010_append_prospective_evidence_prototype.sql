-- REVIEW ONLY: DO NOT EXECUTE ON DISCador-MesaCliente.
-- Depends on private schema candidate. Uses pgcrypto digest; validate extension availability.
-- This is a SECURITY INVOKER prototype requiring a dedicated owner-side RPC wrapper.
-- It must NOT be granted to the browser, anon, authenticated or Discador roles.
CREATE OR REPLACE FUNCTION roleta_audit.append_prospective_evidence_review(
 p_event_id text,
 p_kind text,
 p_policy text,
 p_idempotency_key text,
 p_request_sha256 text,
 p_payload jsonb,
 p_actor_subject text
) RETURNS TABLE (evidence_id bigint, evidence_hash text, received_at timestamptz, replay boolean)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, roleta_audit
AS $$
DECLARE
 v_old roleta_audit.prospective_evidence%ROWTYPE;
 v_prev text;
 v_ts timestamptz;
 v_hash text;
 v_id bigint;
 v_count integer;
BEGIN
 -- All writes for this evidence chain serialize without touching Discador tables.
 PERFORM pg_catalog.pg_advisory_xact_lock(1380731973, 1);
 SELECT * INTO v_old FROM roleta_audit.prospective_evidence
  WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_old.request_sha256<>p_request_sha256 THEN
   RAISE EXCEPTION 'idempotency key conflict' USING ERRCODE='23505';
  END IF;
  RETURN QUERY SELECT v_old.id,v_old.record_sha256,v_old.received_at,true;
  RETURN;
 END IF;
 IF p_kind NOT IN ('prediction','outcome') THEN
  RAISE EXCEPTION 'unsupported kind in append prototype';
 END IF;
 IF p_kind='prediction' THEN
  IF p_policy NOT IN ('WEEKLY_FROZEN','CURRENT_SHADOW') THEN
   RAISE EXCEPTION 'invalid policy';
  END IF;
  IF EXISTS(SELECT 1 FROM roleta_audit.prospective_evidence WHERE event_id=p_event_id AND kind='outcome') THEN
   RAISE EXCEPTION 'event closed';
  END IF;
 ELSE
  IF p_policy IS NOT NULL THEN RAISE EXCEPTION 'outcome policy must be null'; END IF;
  SELECT count(*) INTO v_count FROM roleta_audit.prospective_evidence
   WHERE event_id=p_event_id AND kind='prediction';
  IF v_count=0 THEN RAISE EXCEPTION 'outcome without prediction'; END IF;
 END IF;
 SELECT record_sha256 INTO v_prev FROM roleta_audit.prospective_evidence ORDER BY id DESC LIMIT 1;
 v_ts:=clock_timestamp();
 -- REVIEW BLOCKER: PostgreSQL JSONB textual serialization is NOT proven equivalent
 -- to JS canonical(). A single canonical byte contract must be implemented and tested.
 -- This hash is a provisional DB-local digest, NOT the final RLT chain format.
 v_hash:=encode(extensions.digest(pg_catalog.convert_to(
   pg_catalog.concat_ws('|',coalesce(v_prev,''),p_event_id,p_kind,coalesce(p_policy,''),
     p_idempotency_key,p_request_sha256,p_payload::text,v_ts::text,p_actor_subject),'UTF8'),'sha256'),'hex');
 INSERT INTO roleta_audit.prospective_evidence
  (event_id,kind,policy,idempotency_key,request_sha256,record_sha256,
   previous_record_sha256,payload,received_at,actor_subject)
 VALUES(p_event_id,p_kind,p_policy,p_idempotency_key,p_request_sha256,v_hash,
        v_prev,p_payload,v_ts,p_actor_subject)
 RETURNING id INTO v_id;
 RETURN QUERY SELECT v_id,v_hash,v_ts,false;
END;
$$;
-- Deliberately no GRANT and no privileged SECURITY DEFINER wrapper.
-- Explicit authorization and a separately reviewed least-privilege deployment
-- are required before this SQL can be considered for execution.
