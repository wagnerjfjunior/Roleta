-- Preserve the append-only ledger and ACLs; allow explicit unknown physical positions.
CREATE OR REPLACE FUNCTION roleta_audit.guard_final_roulette_v1() RETURNS trigger
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
 WHERE (m->>'drawn_number')::integer BETWEEN 1 AND n;
 IF row_count<>n OR (SELECT count(DISTINCT (m->>'drawn_number')::integer) FROM jsonb_array_elements(mapping) m)<>n
 THEN RAISE EXCEPTION 'invalid final draw permutation'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(mapping) m WHERE
   NOT (m ? 'physical_position') OR
   (m->'physical_position'<>'null'::jsonb AND
    (jsonb_typeof(m->'physical_position')<>'number' OR (m->>'physical_position')::integer NOT BETWEEN 1 AND 999)))
 THEN RAISE EXCEPTION 'invalid known physical position'; END IF;
 SELECT count(*) INTO row_count FROM jsonb_array_elements(mapping) m WHERE m->'physical_position'<>'null'::jsonb;
 IF row_count<>(SELECT count(DISTINCT (m->>'physical_position')::integer) FROM jsonb_array_elements(mapping) m)
 OR (row_count<n AND e->>'physical_mapping_complete' IS DISTINCT FROM 'false')
 THEN RAISE EXCEPTION 'invalid physical mapping completeness'; END IF;
 IF e->'occupied' IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v),'[]'::jsonb) FROM
   (SELECT (m->>'physical_position')::integer v FROM jsonb_array_elements(mapping) m WHERE m->'physical_position'<>'null'::jsonb) q)
 OR e->'first' IS DISTINCT FROM coalesce((SELECT m->'physical_position' FROM jsonb_array_elements(mapping) m WHERE (m->>'drawn_number')::integer=1),'null'::jsonb)
 OR e->'second' IS DISTINCT FROM coalesce((SELECT m->'physical_position' FROM jsonb_array_elements(mapping) m WHERE (m->>'drawn_number')::integer=2),'null'::jsonb)
 OR e->'courtesy' IS DISTINCT FROM coalesce((SELECT m->'physical_position' FROM jsonb_array_elements(mapping) m WHERE (m->>'drawn_number')::integer=n-1),'null'::jsonb)
 OR e->'last' IS DISTINCT FROM coalesce((SELECT m->'physical_position' FROM jsonb_array_elements(mapping) m WHERE (m->>'drawn_number')::integer=n),'null'::jsonb)
 THEN RAISE EXCEPTION 'physical index differs from mapping'; END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION roleta_audit.guard_final_roulette_v1() FROM PUBLIC,anon,authenticated,service_role,roleta_runtime,roleta_v2_writer;
