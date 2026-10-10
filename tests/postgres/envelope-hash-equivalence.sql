-- Disposable CI only. Compare PostgreSQL-computed canonical envelope bytes with JS.
DO $guard$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable DB required'; END IF;
END $guard$;
CREATE TEMP TABLE envelope_vectors(
 case_id text PRIMARY KEY, previous_hash text, request_sha text NOT NULL,
 received_at text NOT NULL, actor text NOT NULL, expected_sha text NOT NULL
);
\copy envelope_vectors FROM 'tests/postgres/envelope-hash-vectors.tsv' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '\N')
CREATE FUNCTION pg_temp.canonical_envelope(
 p_previous text,p_request text,p_received text,p_actor text
) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $fn$
 SELECT '{"actor_subject":'||to_json(p_actor)::text||
 ',"previous_hash":'||to_json(p_previous)::text||
 ',"received_at":'||to_json(p_received)::text||
 ',"request_sha256":'||to_json(p_request)::text||
 ',"version":"rlt-evidence-envelope-v1"}';
$fn$;
-- A separate NULL-accepting version is required for genesis.
CREATE FUNCTION pg_temp.envelope_bytes(
 p_previous text,p_request text,p_received text,p_actor text
) RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
 SELECT '{"actor_subject":'||to_json(p_actor)::text||
 ',"previous_hash":'||coalesce(to_json(p_previous)::text,'null')||
 ',"received_at":'||to_json(p_received)::text||
 ',"request_sha256":'||to_json(p_request)::text||
 ',"version":"rlt-evidence-envelope-v1"}';
$fn$;
DO $test$
DECLARE mismatch int;
BEGIN
 SELECT count(*) INTO mismatch FROM envelope_vectors
 WHERE encode(extensions.digest(convert_to(
 pg_temp.envelope_bytes(previous_hash,request_sha,received_at,actor),'UTF8'),'sha256'),'hex')<>expected_sha;
 IF mismatch>0 THEN RAISE EXCEPTION 'canonical JS/PG envelope hash mismatch: % cases',mismatch; END IF;
 IF (SELECT count(*) FROM envelope_vectors)<5 THEN RAISE EXCEPTION 'insufficient vectors'; END IF;
END $test$;
