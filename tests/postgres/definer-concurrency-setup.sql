-- CI-only fixtures for separate psql sessions, after definer-lifecycle.sql.
DO $guard$
BEGIN
 IF current_database()<>'roleta_ci' THEN RAISE EXCEPTION 'disposable DB only'; END IF;
END $guard$;
CREATE TABLE roleta_audit.ci_definer_vectors (
 label text PRIMARY KEY, canonical_bytes text NOT NULL, sha text NOT NULL,
 event_id text NOT NULL, kind text NOT NULL, policy text, idem text NOT NULL,
 payload jsonb NOT NULL
);
\copy roleta_audit.ci_definer_vectors FROM 'tests/postgres/definer-concurrency-vectors.tsv' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '\N')
GRANT SELECT ON roleta_audit.ci_definer_vectors TO roleta_runtime;
