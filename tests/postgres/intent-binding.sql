-- Disposable PostgreSQL only. Verify exact canonical UTF-8 body and digest
-- against independently provided typed fields. Never trust digest alone.
DO $$
BEGIN
 IF current_database() <> 'roleta_ci' THEN RAISE EXCEPTION 'disposable database required'; END IF;
END $$;
CREATE FUNCTION pg_temp.verify_intent_binding(
 p_canonical text,
 p_sha text,
 p_event text,
 p_kind text,
 p_policy text,
 p_key text,
 p_payload jsonb
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
 v_doc jsonb;
BEGIN
 IF p_sha IS NULL OR p_sha !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
 IF encode(extensions.digest(convert_to(p_canonical,'UTF8'),'sha256'),'hex') <> p_sha THEN RETURN false; END IF;
 BEGIN
  v_doc := p_canonical::jsonb;
 EXCEPTION WHEN others THEN RETURN false;
 END;
 IF jsonb_typeof(v_doc) <> 'object' OR
    (SELECT count(*) FROM jsonb_object_keys(v_doc)) <> 5 THEN RETURN false; END IF;
 RETURN v_doc = jsonb_build_object(
  'event_id',p_event,'kind',p_kind,'policy',p_policy,
  'idempotency_key',p_key,'payload',p_payload);
END;
$$;
CREATE TEMP TABLE intent_binding_vectors(
 case_id text PRIMARY KEY,
 canonical_bytes text NOT NULL,
 expected_sha256 text NOT NULL,
 event_id text NOT NULL,
 kind text NOT NULL,
 policy text,
 idempotency_key text NOT NULL,
 payload_json text NOT NULL
);
\copy intent_binding_vectors FROM 'tests/postgres/intent-binding-vectors.tsv' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '\N')
DO $$
DECLARE v_count integer;
BEGIN
 SELECT count(*) INTO v_count FROM intent_binding_vectors
 WHERE NOT pg_temp.verify_intent_binding(canonical_bytes,expected_sha256,event_id,kind,policy,idempotency_key,payload_json::jsonb);
 IF v_count > 0 THEN RAISE EXCEPTION 'valid binding vectors rejected: %',v_count; END IF;
 SELECT count(*) INTO v_count FROM intent_binding_vectors
 WHERE pg_temp.verify_intent_binding(canonical_bytes,repeat('0',64),event_id,kind,policy,idempotency_key,payload_json::jsonb)
 OR pg_temp.verify_intent_binding(canonical_bytes,expected_sha256,event_id||'-tampered',kind,policy,idempotency_key,payload_json::jsonb)
 OR pg_temp.verify_intent_binding(canonical_bytes,expected_sha256,event_id,kind,policy,idempotency_key,'{"tampered":true}'::jsonb)
 OR pg_temp.verify_intent_binding(canonical_bytes,expected_sha256,event_id,kind,policy,idempotency_key||'-tampered',payload_json::jsonb);
 IF v_count > 0 THEN RAISE EXCEPTION 'tampered binding accepted: %',v_count; END IF;
END $$;
