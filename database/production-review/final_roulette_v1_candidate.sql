-- ADDITIVE CANDIDATE. Rehearse on isolated PostgreSQL 17 before production.
-- Uses installed private schema/owner/writer; never rerun F2-12 bootstrap.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $preflight$
BEGIN
 IF to_regclass('roleta_audit.final_roulette_versions') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roleta_append_owner' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roleta_v2_writer' AND NOT rolbypassrls AND NOT rolsuper)
 THEN RAISE EXCEPTION 'unexpected final ledger prerequisites'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto' AND n.nspname='extensions')
 THEN RAISE EXCEPTION 'pgcrypto extension required'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='roleta_append_owner'::regrole AND member='postgres'::regrole AND set_option)
 THEN RAISE EXCEPTION 'unexpected SET membership'; END IF;
END $preflight$;
CREATE TABLE roleta_audit.final_roulette_versions(
 event_id text NOT NULL CHECK(event_id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[MTI]$'),
 version integer NOT NULL CHECK(version>0),
 predecessor_version integer,
 payload jsonb NOT NULL,
 payload_text text NOT NULL CHECK(octet_length(payload_text)<=150000),
 payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[0-9a-f]{64}$'),
 actor_subject text NOT NULL CHECK(actor_subject ~ '^[A-Za-z0-9_-]{1,128}$'),
 reason text NOT NULL CHECK(length(reason)<=1000),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(event_id,version),
 FOREIGN KEY(event_id,predecessor_version) REFERENCES roleta_audit.final_roulette_versions(event_id,version),
 CHECK((version=1 AND predecessor_version IS NULL) OR (version>1 AND predecessor_version=version-1 AND length(trim(reason))>=15)),
 CHECK(payload=payload_text::jsonb),
 CHECK(payload->>'schema'='rlt-final-roulette-v1' AND payload->'event'->>'event_id'=event_id)
);
ALTER TABLE roleta_audit.final_roulette_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_audit.final_roulette_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON roleta_audit.final_roulette_versions FROM PUBLIC,anon,authenticated,service_role,roleta_runtime,roleta_v2_writer;
GRANT SELECT,INSERT ON roleta_audit.final_roulette_versions TO roleta_append_owner;
CREATE POLICY final_owner_select ON roleta_audit.final_roulette_versions FOR SELECT TO roleta_append_owner USING(true);
CREATE POLICY final_owner_insert ON roleta_audit.final_roulette_versions FOR INSERT TO roleta_append_owner WITH CHECK(true);

CREATE FUNCTION roleta_audit.guard_final_roulette_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE e jsonb; n integer; latest integer; mapping jsonb; row_count integer;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'final ledger is append only'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('roleta-final:'||NEW.event_id,0));
 SELECT coalesce(max(version),0) INTO latest FROM roleta_audit.final_roulette_versions WHERE event_id=NEW.event_id;
 IF NEW.version<>latest+1 THEN RAISE EXCEPTION 'stale final version' USING ERRCODE='40001'; END IF;
 IF encode(sha256(convert_to(NEW.payload_text,'UTF8')),'hex')<>NEW.payload_sha256
 THEN RAISE EXCEPTION 'final payload digest mismatch'; END IF;
 e:=NEW.payload->'event'; n:=(e->>'N')::integer; mapping:=e->'drawn_mapping';
 IF n IS NULL OR n<4 OR n>200 OR jsonb_typeof(mapping) IS DISTINCT FROM 'array'
 OR jsonb_array_length(mapping)<>n OR jsonb_array_length(NEW.payload->'reviewed'->'salao')<>n
 OR NEW.payload->'reviewed'->>'status' IS DISTINCT FROM 'VALIDADO'
 OR e->>'human_review_confirmed' IS DISTINCT FROM 'true'
 OR (e->>'event_date')::date>(clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date
 OR e->>'event_id' IS DISTINCT FROM ((e->>'event_date')||'-'||CASE e->>'period' WHEN 'manha' THEN 'M' WHEN 'tarde' THEN 'T' WHEN 'integral' THEN 'I' ELSE '?' END)
 THEN RAISE EXCEPTION 'invalid final event'; END IF;
 SELECT count(*) INTO row_count FROM jsonb_array_elements(mapping) m
 WHERE (m->>'drawn_number')::integer BETWEEN 1 AND n AND (m->>'physical_position')::integer BETWEEN 1 AND 999;
 IF row_count<>n OR (SELECT count(DISTINCT (m->>'drawn_number')::integer) FROM jsonb_array_elements(mapping) m)<>n
 OR (SELECT count(DISTINCT (m->>'physical_position')::integer) FROM jsonb_array_elements(mapping) m)<>n
 THEN RAISE EXCEPTION 'invalid physical permutation'; END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.guard_final_roulette_v1() FROM PUBLIC,anon,authenticated,service_role,roleta_runtime,roleta_v2_writer;
CREATE TRIGGER final_roulette_append_only BEFORE INSERT OR UPDATE OR DELETE ON roleta_audit.final_roulette_versions FOR EACH ROW EXECUTE FUNCTION roleta_audit.guard_final_roulette_v1();

CREATE FUNCTION roleta_audit.save_final_roulette_v1(p_event text,p_text text,p_sha text,p_actor text,p_expected integer,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $fn$
DECLARE latest roleta_audit.final_roulette_versions%ROWTYPE; content jsonb; v integer;
BEGIN
 IF p_event IS NULL OR p_text IS NULL OR p_actor IS NULL OR p_sha IS NULL OR p_expected IS NULL OR p_expected<0
 OR p_event !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[MTI]$' OR p_actor !~ '^[A-Za-z0-9_-]{1,128}$' OR octet_length(p_text)>150000
 THEN RAISE EXCEPTION 'invalid final command'; END IF;
 content:=p_text::jsonb;
 PERFORM pg_advisory_xact_lock(hashtextextended('roleta-final:'||p_event,0));
 SELECT * INTO latest FROM roleta_audit.final_roulette_versions WHERE event_id=p_event ORDER BY version DESC LIMIT 1;
 IF FOUND THEN
  -- Retry the precise version produced by this expected predecessor, even
  -- after a later correction: never resurrect an old version as current.
  IF EXISTS(SELECT 1 FROM roleta_audit.final_roulette_versions WHERE event_id=p_event AND version=p_expected+1 AND payload=content AND payload_sha256=p_sha AND actor_subject=p_actor AND reason=coalesce(p_reason,'')) THEN
   RETURN jsonb_build_object('status','replayed','event_id',p_event,'version',p_expected+1,'current_version',latest.version);
  END IF;
  IF p_expected<>latest.version THEN RAISE EXCEPTION 'stale final version' USING ERRCODE='40001'; END IF;
  IF content=latest.payload THEN RETURN jsonb_build_object('status','replayed','event_id',p_event,'version',latest.version,'current_version',latest.version); END IF;
  IF length(trim(coalesce(p_reason,'')))<15 THEN RAISE EXCEPTION 'correction reason required' USING ERRCODE='22023'; END IF;
 ELSE
  IF p_expected<>0 THEN RAISE EXCEPTION 'missing predecessor' USING ERRCODE='40001'; END IF;
 END IF;
 v:=coalesce(latest.version,0)+1;
 INSERT INTO roleta_audit.final_roulette_versions(event_id,version,predecessor_version,payload,payload_text,payload_sha256,actor_subject,reason)
 VALUES(p_event,v,CASE WHEN v>1 THEN v-1 END,content,p_text,p_sha,p_actor,coalesce(p_reason,''));
 RETURN jsonb_build_object('status','saved','event_id',p_event,'version',v,'current_version',v);
END $fn$;

CREATE FUNCTION roleta_audit.read_final_roulettes_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog SET row_security=on AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object('event_id',event_id,'version',version,'digest',payload_sha256,'recorded_at',recorded_at,'payload',payload) ORDER BY event_id),'[]'::jsonb)
 FROM (SELECT DISTINCT ON(event_id) event_id,version,payload_sha256,recorded_at,payload FROM roleta_audit.final_roulette_versions ORDER BY event_id,version DESC LIMIT 5000) latest
$fn$;

-- Private definer owner has SELECT/INSERT only, and is neither login nor bypassrls.
GRANT CREATE ON SCHEMA roleta_audit TO roleta_append_owner;
GRANT roleta_append_owner TO postgres WITH SET TRUE;
ALTER FUNCTION roleta_audit.save_final_roulette_v1(text,text,text,text,integer,text) OWNER TO roleta_append_owner;
ALTER FUNCTION roleta_audit.read_final_roulettes_v1() OWNER TO roleta_append_owner;
GRANT roleta_append_owner TO postgres WITH SET FALSE;
REVOKE CREATE ON SCHEMA roleta_audit FROM roleta_append_owner;
REVOKE ALL ON FUNCTION roleta_audit.save_final_roulette_v1(text,text,text,text,integer,text),roleta_audit.read_final_roulettes_v1() FROM PUBLIC,anon,authenticated,service_role,roleta_runtime;
GRANT EXECUTE ON FUNCTION roleta_audit.save_final_roulette_v1(text,text,text,text,integer,text),roleta_audit.read_final_roulettes_v1() TO roleta_v2_writer;
COMMIT;
