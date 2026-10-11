-- CI ONLY: end-to-end V2 RPC rehearsal on disposable roleta_gate_a_ci.
DO $guard$ BEGIN
 IF current_database()<>'roleta_gate_a_ci' THEN RAISE EXCEPTION 'not disposable'; END IF;
END $guard$;
DO $test$
DECLARE
 payload jsonb;
 envelope jsonb;
 serialized text;
 hash text;
 first_id bigint;
 retry_id bigint;
 second_id bigint;
 shadow1 bigint;
 shadow2 bigint;
 older_sha text;
 current_sha text;
 previous_sha text;
BEGIN
 payload:=jsonb_build_object(
   'recommendation_id','ci-v2-wagner-weekly','person_id','wagner',
   'revision_number',1,'supersedes_recommendation_id',NULL,'physical_position',7,
   'generated_at','2026-10-10T19:00:00Z','data_cutoff','2026-10-10T18:00:00Z',
   'frozen_at','2026-10-10T19:01:00Z');
 envelope:=jsonb_build_object(
  'version','rlt-person-evidence-v2','actor_subject','google:ci-operator',
  'event_id','CI-V2-TEAM','kind','prediction','policy','WEEKLY_FROZEN',
  'person_id','wagner','recommendation_id','ci-v2-wagner-weekly',
  'revision_number',1,'idempotency_key','ci-v2-wagner-weekly-01','payload',payload);
 serialized:=envelope::text;
 hash:=encode(extensions.digest(convert_to(serialized,'UTF8'),'sha256'),'hex');
 SELECT roleta_audit.append_authenticated_person_evidence_v2(
 serialized,hash,'google:ci-operator','CI-V2-TEAM','wagner',
 'ci-v2-wagner-weekly','WEEKLY_FROZEN','ci-v2-wagner-weekly-01',payload)
 INTO first_id;
 SELECT roleta_audit.append_authenticated_person_evidence_v2(
 serialized,hash,'google:ci-operator','CI-V2-TEAM','wagner',
 'ci-v2-wagner-weekly','WEEKLY_FROZEN','ci-v2-wagner-weekly-01',payload)
 INTO retry_id;
 IF first_id IS NULL OR first_id<>retry_id THEN
  RAISE EXCEPTION 'idempotent replay mismatch'; END IF;
 BEGIN
  PERFORM roleta_audit.append_authenticated_person_evidence_v2(
   serialized,repeat('0',64),'google:ci-operator','CI-V2-TEAM','wagner',
   'ci-v2-wagner-weekly','WEEKLY_FROZEN','ci-v2-wagner-weekly-01',payload);
  RAISE EXCEPTION 'forged digest accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'V2 request digest mismatch' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM roleta_audit.append_authenticated_person_evidence_v2(
   serialized,hash,'google:ci-operator','CI-V2-TEAM','laura',
   'ci-v2-wagner-weekly','WEEKLY_FROZEN','ci-v2-wagner-weekly-01',payload);
  RAISE EXCEPTION 'forged person accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'V2 envelope fields mismatch' THEN RAISE; END IF;
 END;
 -- second person same event, same weekly policy.
 payload:=jsonb_set(jsonb_set(payload,'{person_id}','"laura"'),
                      '{recommendation_id}','"ci-v2-laura-weekly"');
 envelope:=jsonb_set(jsonb_set(jsonb_set(envelope,'{person_id}','"laura"'),
  '{recommendation_id}','"ci-v2-laura-weekly"'),
  '{idempotency_key}','"ci-v2-laura-weekly-01"');
 envelope:=jsonb_set(envelope,'{payload}',payload);
 serialized:=envelope::text;
 hash:=encode(extensions.digest(convert_to(serialized,'UTF8'),'sha256'),'hex');
 SELECT roleta_audit.append_authenticated_person_evidence_v2(
  serialized,hash,'google:ci-operator','CI-V2-TEAM','laura',
  'ci-v2-laura-weekly','WEEKLY_FROZEN','ci-v2-laura-weekly-01',payload)
 INTO second_id;
 IF second_id IS NULL OR second_id=first_id THEN RAISE EXCEPTION 'multi-person failed'; END IF;
 SELECT record_sha256,previous_record_sha256 INTO current_sha,previous_sha
 FROM roleta_audit.prospective_evidence WHERE id=second_id;
 SELECT record_sha256 INTO older_sha
 FROM roleta_audit.prospective_evidence WHERE id=first_id;
 IF previous_sha IS DISTINCT FROM older_sha
    OR current_sha<>encode(extensions.digest(convert_to(
     'rlt-chain-v2|'||older_sha||'|'||hash||'|google:ci-operator|ci-v2-laura-weekly',
      'UTF8'),'sha256'),'hex')
 THEN RAISE EXCEPTION 'hash chain mismatch'; END IF;
 -- shadow revision 1
 payload:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,
  '{person_id}','"wagner"'),'{recommendation_id}','"ci-v2-wagner-shadow1"'),
  '{frozen_at}','null'::jsonb),'{physical_position}','10'::jsonb);
 envelope:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(envelope,
  '{policy}','"CURRENT_SHADOW"'),'{person_id}','"wagner"'),
  '{recommendation_id}','"ci-v2-wagner-shadow1"'),
  '{idempotency_key}','"ci-v2-wagner-shadow-01"');
 envelope:=jsonb_set(envelope,'{payload}',payload);
 serialized:=envelope::text;
 hash:=encode(extensions.digest(convert_to(serialized,'UTF8'),'sha256'),'hex');
 SELECT roleta_audit.append_authenticated_person_evidence_v2(
 serialized,hash,'google:ci-operator','CI-V2-TEAM','wagner',
 'ci-v2-wagner-shadow1','CURRENT_SHADOW','ci-v2-wagner-shadow-01',payload)
 INTO shadow1;
 -- shadow revision 2 with predecessor resolved by application ID.
 payload:=jsonb_set(jsonb_set(jsonb_set(payload,
 '{revision_number}','2'::jsonb),
 '{supersedes_recommendation_id}','"ci-v2-wagner-shadow1"'),
 '{recommendation_id}','"ci-v2-wagner-shadow2"');
 envelope:=jsonb_set(jsonb_set(jsonb_set(envelope,
 '{revision_number}','2'::jsonb),
 '{recommendation_id}','"ci-v2-wagner-shadow2"'),
 '{idempotency_key}','"ci-v2-wagner-shadow-02"');
 envelope:=jsonb_set(envelope,'{payload}',payload);
 serialized:=envelope::text;
 hash:=encode(extensions.digest(convert_to(serialized,'UTF8'),'sha256'),'hex');
 SELECT roleta_audit.append_authenticated_person_evidence_v2(
 serialized,hash,'google:ci-operator','CI-V2-TEAM','wagner',
 'ci-v2-wagner-shadow2','CURRENT_SHADOW','ci-v2-wagner-shadow-02',payload)
 INTO shadow2;
 IF (SELECT supersedes_id FROM roleta_audit.prospective_evidence WHERE id=shadow2)
    IS DISTINCT FROM shadow1 THEN RAISE EXCEPTION 'shadow lineage broken'; END IF;
 IF (SELECT count(*) FROM roleta_audit.prospective_evidence
     WHERE event_id='CI-V2-TEAM')<>4
 THEN RAISE EXCEPTION 'unexpected append row count'; END IF;
