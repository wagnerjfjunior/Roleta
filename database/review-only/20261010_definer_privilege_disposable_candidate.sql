-- REVIEW ONLY. CI disposable database ONLY. No production authorization.
-- Dedicated function owner can SELECT/INSERT through RLS, runtime can EXECUTE only.
DO $guard$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable database only'; END IF;
END $guard$;
CREATE ROLE roleta_append_owner NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT USAGE ON SCHEMA roleta_audit TO roleta_append_owner;
GRANT USAGE ON SCHEMA extensions TO roleta_append_owner;
GRANT SELECT,INSERT ON roleta_audit.prospective_evidence TO roleta_append_owner;
GRANT USAGE ON SEQUENCE roleta_audit.prospective_evidence_id_seq TO roleta_append_owner;
CREATE POLICY roleta_append_owner_select ON roleta_audit.prospective_evidence
 FOR SELECT TO roleta_append_owner USING (true);
CREATE POLICY roleta_append_owner_insert ON roleta_audit.prospective_evidence
 FOR INSERT TO roleta_append_owner WITH CHECK (true);
CREATE FUNCTION roleta_audit.append_authenticated_evidence_ci(
 p_canonical text,p_sha text,p_event text,p_kind text,p_policy text,
 p_key text,p_payload jsonb,p_actor text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $fn$
DECLARE v_doc jsonb;v_id bigint;v_hash text;
BEGIN
 PERFORM pg_catalog.set_config('statement_timeout','3000',true);
 IF p_canonical IS NULL OR octet_length(p_canonical)>81920
    OR p_sha IS NULL OR p_sha !~ '^[0-9a-f]{64}$'
    OR p_actor IS NULL OR length(p_actor)<1 OR length(p_actor)>256
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
 -- This function is deliberately a security *permission* test only.
 -- No real chain or prospective lifecycle is implemented here.
 v_hash:=encode(extensions.digest(convert_to(p_canonical||':'||p_actor,'UTF8'),'sha256'),'hex');
 INSERT INTO roleta_audit.prospective_evidence
  (event_id,kind,policy,idempotency_key,request_sha256,record_sha256,payload,actor_subject)
 VALUES(p_event,p_kind,p_policy,p_key,p_sha,v_hash,p_payload,p_actor)
 RETURNING id INTO v_id;
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.append_authenticated_evidence_ci(text,text,text,text,text,text,jsonb,text)
 FROM PUBLIC,anon,authenticated;
ALTER FUNCTION roleta_audit.append_authenticated_evidence_ci(text,text,text,text,text,text,jsonb,text)
 OWNER TO roleta_append_owner;
GRANT USAGE ON SCHEMA roleta_audit TO roleta_runtime;
GRANT EXECUTE ON FUNCTION roleta_audit.append_authenticated_evidence_ci(text,text,text,text,text,text,jsonb,text)
 TO roleta_runtime;
