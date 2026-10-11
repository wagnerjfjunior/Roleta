-- F2-12 Gate A storage rehearsal. DISPOSABLE PG17 ONLY.
DO $guard$ BEGIN
 IF current_database()<>'roleta_gate_a_ci' THEN RAISE EXCEPTION 'wrong database'; END IF;
END $guard$;
DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='roleta_audit' AND c.relname='prospective_evidence'
 AND c.relrowsecurity AND c.relforcerowsecurity) THEN RAISE EXCEPTION 'RLS FORCE missing'; END IF;
 IF has_schema_privilege('anon','roleta_audit','USAGE')
 OR has_schema_privilege('authenticated','roleta_audit','USAGE')
 OR has_schema_privilege('service_role','roleta_audit','USAGE')
 OR has_schema_privilege('roleta_runtime','roleta_audit','USAGE')
 OR has_schema_privilege('roleta_append_owner','roleta_audit','USAGE')
 THEN RAISE EXCEPTION 'private schema unexpectedly exposed'; END IF;
 IF has_table_privilege('authenticated','roleta_audit.prospective_evidence','SELECT')
 OR has_table_privilege('service_role','roleta_audit.prospective_evidence','INSERT')
 OR has_table_privilege('roleta_runtime','roleta_audit.prospective_evidence','SELECT')
 OR has_table_privilege('roleta_append_owner','roleta_audit.prospective_evidence','INSERT')
 THEN RAISE EXCEPTION 'private table access leaked'; END IF;
 IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member
 WHERE r.rolname IN ('roleta_runtime','roleta_append_owner'))
 THEN RAISE EXCEPTION 'new roles have inherited memberships'; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('roleta_runtime','roleta_append_owner')
 AND (rolcanlogin OR rolbypassrls OR rolsuper)) THEN RAISE EXCEPTION 'privileged runtime'; END IF;
END $check$;
-- Superuser fixture writes are for relational constraint testing only, not runtime activation.
INSERT INTO roleta_audit.prospective_evidence
(event_id,kind,person_id,policy,revision_number,physical_position,generated_at,
 data_cutoff,frozen_at,idempotency_key,request_sha256,record_sha256,payload,actor_subject)
VALUES
('CI-TEAM','prediction','wagner','WEEKLY_FROZEN',1,14,
 '2026-10-10T19:00Z','2026-10-10T18:00Z','2026-10-10T19:00Z',
 'ci-gate-a-wagner-weekly',repeat('a',64),repeat('b',64),'{}','ci'),
('CI-TEAM','prediction','laura','WEEKLY_FROZEN',1,3,
 '2026-10-10T19:00Z','2026-10-10T18:00Z','2026-10-10T19:00Z',
 'ci-gate-a-laura-weekly',repeat('c',64),repeat('d',64),'{}','ci'),
('CI-TEAM','prediction','wagner','CURRENT_SHADOW',1,22,
 '2026-10-10T19:01Z','2026-10-10T18:00Z',NULL,
 'ci-gate-a-wagner-current1',repeat('e',64),repeat('f',64),'{}','ci');
INSERT INTO roleta_audit.prospective_evidence
(event_id,kind,person_id,policy,revision_number,physical_position,generated_at,
 data_cutoff,frozen_at,supersedes_id,idempotency_key,request_sha256,record_sha256,payload,actor_subject)
SELECT 'CI-TEAM','prediction','wagner','CURRENT_SHADOW',2,9,
 '2026-10-10T19:02Z','2026-10-10T18:01Z',NULL,id,
 'ci-gate-a-wagner-current2',repeat('1',64),repeat('2',64),'{}','ci'
FROM roleta_audit.prospective_evidence WHERE event_id='CI-TEAM'
 AND person_id='wagner' AND revision_number=1 AND policy='CURRENT_SHADOW';

DO $test$
BEGIN
 IF (SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='CI-TEAM')<>4
 THEN RAISE EXCEPTION 'person-scoped inserts missing'; END IF;
 BEGIN
 INSERT INTO roleta_audit.prospective_evidence
 (event_id,kind,person_id,policy,revision_number,physical_position,generated_at,data_cutoff,
 frozen_at,idempotency_key,request_sha256,record_sha256,payload,actor_subject)
 VALUES('CI-TEAM','prediction','wagner','WEEKLY_FROZEN',1,15,'2026-10-10T19:00Z',
 '2026-10-10T18:00Z','2026-10-10T19:00Z','ci-gate-a-duplicate-wagner',
 repeat('3',64),repeat('4',64),'{}','ci');
 RAISE EXCEPTION 'duplicate frozen accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
 INSERT INTO roleta_audit.prospective_evidence
 (event_id,kind,person_id,policy,revision_number,physical_position,generated_at,data_cutoff,
 frozen_at,supersedes_id,idempotency_key,request_sha256,record_sha256,payload,actor_subject)
 SELECT 'CI-TEAM','prediction','wagner','CURRENT_SHADOW',2,10,'2026-10-10T19:00Z',
 '2026-10-10T18:00Z',NULL,id,'ci-gate-a-duplicate-current2',
 repeat('5',64),repeat('6',64),'{}','ci'
 FROM roleta_audit.prospective_evidence
 WHERE event_id='CI-TEAM' AND person_id='wagner' AND policy='CURRENT_SHADOW' AND revision_number=1;
 RAISE EXCEPTION 'duplicate revision accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $test$;
SET ROLE authenticated;
DO $neg$
BEGIN
 BEGIN
  EXECUTE 'SELECT count(*) FROM roleta_audit.prospective_evidence';
  RAISE EXCEPTION 'unauthorized SELECT succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  EXECUTE 'INSERT INTO roleta_audit.prospective_evidence DEFAULT VALUES';
  RAISE EXCEPTION 'unauthorized INSERT succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $neg$;
RESET ROLE;