END $test$;
-- Ensure that no API/runtime role can EXECUTE the created security definer.
DO $perms$
DECLARE f oid;
BEGIN
 SELECT p.oid INTO f FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='roleta_audit' AND p.proname='append_authenticated_person_evidence_v2';
 IF f IS NULL OR EXISTS (
   SELECT 1 FROM pg_roles r WHERE rolname IN
   ('anon','authenticated','service_role','roleta_runtime')
   AND has_function_privilege(r.oid,f,'EXECUTE')
 ) THEN RAISE EXCEPTION 'privileged RPC exposed'; END IF;
END $perms$;

-- A definer-owner can EXECUTE its own function; it must not have
-- LOGIN, BYPASSRLS, schema CREATE, or permissions on shared schemas.
DO $owner$
DECLARE
 v_owner text;
BEGIN
 SELECT p.proowner::regrole::text INTO v_owner FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='roleta_audit' AND p.proname='append_authenticated_person_evidence_v2';
 IF v_owner <> 'roleta_append_owner' THEN
  RAISE EXCEPTION 'function has excessive owner: %',v_owner;
 END IF;
 IF (SELECT rolcanlogin OR rolbypassrls OR rolsuper FROM pg_roles
 WHERE rolname='roleta_append_owner') THEN
  RAISE EXCEPTION 'append owner unexpectedly privileged';
 END IF;
 IF NOT has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','SELECT')
 OR NOT has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','INSERT')
 OR has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','UPDATE')
 OR has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','DELETE')
 OR has_schema_privilege('roleta_append_owner','roleta_audit','CREATE')
 THEN RAISE EXCEPTION 'append owner table/scheme permissions incorrect'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='roleta_audit'
 AND tablename='prospective_evidence'
 AND policyname IN ('roleta_append_owner_select','roleta_append_owner_insert')) <> 2
 THEN RAISE EXCEPTION 'append owner RLS policies absent'; END IF;
