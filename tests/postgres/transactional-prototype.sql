-- Disposable CI only. This exercises the untrusted review prototype,
-- NOT the final authenticated or canonical production append contract.
DO $$
DECLARE
 v_first record;
 v_replay record;
 v_other record;
 v_count integer;
BEGIN
 IF current_database() <> 'roleta_ci' THEN RAISE EXCEPTION 'not disposable'; END IF;
 SELECT * INTO v_first FROM roleta_audit.append_prospective_evidence_review(
  'TX-CI-01','prediction','WEEKLY_FROZEN','tx-ci-pred-key-0001',
  repeat('a',64),'{"N":12}'::jsonb,'ci-actor');
 SELECT * INTO v_replay FROM roleta_audit.append_prospective_evidence_review(
  'TX-CI-01','prediction','WEEKLY_FROZEN','tx-ci-pred-key-0001',
  repeat('a',64),'{"N":12}'::jsonb,'ci-actor');
 IF v_first.evidence_id IS DISTINCT FROM v_replay.evidence_id OR NOT v_replay.replay THEN
  RAISE EXCEPTION 'idempotent replay failed';
 END IF;
 BEGIN
  PERFORM roleta_audit.append_prospective_evidence_review(
   'TX-CI-01','prediction','WEEKLY_FROZEN','tx-ci-pred-key-0001',
   repeat('b',64),'{"N":13}'::jsonb,'ci-actor');
  RAISE EXCEPTION 'conflicting replay was accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  PERFORM roleta_audit.append_prospective_evidence_review(
   'TX-CI-01','prediction','WEEKLY_FROZEN','tx-ci-pred-key-0002',
   repeat('c',64),'{"N":12}'::jsonb,'ci-actor');
  RAISE EXCEPTION 'duplicate policy accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  PERFORM roleta_audit.append_prospective_evidence_review(
   'TX-CI-02','outcome',NULL,'tx-ci-out-key-0001',
   repeat('d',64),'{"position":2}'::jsonb,'ci-actor');
  RAISE EXCEPTION 'orphan outcome accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'outcome without prediction' THEN RAISE; END IF;
 END;
 SELECT * INTO v_other FROM roleta_audit.append_prospective_evidence_review(
  'TX-CI-01','outcome',NULL,'tx-ci-out-key-0002',
  repeat('e',64),'{"position":2}'::jsonb,'ci-actor');
 IF v_other.evidence_id IS NULL THEN RAISE EXCEPTION 'outcome missing'; END IF;
 BEGIN
  PERFORM roleta_audit.append_prospective_evidence_review(
   'TX-CI-01','prediction','CURRENT_SHADOW','tx-ci-pred-key-0003',
   repeat('f',64),'{"N":12}'::jsonb,'ci-actor');
  RAISE EXCEPTION 'post-outcome prediction accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'event closed' THEN RAISE; END IF;
 END;
 SELECT count(*) INTO v_count FROM roleta_audit.prospective_evidence WHERE event_id='TX-CI-01';
 IF v_count<>2 THEN RAISE EXCEPTION 'unexpected rows after failed writes: %',v_count; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM roleta_audit.prospective_evidence
  WHERE event_id='TX-CI-01' AND kind='outcome' AND previous_record_sha256=v_first.evidence_hash
 ) THEN RAISE EXCEPTION 'outcome chain predecessor incorrect'; END IF;
END $$;
