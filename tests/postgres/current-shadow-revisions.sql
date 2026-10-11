-- CI ONLY: revision semantics on the disposable review ledger.
DO $guard$
BEGIN
  IF current_database() <> 'roleta_ci' THEN
    RAISE EXCEPTION 'disposable database required';
  END IF;
END $guard$;
DO $test$
DECLARE
  weekly_id bigint;
  shadow_first_id bigint;
  shadow_second_id bigint;
  outcome_id bigint;
  total_before integer;
BEGIN
  SELECT evidence_id INTO weekly_id
  FROM roleta_audit.append_prospective_evidence_review(
    'CI-REVISION-1','prediction','WEEKLY_FROZEN',
    'ci-revision-weekly-0001',repeat('a',64),
    '{"position":3}'::jsonb,'ci-actor');

  SELECT evidence_id INTO shadow_first_id
  FROM roleta_audit.append_prospective_evidence_review(
    'CI-REVISION-1','prediction','CURRENT_SHADOW',
    'ci-revision-current-0001',repeat('b',64),
    '{"position":5,"revision_number":1}'::jsonb,'ci-actor');

  SELECT evidence_id INTO shadow_second_id
  FROM roleta_audit.append_prospective_evidence_review(
    'CI-REVISION-1','prediction','CURRENT_SHADOW',
    'ci-revision-current-0002',repeat('c',64),
    '{"position":8,"revision_number":2,"supersedes":1}'::jsonb,'ci-actor');

  IF weekly_id IS NULL OR shadow_first_id IS NULL OR shadow_second_id IS NULL
    OR shadow_first_id = shadow_second_id THEN
    RAISE EXCEPTION 'revision append failed';
  END IF;

  IF (SELECT count(*) FROM roleta_audit.prospective_evidence
      WHERE event_id='CI-REVISION-1' AND kind='prediction') <> 3 THEN
    RAISE EXCEPTION 'revision history not preserved';
  END IF;

  IF (SELECT count(*) FROM roleta_audit.prospective_evidence
      WHERE event_id='CI-REVISION-1' AND policy='WEEKLY_FROZEN') <> 1 THEN
    RAISE EXCEPTION 'weekly frozen changed';
  END IF;

  BEGIN
    PERFORM roleta_audit.append_prospective_evidence_review(
      'CI-REVISION-1','prediction','WEEKLY_FROZEN',
      'ci-revision-weekly-0002',repeat('d',64),
      '{"position":9}'::jsonb,'ci-actor');
    RAISE EXCEPTION 'duplicate weekly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  SELECT count(*) INTO total_before FROM roleta_audit.prospective_evidence
    WHERE event_id='CI-REVISION-1';

  SELECT evidence_id INTO outcome_id
  FROM roleta_audit.append_prospective_evidence_review(
    'CI-REVISION-1','outcome',NULL,
    'ci-revision-outcome-0001',repeat('e',64),
    '{"first":1,"last":12}'::jsonb,'ci-actor');
  IF outcome_id IS NULL THEN RAISE EXCEPTION 'outcome append failed'; END IF;

  BEGIN
    PERFORM roleta_audit.append_prospective_evidence_review(
      'CI-REVISION-1','prediction','CURRENT_SHADOW',
      'ci-revision-current-0003',repeat('f',64),
      '{"position":12,"revision_number":3}'::jsonb,'ci-actor');
    RAISE EXCEPTION 'post-outcome revision accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'event closed' THEN RAISE; END IF;
  END;

  IF (SELECT count(*) FROM roleta_audit.prospective_evidence
      WHERE event_id='CI-REVISION-1') <> total_before+1 THEN
    RAISE EXCEPTION 'post-outcome mutation or missing result';
  END IF;
END $test$;