END $owner$;

-- Reject format ambiguity even if a caller constructs a matching digest.
DO $strict$
DECLARE p jsonb; e jsonb; s text; h text;
BEGIN
 SELECT payload INTO p FROM roleta_audit.prospective_evidence
 WHERE recommendation_id='ci-v2-wagner-weekly';
 p:=jsonb_set(jsonb_set(p,'{recommendation_id}','"ci-v2-fractional-revision"'),
 '{revision_number}','1.5'::jsonb);
 e:=jsonb_build_object(
  'version','rlt-person-evidence-v2','actor_subject','google:ci-operator',
  'event_id','CI-V2-STRICT','kind','prediction','policy','WEEKLY_FROZEN',
  'person_id','wagner','recommendation_id','ci-v2-fractional-revision',
  'revision_number',1.5,'idempotency_key','ci-v2-fractional-key-01','payload',p);
 s:=e::text;h:=encode(extensions.digest(convert_to(s,'UTF8'),'sha256'),'hex');
 BEGIN
  PERFORM roleta_audit.append_authenticated_person_evidence_v2(
   s,h,'google:ci-operator','CI-V2-STRICT','wagner',
   'ci-v2-fractional-revision','WEEKLY_FROZEN','ci-v2-fractional-key-01',p);
  RAISE EXCEPTION 'fractional revision accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'invalid V2 number or UTC timestamp' THEN RAISE; END IF;
 END;
 p:=jsonb_set(jsonb_set(p,'{recommendation_id}','"ci-v2-local-clock"'),
 '{revision_number}','1'::jsonb);
 p:=jsonb_set(p,'{generated_at}','"2026-10-10 19:00:00"');
 e:=jsonb_set(jsonb_set(jsonb_set(e,'{recommendation_id}','"ci-v2-local-clock"'),
 '{revision_number}','1'::jsonb),'{payload}',p);
 s:=e::text;h:=encode(extensions.digest(convert_to(s,'UTF8'),'sha256'),'hex');
 BEGIN
  PERFORM roleta_audit.append_authenticated_person_evidence_v2(
   s,h,'google:ci-operator','CI-V2-STRICT','wagner',
   'ci-v2-local-clock','WEEKLY_FROZEN','ci-v2-fractional-key-01',p);
  RAISE EXCEPTION 'ambiguous local timestamp accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'invalid V2 number or UTC timestamp' THEN RAISE; END IF;
 END;
END $strict$;

-- No elevated SET ROLE membership may survive owner transfer.
DO $membership$
BEGIN
 IF EXISTS (
  SELECT 1 FROM pg_auth_members m
  WHERE m.roleid='roleta_append_owner'::regrole
    AND m.member='postgres'::regrole AND m.set_option
 ) THEN RAISE EXCEPTION 'temporary SET ROLE option leaked after migration'; END IF;
END $membership$;


-- Gate B negative transaction proofs (CI disposable database only).
DO $gate_b_negative$
DECLARE
 p jsonb;
 e jsonb;
 wire text;
 h text;
 n_before bigint;
 n_after bigint;
