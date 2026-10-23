# Roleta — homologação OCR assíncrono — 23/10/2026

## Decisão
NO-GO para migrations produtivas, merge e ativação. Configuração/homologação autorizadas pelo responsável nesta sessão; aprovação específica dessas três ações continua obrigatória. Não há pedido de aprovação de produção neste checkpoint.

## Estado live inspecionado
- PR #126 Draft, base main `68feb2a73d1e4c66f3477dad1ba08d1d8f387e10`, HEAD de entrada `257a9c283a8f005181bb840e97b8d23c4b70db52`. Seis workflows retornados para esse HEAD concluíram SUCCESS; isso não comprova E2E.
- Vercel roleta: `prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o`, deployment produtivo `dpl_3KcF1YFfUTGfojf5ytTp3b9P44gr` READY, main `68feb2a`. Metadados consultados com decrypt=false: nenhuma variável ROLETA_INTAKE_*. Nenhum deploy nesta sessão. A branch bloqueia deploy Git fora de main em vercel.json.
- Make us2, equipe 19059: 6549955 ACTIVE, lastEdit 2026-10-15T12:07:06.804Z. Fluxo 1→23→21→19, handler 27→29, resposta 13. Conexão Gemini existente saudável; nenhum callback. Nenhuma modificação no cenário.
- Falhas Make de 23/10: execuções `3f001d14a6314e76822cf8d09773ad3f` (13:49 BRT), `2305a9992f8e4d1e9f099367f446f3b5` (13:51 BRT), `1fcae5ca8fab48ccb79cf1ef38674b72` (13:53 BRT): HTTP 503, nenhuma reexecução provocada nesta sessão.
- Supabase uobxxgzshrmbtjfdolxd: consulta somente leitura retornou roleta_ocr e roleta_audit; roleta_intake ausente. Advisors de segurança consultados; apontamentos legados não foram corrigidos por este trabalho. Nenhum dado/schema/role produtivo alterado.

## Mudança candidata
- api/ocr-callback.js aceita envelope autenticado `{status:"FAILED",error_code:"GEMINI_503_EXHAUSTED"}`. Códigos permitidos adicionais: GEMINI_RATE_LIMIT_EXHAUSTED e GEMINI_REQUEST_FAILED. Não aceita resultado simultâneo; não persiste mensagens arbitrárias do provedor.
- F4 draft acrescenta fail_callback: nonce e estado na mesma transação, bloqueio de linha, falha idempotente com novo nonce, replay rejeitado. READY não é sobrescrito; falha terminal não reabre job. Reenvio explícito da fotografia cria novo job depois de FAILED. read_job passa a retornar error_code ao proprietário.
- Testes de API: sucesso da persistência, repetição idempotente, falha após sucesso, payload inválido, banco indisponível e nonce duplicado (DB simulado no conjunto Node).
- Testes SQL novos: falha persistida, error_code, replay, nova tentativa explícita, resultado salvo preservado.
- Testes DOM novos: reload consulta job da conta atual; outra conta não consulta; perda de rede preserva job_id; flag OFF não consulta job assíncrono. Não equivalem a iPhone real nem a sessão Google real.
- Workflow F1–F4 passa a executar também testes DOM de recuperação.

## Evidências locais
Comando: `node --test tests/ocr-callback-endpoint.test.cjs tests/ocr-callback-hmac.test.cjs tests/ocr-async-contract.test.cjs tests/ocr-job-submit.test.cjs tests/ocr-async-recovery-ui.test.cjs tests/ocr-review-render.test.cjs tests/mobile-review-calendar-compact.test.cjs tests/backfill-mobile-review-ui.test.cjs`
Resultado: 51 testes, 51 PASS, 0 FAIL, 0 skipped.
Ensaio SQL: F1, smoke F1, F2, smoke F2, F3, F4 e smoke F3/F4 executados em PGlite 0.5.11 / PostgreSQL 18.6 descartável, todos concluídos. Não é Supabase produtivo, não comprova TLS/pooler nem concorrência entre conexões. PostgreSQL 17 do CI deve confirmar o SHA final antes da aprovação.
Ambiente não possui psql/postgres/docker; instalação apt indisponível. Não se usou Supabase como substituto do laboratório. Dependências de laboratório não integram a aplicação.

## Credencial HTTP gerenciada — ponto de ação humana
Solicitação Make `d96fade6-c23a-4699-8061-cb87d800eba8`, HTTP v4 API key connection, PENDING. Nenhum segredo novo foi provisionado pelo agente.
A conexão existente Roleta-ocr.space-API-Key-connection NÃO foi reutilizada.
Cadastrar exclusivamente na página segura Make; nome sugerido Roleta Callback Homologacao; header X-Roleta-Callback-Key; chave exclusiva aleatória de pelo menos 32 bytes; restringir URLs permitidas ao callback Roleta. Nunca cadastrar chave como mapper, query string, blueprint, comentário ou texto de execução. Destino real de homologação e pareamento do segredo no servidor continuam pendentes. Não inventar URL Preview.
Após conexão: confirmar id, criar shadow separado/inativo, inspecionar exportação/execução sem revelar a credencial; testar chave inválida, revogação e substituição. A existência do formulário seguro não é prova de redaction ou rotação.

## Retry e recuperação — pendente de implementação Make
Política candidata para homologação: no máximo três chamadas por modelo, esperas de 5 s e 15 s apenas em 503/429; depois fallback, com mesmo limite. Não repetir 400/401/403 como indisponibilidade transitória. Após exaustão emitir callback FAILED com código seguro. Não usar Ignore para perder job nem afirmar que Break produz callback terminal após esgotar tentativas. ACK antecipado não é resultado salvo.
Ainda NÃO instalado/testado no shadow: retries dos modelos, callback de sucesso/falha, retries de entrega do callback, preservação de payload, reconciliação de jobs sem callback. `reconciliation_required` continua somente sinal read-only. Sem fotografia durável/outbox, reexecutar despacho automaticamente pode duplicar processamento; permanece bloqueado até desenho e prova de idempotência.

## Gates restantes
1. Conexão gerenciada pareada e prova de não exposição/revogação; shadow isolado completo com ACK, job_id, retry limitado, fallback e callback.
2. PostgreSQL 17 no SHA final, privilégios efetivos no banco compartilhado, backup verificável, role dedicada e TLS/CA. Aprovação específica antes de F1→F4 produtivas.
3. E2E real >180s, callback/nonce/reload Google, isolamento entre operadores, recuperação sem callback, foto incompleta, conferência humana e mobile real.
4. Retenção/limpeza, timeout/worker de reconciliação e limite de funções Vercel. Há 15 arquivos api; quantidade implantável/plano não homologados.
5. AppSec no SHA final, rollback exercitado, aprovação específica de merge e depois de ativação. Não marcar READY agora.

## Rollback preservado
ROLETA_INTAKE_ENABLED ausente/false mantém caminho síncrono e importação JSON. Não destruir jobs/resultados para rollback; conservar cenário 6549955. Antes da publicação registrar deployment/commit de retorno, confirmar env efetiva no build e provar desativação. Login Google, impressão, PDF, estatística e schemas existentes não foram alterados.
