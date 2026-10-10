-- Disposable CI verification of stored millisecond timestamps and chain continuity.
DO $test$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable DB only'; END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence
 WHERE event_id IN ('CI-LIFE','CI-DEF-RACE','CI-DEF-OUT') AND received_at<>date_trunc('milliseconds',received_at))
 THEN RAISE EXCEPTION 'sub-millisecond timestamp in chain'; END IF;
 IF EXISTS (SELECT 1 FROM roleta_audit.prospective_evidence e
 WHERE event_id LIKE 'CI-%' AND e.id>1 AND e.previous_record_sha256 IS DISTINCT FROM
 (SELECT p.record_sha256 FROM roleta_audit.prospective_evidence p WHERE p.id<e.id ORDER BY p.id DESC LIMIT 1))
 THEN RAISE EXCEPTION 'broken chain link'; END IF;
END $test$;
