-- Isolated CI only. Never run this fixture on Supabase production.
DO $fixture_gate$
BEGIN
 IF current_database()<>'roleta_gate_a_ci' THEN RAISE EXCEPTION 'disposable database required'; END IF;
END $fixture_gate$;
CREATE FUNCTION pg_temp.fixture_final(p_id text,p_source text DEFAULT 'test.jpeg') RETURNS text LANGUAGE sql AS $$
 SELECT jsonb_build_object('schema','rlt-final-roulette-v1','event',jsonb_build_object('event_id',p_id,'event_date',left(p_id,10),'period','manha','N',4,'source',p_source,'occupied',jsonb_build_array(1,3,5,10),'first',10,'second',3,'courtesy',5,'last',1,'human_review_confirmed',true,'drawn_mapping',jsonb_build_array(jsonb_build_object('drawn_number',1,'physical_position',10,'broker_name','A'),jsonb_build_object('drawn_number',2,'physical_position',3,'broker_name','B'),jsonb_build_object('drawn_number',3,'physical_position',5,'broker_name','C'),jsonb_build_object('drawn_number',4,'physical_position',1,'broker_name','D'))),'reviewed',jsonb_build_object('status','VALIDADO','salao',jsonb_build_array(1,2,3,4)))::text
$$;
-- Writer can call functions but cannot read/write the table directly.
DO $permissions$
BEGIN
 IF has_table_privilege('roleta_v2_writer','roleta_audit.final_roulette_versions','SELECT') OR has_table_privilege('roleta_v2_writer','roleta_audit.final_roulette_versions','INSERT') OR has_table_privilege('roleta_v2_writer','roleta_audit.final_roulette_versions','UPDATE') OR has_table_privilege('roleta_v2_writer','roleta_audit.final_roulette_versions','DELETE')
 THEN RAISE EXCEPTION 'writer direct table privilege'; END IF;
 IF has_function_privilege('anon','roleta_audit.save_final_roulette_v1(text,text,text,text,integer,text)','EXECUTE') OR has_function_privilege('authenticated','roleta_audit.read_final_roulettes_v1()','EXECUTE') OR has_function_privilege('service_role','roleta_audit.read_final_roulettes_v1()','EXECUTE')
 THEN RAISE EXCEPTION 'browser/privileged API execute'; END IF;
END $permissions$;
SET ROLE roleta_v2_writer;
SELECT roleta_audit.bind_final_operator_v1('wagnerjfjunior@gmail.com','operator_test');
SELECT roleta_audit.bind_final_operator_v1('brendatatianelima@gmail.com','synthetic_actor');
DO $identity_checks$
BEGIN
 BEGIN
  PERFORM roleta_audit.bind_final_operator_v1('wagnerjfjunior@gmail.com','other_subject');
  RAISE EXCEPTION 'subject replacement accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM roleta_audit.bind_final_operator_v1('unknown@example.com','unknown_subject');
  RAISE EXCEPTION 'unapproved account accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $identity_checks$;
DO $cases$
DECLARE t text; t2 text; d text; d2 text; r jsonb; count_now integer;
BEGIN
 t:=pg_temp.fixture_final('2026-10-07-M');d:=encode(sha256(convert_to(t,'UTF8')),'hex');
 r:=roleta_audit.save_final_roulette_v1('2026-10-07-M',t,d,'operator_test',0,'');
 IF r->>'status'<>'saved' OR (r->>'version')::integer<>1 THEN RAISE EXCEPTION 'initial save failed'; END IF;
 r:=roleta_audit.save_final_roulette_v1('2026-10-07-M',t,d,'operator_test',0,'');
 IF r->>'status'<>'replayed' THEN RAISE EXCEPTION 'retry not idempotent'; END IF;
 t2:=pg_temp.fixture_final('2026-10-07-M','corrected.jpeg');d2:=encode(sha256(convert_to(t2,'UTF8')),'hex');
 BEGIN
  PERFORM roleta_audit.save_final_roulette_v1('2026-10-07-M',t2,d2,'operator_test',0,'');
  RAISE EXCEPTION 'divergent duplicate accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
  PERFORM roleta_audit.save_final_roulette_v1('2026-10-07-M',t2,d2,'operator_test',1,'');
  RAISE EXCEPTION 'correction without reason accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 r:=roleta_audit.save_final_roulette_v1('2026-10-07-M',t2,d2,'operator_test',1,'Correção conferida pelo operador');
 IF (r->>'version')::integer<>2 THEN RAISE EXCEPTION 'version chain failed'; END IF;
 r:=roleta_audit.save_final_roulette_v1('2026-10-07-M',t,d,'operator_test',0,'');
 IF (r->>'version')::integer<>1 OR (r->>'current_version')::integer<>2 THEN RAISE EXCEPTION 'old retry resurrected version'; END IF;
 IF jsonb_array_length(roleta_audit.read_final_roulettes_v1())<>1 OR roleta_audit.read_final_roulettes_v1()->0->>'version'<>'2' THEN RAISE EXCEPTION 'current read failed'; END IF;
 BEGIN
  PERFORM roleta_audit.save_final_roulette_v1('2026-10-08-M',pg_temp.fixture_final('2026-10-08-M'),repeat('0',64),'operator_test',0,'');
  RAISE EXCEPTION 'tampered digest accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='tampered digest accepted' THEN RAISE; END IF;
 END;
 -- Force an exception after a successful save inside a subtransaction.
 BEGIN
  t:=pg_temp.fixture_final('2026-10-09-M');
  PERFORM roleta_audit.save_final_roulette_v1('2026-10-09-M',t,encode(sha256(convert_to(t,'UTF8')),'hex'),'operator_test',0,'');
  RAISE EXCEPTION 'synthetic rollback';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF jsonb_array_length(roleta_audit.read_final_roulettes_v1())<>1 THEN RAISE EXCEPTION 'partial transaction persisted'; END IF;
END $cases$;
RESET ROLE;
DO $immutable$
BEGIN
 IF (SELECT count(*) FROM roleta_audit.final_roulette_versions)<>2 THEN RAISE EXCEPTION 'unexpected ledger count'; END IF;
 BEGIN
  UPDATE roleta_audit.final_roulette_versions SET reason='mutated' WHERE version=1;
  RAISE EXCEPTION 'append only guard failed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='append only guard failed' THEN RAISE; END IF; END;
END $immutable$;
-- A concurrent fixture can use this temp-function body via generated SQL.
SELECT 'PASS final ledger save/retry/conflict/versioning/rollback/permissions/immutability' AS result;
