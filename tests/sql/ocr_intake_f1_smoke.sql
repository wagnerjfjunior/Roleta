-- SFJM F1 / PR #126: PostgreSQL isolated regression tests (DO NOT RUN ON SHARED DB).
-- Prerequisite: apply 20261015_roleta_ocr_intake_gate1_draft.sql in disposable PostgreSQL.
-- Assertions throw on unexpected success; all changes rolled back.
BEGIN;
DO $$
DECLARE
  j uuid := gen_random_uuid();
  failed boolean;
  original jsonb := '{"linhas":[{"nome_lido":"Paola","numero_sorteado":10}],"data":"14.10.2016"}'::jsonb;
BEGIN
  -- No grants to browser roles.
  IF has_schema_privilege('anon','roleta_intake','USAGE')
    OR has_schema_privilege('authenticated','roleta_intake','USAGE')
    OR has_table_privilege('anon','roleta_intake.jobs','SELECT')
    OR has_table_privilege('authenticated','roleta_intake.results','SELECT') THEN
    RAISE EXCEPTION 'browser role unexpectedly granted access';
  END IF;

  INSERT INTO roleta_intake.jobs(id,operator_sub,image_sha256)
    VALUES(j,'operator-a',repeat('a',64));
  UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j;
  INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
    VALUES(j,'gemini-3.8-flash',original,repeat('b',64));
  UPDATE roleta_intake.jobs SET state='READY_FOR_REVIEW',finished_at=now() WHERE id=j;

  IF (SELECT raw_json FROM roleta_intake.results WHERE job_id=j) IS DISTINCT FROM original THEN
    RAISE EXCEPTION 'original Gemini JSON not preserved';
  END IF;

  -- Terminal state cannot revert.
  failed := false;
  BEGIN
    UPDATE roleta_intake.jobs SET state='PROCESSING' WHERE id=j;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'terminal state reverted'; END IF;

  -- Immutable operator ownership.
  failed := false;
  BEGIN
    UPDATE roleta_intake.jobs SET operator_sub='operator-b' WHERE id=j;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'operator reassigned'; END IF;

  -- Immutable Gemini JSON: update and delete.
  failed := false;
  BEGIN
    UPDATE roleta_intake.results SET raw_json='{}'::jsonb WHERE job_id=j;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Gemini JSON updated'; END IF;
  failed := false;
  BEGIN
    DELETE FROM roleta_intake.results WHERE job_id=j;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Gemini JSON deleted'; END IF;

  -- Duplicate result must not overwrite existing JSON.
  failed := false;
  BEGIN
    INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
      VALUES(j,'gemini-3.6-flash','{}'::jsonb,repeat('c',64));
  EXCEPTION WHEN unique_violation THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'duplicate Gemini result accepted'; END IF;

  -- Invalid JSON shape.
  failed := false;
  BEGIN
    INSERT INTO roleta_intake.results(job_id,model_id,raw_json,raw_sha256)
      VALUES(gen_random_uuid(),'gemini-3.8-flash','[]'::jsonb,repeat('b',64));
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'invalid Gemini JSON accepted'; END IF;

  -- Invalid image digest.
  failed := false;
  BEGIN
    INSERT INTO roleta_intake.jobs(operator_sub,image_sha256) VALUES('operator-a','not-a-sha256');
  EXCEPTION WHEN check_violation THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'invalid image hash accepted'; END IF;

  -- FAILED must have an error code and completion time.
  failed := false;
  BEGIN
    INSERT INTO roleta_intake.jobs(operator_sub,image_sha256,state)
      VALUES('operator-a',repeat('d',64),'FAILED');
  EXCEPTION WHEN check_violation THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'invalid FAILED job accepted'; END IF;
END $$;
ROLLBACK;

-- F2 requires additional E2E tests: callback authentication/replay, atomic result+status
-- transaction, owner isolation via dedicated server functions, retries and timeout recovery.
