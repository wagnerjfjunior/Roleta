# SFJM WORKSPACE — OCR Gemini durável — 2026-10-15

## Objetivo operacional
Fotografia → Gemini 3.8 Flash (fallback 3.6 Flash) → persistência DURÁVEL do JSON original no Supabase → recuperação autenticada no app, mesmo após timeout/fechamento → conferência humana → persistência da roleta final já existente. OCR.space e aprendizado são fase posterior independente.

## Fonte de verdade e escopo
Repo: wagnerjfjunior/Roleta
Branch de trabalho: sfjm/ocr-async-intake-gate1-20261015
PR draft: https://github.com/wagnerjfjunior/Roleta/pull/126
Make ativo: cenário 6549955; NÃO editar sem aprovação.
Supabase compartilhado: uobxxgzshrmbtjfdolxd; NÃO aplicar migração sem aprovação.
Produção: main; NO PREVIEW / local-first.
Dashboard operacional atual: https://roleta-tgv.vercel.app/ (raiz index.html; verificar login e URL final em dispositivo).
Painel GitHub de acompanhamento: https://github.com/wagnerjfjunior/Roleta/issues

## Backlog e PRs
- F1 #127 https://github.com/wagnerjfjunior/Roleta/issues/127 — jobs/results Gemini, schema e grants. PR #126.
- F2 #128 https://github.com/wagnerjfjunior/Roleta/issues/128 — APIs autenticadas e testes. PR futura.
- F3 #129 https://github.com/wagnerjfjunior/Roleta/issues/129 — Make persistência Gemini/fallback. Alteração controlada, PR/documentação separada.
- F4 #130 https://github.com/wagnerjfjunior/Roleta/issues/130 — frontend recuperação e reabertura. PR futura.
- F5 #131 https://github.com/wagnerjfjunior/Roleta/issues/131 — homologação, segurança, rollback e entrega. PR release futura.
- F6 #132 https://github.com/wagnerjfjunior/Roleta/issues/132 — OCR.space shadow e dicionário. PR posterior à estabilização.

## Estado real
- Contrato em docs/sfjm/OCR_ASYNC_GATE1_CONTRACT_2026-10-15.md.
- Código puro server/ocr-async-contract.cjs e testes tests/ocr-async-contract.test.cjs, ainda sem execução comprovada.
- Migração RASCUNHO supabase/migrations/20261015_roleta_ocr_intake_gate1_draft.sql, NÃO aplicada. Possui apenas jobs, não results. Não confundir com persistência implementada.
- Nenhum endpoint novo conectado ao Make; nenhum JSON Gemini persistido por este Gate.
- roleta_ocr.learning_jobs, readings, name_evidence e dictionary existentes são de aprendizado pós-conferência; não substituir sua finalidade.

## Ordem de execução
1. F1 consolidar schema e testar em PostgreSQL isolado, com políticas e retenção.
2. F2 endpoints e callback autenticado; validar replay, isolamento e idempotência.
3. F3 Make isolado: callback de JSON bruto persistido antes de concluir; fallback 3.6 mantido.
4. F4 frontend 202/job_id, polling e recuperação após fechar app.
5. F5 E2E >180s, iPhone, produção sob autorização expressa, observabilidade e rollback.
6. F6 OCR.space em via independente.

## Critérios de entrega
- JSON original integral persistido por job_id, com modelo e proveniência.
- Retorno do callback confirma COMMIT real; falha no banco não produz sucesso.
- Usuário autenticado recupera o próprio JSON sem executar novamente Gemini.
- Nenhum acesso cruzado entre operadores; RLS/grants auditados.
- Conferência humana obrigatória; não altera posições nem reordena nomes sem validação.
- Sem duplicar roleta final, nem afetar dados históricos e dashboard.
- Evidências de teste e rollback documentados; aceite humano antes do merge e produção.

## Próxima ação segura
Trabalhar F1/PR #126: separar tabela results de jobs, desenhar escrita de privilégio mínimo, retenção, transições atômicas e testes. Nenhuma alteração no banco compartilhado ou cenário ativo neste passo.
