-- DISPOSABLE CI ONLY: PostgreSQL digests exact UTF-8 bytes provided by trusted JS.
-- It must not attempt to reserialize jsonb into JS canonical form.
DO $$
BEGIN
 IF current_database() <> 'roleta_ci' THEN RAISE EXCEPTION 'disposable database required'; END IF;
END $$;
CREATE TEMP TABLE hash_vectors (case_id text PRIMARY KEY, canonical_bytes text NOT NULL, expected_sha256 text NOT NULL);
\copy hash_vectors(case_id,canonical_bytes,expected_sha256) FROM 'tests/postgres/hash-vectors.tsv' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b')
DO $$
DECLARE mismatches int;
BEGIN
 SELECT count(*) INTO mismatches FROM hash_vectors
 WHERE encode(extensions.digest(convert_to(canonical_bytes,'UTF8'),'sha256'),'hex') <> expected_sha256;
 IF mismatches > 0 THEN RAISE EXCEPTION 'JS/PostgreSQL hash mismatch for % vectors',mismatches; END IF;
 IF (SELECT count(*) FROM hash_vectors) < 6 THEN RAISE EXCEPTION 'insufficient test vectors'; END IF;
END $$;
