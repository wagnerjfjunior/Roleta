-- REVIEW ONLY. Disposable PostgreSQL CI only, never shared production.
CREATE FUNCTION roleta_audit.reject_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
 RAISE EXCEPTION 'prospective evidence is append-only';
END;
$$;
REVOKE ALL ON FUNCTION roleta_audit.reject_evidence_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prospective_evidence_append_only
BEFORE UPDATE OR DELETE ON roleta_audit.prospective_evidence
FOR EACH ROW EXECUTE FUNCTION roleta_audit.reject_evidence_mutation();
