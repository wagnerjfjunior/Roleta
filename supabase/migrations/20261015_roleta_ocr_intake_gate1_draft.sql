-- SFJM F1 / PR #126: schema Gemini OCR persistente (RASCUNHO; NAO APLICAR EM PRODUCAO).
-- Isolado de roleta_ocr.* (aprendizado) e roleta_audit.* (roleta final).
-- Requer PostgreSQL 15+ e pgcrypto/gen_random_uuid. Revisar grants, RLS, backup e retencao antes do Gate de aplicacao.
CREATE SCHEMA IF NOT EXISTS roleta_intake;
REVOKE ALL ON SCHEMA roleta_intake FROM PUBLIC;
REVOKE ALL ON SCHEMA roleta_intake FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS roleta_intake.jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operator_sub text NOT NULL CHECK (length(operator_sub) BETWEEN 1 AND 128),
 image_sha256 text NOT NULL CHECK (image_sha256 ~ '^[0-9a-f]{64}$'),
 image_storage_path text,
 state text NOT NULL DEFAULT 'QUEUED'
   CHECK (state IN ('QUEUED','PROCESSING','READY_FOR_REVIEW','FAILED')),
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 CONSTRAINT failed_has_error CHECK (state <> 'FAILED' OR error_code IS NOT NULL),
 CONSTRAINT terminal_has_finished_at CHECK (state NOT IN ('READY_FOR_REVIEW','FAILED') OR finished_at IS NOT NULL)
);
COMMENT ON TABLE roleta_intake.jobs IS 'Solicitacoes OCR Gemini preliminares, nunca roletas finais.';
CREATE INDEX IF NOT EXISTS jobs_operator_created_idx ON roleta_intake.jobs(operator_sub, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_operator_digest_idx ON roleta_intake.jobs(operator_sub, image_sha256, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_state_updated_idx ON roleta_intake.jobs(state, updated_at);

CREATE TABLE IF NOT EXISTS roleta_intake.results (
 job_id uuid PRIMARY KEY REFERENCES roleta_intake.jobs(id) ON DELETE RESTRICT,
 provider text NOT NULL DEFAULT 'gemini' CHECK (provider = 'gemini'),
 model_id text NOT NULL CHECK (length(model_id) BETWEEN 1 AND 128),
 raw_json jsonb NOT NULL CHECK (jsonb_typeof(raw_json) = 'object'),
 raw_sha256 text NOT NULL CHECK (raw_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE roleta_intake.results IS 'JSON bruto integral retornado pelo Gemini; imutavel e separado da revisao humana.';

-- Restringe transicoes; estados terminais nao retornam ao processamento.
CREATE OR REPLACE FUNCTION roleta_intake.enforce_job_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.operator_sub IS DISTINCT FROM OLD.operator_sub
    OR NEW.image_sha256 IS DISTINCT FROM OLD.image_sha256
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'immutable job identity';
 END IF;
 IF NEW.state IS DISTINCT FROM OLD.state THEN
   IF NOT ((OLD.state='QUEUED' AND NEW.state IN ('PROCESSING','FAILED'))
        OR (OLD.state='PROCESSING' AND NEW.state IN ('READY_FOR_REVIEW','FAILED'))) THEN
     RAISE EXCEPTION 'invalid job transition';
   END IF;
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_job_transition ON roleta_intake.jobs;
CREATE TRIGGER trg_enforce_job_transition BEFORE UPDATE ON roleta_intake.jobs
 FOR EACH ROW EXECUTE FUNCTION roleta_intake.enforce_job_transition();

-- Impede alteracao ou exclusao do JSON bruto por caminhos comuns.
CREATE OR REPLACE FUNCTION roleta_intake.reject_result_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'raw Gemini results are immutable';
END $$;
DROP TRIGGER IF EXISTS trg_reject_result_mutation ON roleta_intake.results;
CREATE TRIGGER trg_reject_result_mutation BEFORE UPDATE OR DELETE ON roleta_intake.results
 FOR EACH ROW EXECUTE FUNCTION roleta_intake.reject_result_mutation();

-- RLS deny-by-default. Nenhum grant ao browser, Make ou roles compartilhadas.
ALTER TABLE roleta_intake.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleta_intake.results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA roleta_intake FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA roleta_intake FROM PUBLIC, anon, authenticated;
-- ATENCAO: o proprietario das tabelas contorna RLS; a API nao deve usar credencial proprietaria
-- irrestrita. F2 criara funcoes SECURITY DEFINER com search_path fixo, grants EXPLICITAMENTE
-- limitados ao writer dedicado, callback autenticado, transacao atomica e idempotencia.
-- Nao habilitar operacao real ate F2/F3 e aprovacao de migracao.
