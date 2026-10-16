# SFJM F1 — Gate de segurança e implantação Gemini — 2026-10-16

## Evidência read-only no Supabase compartilhado
Projeto `uobxxgzshrmbtjfdolxd`: PostgreSQL 17.6, roles `roleta_append_owner`, `roleta_runtime`, `roleta_v2_writer`; schema `roleta_intake` ausente no momento da consulta. Não foi executado DDL no banco.

## Implementado somente na branch da PR #126
- `roleta_intake.jobs` — job UUID, Google sub, SHA256 da foto, estado e timestamps.
- `roleta_intake.results` — JSON original Gemini em `jsonb`, modelo e hash, um resultado por job, imutável por trigger.
- RLS + FORCE RLS, REVOKE de `anon` e `authenticated`, sem grants ao Make ou ao navegador.
- Validação de transições e exigência de resultado persistido antes de READY_FOR_REVIEW.
- Teste SQL `tests/sql/ocr_intake_f1_smoke.sql` com casos positivos/negativos. **Não executado em PostgreSQL descartável.**

## Bloqueadores de aplicação
1. **Ambiente isolado**: aplicar a migração em PostgreSQL descartável 17.x; rodar o teste SQL; testar separadamente os erros esperados e idempotência; registrar logs e comandos. Nunca usar o banco compartilhado para teste destrutivo.
2. **Privilégio mínimo**: decidir identidade técnica do escritor (preferir role dedicada sem BYPASSRLS), funções de acesso `SECURITY DEFINER` com `search_path` fixo, concessões explícitas e auditoria; **não** conceder acesso direto às tabelas a `anon`, `authenticated`, Make ou frontend.
3. **Gravação atômica**: F2 deve executar `INSERT results` + `UPDATE jobs READY_FOR_REVIEW` na mesma transação e retornar sucesso somente após COMMIT. Idempotência por job e hash, replays idênticos OK, divergentes erro.
4. **Retenção**: fixar período de retenção de JSON e imagens e política de limpeza, sem exclusão automática até decisão explícita. `ON DELETE RESTRICT` e trigger de imutabilidade exigem plano específico de expurgo autorizado.
5. **Contrato bruto**: `jsonb` mantém valores, não os bytes, ordem de chaves ou espaços do JSON. Decisão: não duplicar em texto.
6. **Sem upload da fotografia duplicado**: `image_storage_path` é referência opcional; não há bucket criado nesta F1.
7. **Sem alteração no Make ativo** até F2/F3, homologação, rollback e autorização expressa.

## Sequência e estado
- F1 Issue #127, PR #126: **em desenvolvimento; NÃO HOMOLOGADO**.
- F2 Issue #128: APIs, callback autenticado, owner/CSRF, deduplicação e transações.
- F3 Issue #129: Make Gemini 3.8/fallback 3.6; persistir antes de responder.
- F4 Issue #130: recuperação no aplicativo.
- F5 Issue #131: E2E, segurança, produção e rollback.
- F6 Issue #132: OCR.space independente.

## Próxima ação segura
Executar testes no PostgreSQL isolado; se indisponível, não declarar PASS. Preparar desenho e testes de funções de persistência F2 na branch sem ativar banco compartilhado.
