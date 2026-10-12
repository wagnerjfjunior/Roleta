-- Isolated CI only: no synthetic production event. Roll back every fixture.
BEGIN;
DO $gate$ BEGIN IF current_database()<>'roleta_gate_a_ci' THEN RAISE EXCEPTION 'disposable database required'; END IF; END $gate$;
SET ROLE roleta_v2_writer;
DO $cases$
DECLARE p jsonb; bad jsonb; t text; r jsonb;
BEGIN
 p:='{"schema":"rlt-final-roulette-v1","event":{"event_id":"2026-10-11-I","event_date":"2026-10-11","period":"integral","N":4,"human_review_confirmed":true,"physical_mapping_complete":false,"occupied":[],"first":null,"second":null,"courtesy":null,"last":null,"drawn_mapping":[{"drawn_number":1,"physical_position":null},{"drawn_number":2,"physical_position":null},{"drawn_number":3,"physical_position":null},{"drawn_number":4,"physical_position":null}]},"reviewed":{"status":"VALIDADO","salao":[{},{},{},{}]}}'::jsonb;
 bad:=p #- '{event,physical_mapping_complete}';t:=bad::text;
 BEGIN
  PERFORM roleta_audit.save_final_roulette_v1('2026-10-11-I',t,encode(sha256(convert_to(t,'UTF8')),'hex'),'operator_test',0,'');
  RAISE EXCEPTION 'unmarked unknown mapping accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='unmarked unknown mapping accepted' THEN RAISE; END IF; END;
 bad:=jsonb_set(p,'{event,first}','1');t:=bad::text;
 BEGIN
  PERFORM roleta_audit.save_final_roulette_v1('2026-10-11-I',t,encode(sha256(convert_to(t,'UTF8')),'hex'),'operator_test',0,'');
  RAISE EXCEPTION 'fabricated index accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='fabricated index accepted' THEN RAISE; END IF; END;
 t:=p::text;
 r:=roleta_audit.save_final_roulette_v1('2026-10-11-I',t,encode(sha256(convert_to(t,'UTF8')),'hex'),'operator_test',0,'');
 IF r->>'status'<>'saved' THEN RAISE EXCEPTION 'final-only save failed'; END IF;
 r:=roleta_audit.save_final_roulette_v1('2026-10-11-I',t,encode(sha256(convert_to(t,'UTF8')),'hex'),'operator_test',0,'');
 IF r->>'status'<>'replayed' THEN RAISE EXCEPTION 'final-only replay failed'; END IF;
END $cases$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS final-only save, replay, explicit unknown mapping and index integrity' AS result;