BEGIN
 IF current_database()<>'roleta_gate_a_ci' THEN
  RAISE EXCEPTION 'Gate B negative tests may only run in disposable CI DB';
 END IF;
 SELECT count(*) INTO n_before FROM roleta_audit.prospective_evidence;

 -- Same idempotency key but modified valid envelope MUST fail atomically.
 SELECT payload INTO p FROM roleta_audit.prospective_evidence
 WHERE recommendation_id='ci-v2-wagner-weekly';
 p:=jsonb_set(p,'{recommendation_id}','"ci-v2-wagner-weekly-conflict"');
 e:=jsonb_build_object(
  'version','rlt-person-evidence-v2','actor_subject','google:ci-operator',
  'event_id','CI-V2-TEAM','kind','prediction','policy','WEEKLY_FROZEN',
  'person_id','wagner','recommendation_id','ci-v2-wagner-weekly-conflict',
  'revision_number',1,'idempotency_key','ci-v2-wagner-weekly-01','payload',p);
 wire:=e::text;
 h:=encode(extensions.digest(convert_to(wire,'UTF8'),'sha256'),'hex');
 BEGIN
  PERFORM roleta_audit.append_authenticated_person_evidence_v2(
   wire,h,'google:ci-operator','CI-V2-TEAM','wagner',
   'ci-v2-wagner-weekly-conflict','WEEKLY_FROZEN','ci-v2-wagner-weekly-01',p);
  RAISE EXCEPTION 'Gate B accepted conflicting idempotency key';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'idempotency conflict' THEN RAISE; END IF;
 END;

 -- A legitimate first shadow revision for a second person.
 SELECT payload INTO p FROM roleta_audit.prospective_evidence
 WHERE recommendation_id='ci-v2-wagner-shadow1';
 p:=jsonb_set(jsonb_set(p,'{person_id}','"laura"'),
  '{recommendation_id}','"ci-v2-laura-shadow1"');
 e:=jsonb_build_object(
  'version','rlt-person-evidence-v2','actor_subject','google:ci-operator',
  'event_id','CI-V2-TEAM','kind','prediction','policy','CURRENT_SHADOW',
  'person_id','laura','recommendation_id','ci-v2-laura-shadow1',
  'revision_number',1,'idempotency_key','ci-v2-laura-shadow-01','payload',p);
 wire:=e::text;
 h:=encode(extensions.digest(convert_to(wire,'UTF8'),'sha256'),'hex');
 PERFORM roleta_audit.append_authenticated_person_evidence_v2(
  wire,h,'google:ci-operator','CI-V2-TEAM','laura',
  'ci-v2-laura-shadow1','CURRENT_SHADOW','ci-v2-laura-shadow-01',p);

 -- Revision 2 cannot supersede another person's chain even if the parent exists.
 p:=jsonb_set(jsonb_set(jsonb_set(p,
  '{recommendation_id}','"ci-v2-laura-shadow2-invalid"'),
  '{revision_number}','2'::jsonb),
  '{supersedes_recommendation_id}','"ci-v2-wagner-shadow1"');
 e:=jsonb_build_object(
  'version','rlt-person-evidence-v2','actor_subject','google:ci-operator',
  'event_id','CI-V2-TEAM','kind','prediction','policy','CURRENT_SHADOW',
  'person_id','laura','recommendation_id','ci-v2-laura-shadow2-invalid',
  'revision_number',2,'idempotency_key','ci-v2-laura-shadow-02','payload',p);
 wire:=e::text;
 h:=encode(extensions.digest(convert_to(wire,'UTF8'),'sha256'),'hex');
 BEGIN
  PERFORM roleta_audit.append_authenticated_person_evidence_v2(
   wire,h,'google:ci-operator','CI-V2-TEAM','laura',
   'ci-v2-laura-shadow2-invalid','CURRENT_SHADOW','ci-v2-laura-shadow-02',p);
  RAISE EXCEPTION 'Gate B accepted cross-person revision predecessor';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'invalid revision predecessor' THEN RAISE; END IF;
 END;
 SELECT count(*) INTO n_after FROM roleta_audit.prospective_evidence;
 IF n_after<>n_before+1 THEN
  RAISE EXCEPTION 'Gate B atomicity failure or negative test inserted row';
 END IF;
 IF EXISTS(SELECT 1 FROM roleta_audit.prospective_evidence
  WHERE recommendation_id IN (
   'ci-v2-wagner-weekly-conflict','ci-v2-laura-shadow2-invalid'))
 THEN RAISE EXCEPTION 'Gate B unexpected prohibited evidence persists'; END IF;
END $gate_b_negative$;
