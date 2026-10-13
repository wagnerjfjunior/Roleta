> **SFJM ATUAL — 13/10/2026, fechamento OCR/dicionário:** ler `docs/sfjm/HANDOFF_2026-10-13_OCR_DICTIONARY.md` a partir da raiz. Aprendizado local publicado nas PRs #115/#116; próxima ação é refinar a agregação de grafias entre leituras distintas da mesma folha, sem duplicar suporte nem manter associações comprovadamente erradas. Refinamento e sincronização Supabase ainda não implementados. Conferência humana obrigatória. Os blocos anteriores abaixo são históricos.

> **APRENDIZADO OCR PUBLICADO — 13/10/2026:** PR #115, commit funcional `b2885001`, deployment `dpl_EwyjVC7m6u1f7zrz6r8zmPGUPQbr` READY e sete arquivos de frontend verificados HTTP 200/idênticos. Ler `docs/sfjm/OCR_LEARNING_LOCAL_2026-10-13.md` a partir da raiz. Próxima ação: observar confirmação real e sugestões em duas folhas distintas na mesma conta/navegador. Histórico é local, sem sincronização Supabase; conferência humana obrigatória. O candidato abaixo é histórico.

> **APRENDIZADO OCR — candidato local 13/10/2026:** camada de sugestões após confirmação final, duas folhas distintas sem conflito, replay idempotente e bolinhas ambíguas para preenchimento manual. Histórico por conta no navegador, sem sincronização Supabase. Ler `docs/sfjm/OCR_LEARNING_LOCAL_2026-10-13.md` (a partir da raiz). Branch `feature/ocr-learning-20261013`; envio ao GitHub autorizado para teste Live Sync; merge para main autorizado às 16h41 na PR #115. Próximo passo: concluir checks/merge e verificar produção.

## Revisão sem tabela — confirmação de conclusão corrigida

Os anexos dos módulos 31/32 correspondem à execução de 13:16 e contêm o JSON OCR; `output: null` no Resume 32 não comprova perda do retorno. O módulo Webhook Response 13 recebeu o mesmo envelope e respondeu HTTP 200. Até esta auditoria não apareceu execução posterior no Make. O código atual converte esse envelope em 31 linhas, 28 nomes lidos; o teste isolado da tela Simples também monta essas linhas. O desaparecimento relatado em produção ainda não foi reproduzido no dispositivo do operador.

Falha confirmada na interface: o envio disparava um clique assíncrono para montar a revisão e anunciava conclusão sem aguardar o cadastro e a tabela. Agora aguarda a revisão, exige módulo humano e pelo menos uma linha, e propaga falhas para o aviso de envio. Testes DOM isolados cobrem resposta recebida com cadastro atrasado, sucesso com 31 linhas, cadastro indisponível e módulo humano ausente. Autenticação, Make e parser permanecem sob as regras anteriores. Próxima ação: observar a mensagem concreta da tela do operador se continuar sem tabela; não afirmar que a causa no dispositivo foi resolvida apenas por testes isolados.

## Complemento — OCR com coordenadas só nos cabeçalhos

Na execução `b156fbb40e0143d0a97c0708d80c33d9` (13:16 de São Paulo), o OCR.space retornou apenas oito entradas de overlay, todas no cabeçalho. O texto continha a coluna Corretor com posições explícitas 1–31, seguida pela coluna de bolinhas incompleta e pelas colunas Gerente/Diretor. O parser v3 recupera exclusivamente a coluna de corretores delimitada pelos cabeçalhos, exigindo posições explícitas, únicas e crescentes. Mantém linhas impressas sem nome para revisão e todas as bolinhas vazias; não associa números por sequência. A interface explica a recuperação parcial. Regressão com estrutura real anonimizada adicionada; os testes de geometria anteriores continuam obrigatórios.

## Correção da leitura OCR.space — 13/10/2026

A execução real `2b9a48b0f2fa41f0a1d38ec342f595f6` acionou OCR.space, mas a revisão ficou inutilizável. O cabeçalho Corretor começava sobre a coluna dos índices; o parser comparava o centro do índice com a borda esquerda do cabeçalho e descartava todas as âncoras. O fallback de texto livre criou linhas para gerentes e diretor.

A correção usa coordenadas para separar colunas, mantém a ordem física na revisão e permite linha com bolinha lida e posição ilegível sem completar a sequência. Texto sem estrutura abre uma linha vazia para preenchimento humano, preservando a foto e o texto bruto. Cores claras e rótulos explícitos substituem os estados escuros na tela Simples. Nenhuma linha é aprovada automaticamente.

Validação: geometria real reduzida e anonimizada como regressão, resposta sintética anterior e todas as verificações Node do workflow Gemini. Isso não comprova a exatidão da caligrafia nem substitui uma nova conferência da folha pelo operador. Make não foi alterado nesta correção.

> **OCR.space ATIVO — 13/10/2026:** PR #110 / main funcional `83004c8`, Vercel READY, Make 6549955 ativo com 19 → 27 → 30 OCR → 31 JSON → 32/29 Resume → 13 resposta. 247 testes e LAB de dois erros aprovados. Próxima ação: observar fotografia real e conferência, sem provocar falhas em produção. Ler `sfjm/OCR_SPACE_THIRD_OPTION_2026-10-13.md`; pedidos anteriores de publicar/ativar são históricos.

> **OCR.space terceira opção — 13/10/2026:** implementação/teste isolado aprovados (247 testes); ler `sfjm/OCR_SPACE_THIRD_OPTION_2026-10-13.md`. Publicar backend antes de ativar o novo handler. UX publicada na PR #109; iterações locais anteriores são históricas.

> **FALLBACK TESTADO — 13/10/2026:** LAB 6610742 executou erro provocado no 3.8 → 3.6 → Resume → retorno JSON, sucesso em 16,6 s (execução 4c6f7035f2704f2daa099d88f08a53fc). LAB desativado para liberar vaga; produção segue ativa. Precisão e retorno HTTP no app continuam sujeitos à conferência/observação real. Ler `sfjm/MAKE_GEMINI_MODEL_FALLBACK_AND_OCR_LEARNING_2026-10-12.md`. Proposta de aprendizado OCR ainda não implementada.

> **MAKE FALLBACK — 12/10/2026:** cenário 6549955 ativo com handler 19→27 (3.6)→28 (Resume), após falha do 3.8. Configuração verificada; teste forçado em LAB 6610742 não rodou por limite de cenários ativos. OCR.space segue shadow; aprendizado por pares OCR × revisão humana ainda é proposta. Ler `sfjm/MAKE_GEMINI_MODEL_FALLBACK_AND_OCR_LEARNING_2026-10-12.md` antes de retomar.

> **DATA/NOME OCR — 12/10/2026:** normalização de ano 26 agora compartilhada por OCR e importação canônica; recomposição de grafia próxima no rascunho com candidato único e margem conservadora, preservando texto original e revisão humana. Ler `sfjm/INTAKE_DATE_NAME_NORMALIZATION_2026-10-12.md`. Retorno OCR no telefone da Sabrina confirmado pelo operador; próximo teste: ano abreviado e sobrina, depois gravação real Supabase.

> **RETORNO OCR — 12/10/2026:** execução Make das 19h58 levou 143,8 s até responder, mas relay abortava em 55 s. Prazo ajustado para 175 s, duração Vercel 200 s e cliente 210 s. Ler `sfjm/OCR_RETURN_TIMEOUT_2026-10-12.md`. Próxima validação: retorno no telefone da Sabrina, mantendo a página aberta; depois primeiro salvamento real.

> **FLUXO SIMPLIFICADO — 12/10/2026:** passo 5 removido; gravação Supabase no passo 3 usa a folha já conferida no passo 2, sem nova tabela, nome de arquivo ou motivo manual. Posições originais do OCR preservadas internamente; folha final sem posições originais também pode ser salva, sem inventar posições para modelos físicos. Ler `sfjm/FINAL_SHEET_SINGLE_REVIEW_2026-10-12.md`.

> **TROUBLESHOOTING OCR — 12/10/2026:** compressão local de câmera/galeria implementada com cópia JPEG de até 900.000 bytes e prévia do arquivo enviado; relay impõe o mesmo limite. Ler `sfjm/OCR_PHOTO_PREPARATION_2026-10-12.md`. Próxima validação operacional: foto real no iPhone e retorno Make; depois retomar primeiro salvamento real da folha final Supabase.

> **RELEASE ATIVO — FOLHA FINAL SUPABASE — 12/10/2026:** PR #95 mergeada, main funcional `54031ad`, migration `20261012200806` aplicada, deployment `dpl_5MPQWnouiJwqH7WKVPqvVbTZmmp5` READY e flags finais ativas. Vínculo automático do sub real na primeira sessão Google de uma das duas contas autorizadas, sem cópia manual de IDs. Próxima ação: observar primeiro envio real conferido e painel, sem criar roleta fictícia. Detalhes e limites de evidência em `sfjm/FINAL_ROULETTE_PRODUCTION_RELEASE_2026-10-12.md`. Os estados anteriores abaixo são históricos.

> **HOMOLOGAÇÃO FOLHA FINAL — 12/10/2026:** PR #95, SHA executável `82c87462a84c8f041de7c17b06140e0211025126`; PostgreSQL 17 (run 38301436483) aprovou replay, correções concorrentes, rollback e isolamento. 212 testes locais e 10 arquivos UI aprovados. Pendência observada na Vercel: ACL dos sujeitos Google e flags finais ausentes. Ler `sfjm/FINAL_ROULETTE_IMPLEMENTATION_2026-10-12.md`; não declarar go-live, não repetir migrações F2-12 nem reabrir homologações de OCR/impressão.

> **FOLHA FINAL SUPABASE — IMPLEMENTAÇÃO CANDIDATA 12/10/2026:** ler `sfjm/FINAL_ROULETTE_IMPLEMENTATION_2026-10-12.md`. Backend, UI, ledger SQL adicional e união do dashboard preparados na branch `feature/final-roulette-supabase-20261012`; testes locais aprovados. Próximo passo: ensaio PostgreSQL 17 descartável antes de instalar/ativar. Não repetir Gate A/A.2/B.0 nem habilitar escrita prospectiva.

> **CORREÇÃO CANÔNICA DO RESPONSÁVEL — 12/10/2026:** ler primeiro [OPERATOR_VALIDATED_OCR_SUPABASE_FLOW_2026-10-12.md](sfjm/OPERATOR_VALIDATED_OCR_SUPABASE_FLOW_2026-10-12.md). Conferência pelo próprio corretor; nenhuma segunda pessoa, aprovação independente ou conta GitHub adicional. Destino operacional: Supabase, mediante permissão, separado da impressão. Google: wagnerjfjunior@gmail.com e brendatatianelima@gmail.com. Exigências anteriores de revisor independente estão revogadas; abaixo fica o histórico técnico.

> **Atualização 12/10/2026 — autorização atual e promoção:** ler primeiro `sfjm/GATE_E_RELEASE_PROGRESS_2026-10-12.md`. O responsável autorizou execução/merge/produção. LAB concorrente: PR #1 mergeada; PR #2 rejeitada com STALE_BASE em Actions. Recuperação implementada e testes locais aprovados. Publicação de código com escrita bloqueada não encerra correção versionada, proteção ou E2E. Próxima decisão: operadores, revisor independente e credencial técnica. Conteúdo abaixo preservado como histórico.

> **NEXT SAFE ACTION — 2026-10-11 / SFJM GATE E (ATUAL)**
>
> 1. Resolver `main` ao vivo e ler `.sfjm/project.json`, `handoffs/CURRENT.md` e `docs/sfjm/HANDOFF_2026-10-11_GATE_E.md`. Conferir local SFJM/LVR e worktree antes de editar.
> 2. Auditar Gate E já publicado: `server/statistical-github-stage.cjs`, `api/statistical-submit.js`, `statistical/submission.js`, `roulette-intake.js`. Conferir staging por branch e PR, proof JSON de mapeamento completo, SHA fixado, replay seguro e autenticação.
> 3. Sem nenhuma escrita em Roleta de produção, completar testes de concorrência, reenvio idempotente, duas PRs baseadas em manifesto defasado, branch órfã, conflito por data/período e correção pós-merge versionada em repositório GitHub descartável.
> 4. STOP — solicitar decisão sobre GitHub App versus credencial técnica temporária, Google `sub` autorizados e revisores de PR; depois autorização expressa **separada** para provisionamento e para `ROLETA_STAT_WRITES_ENABLED=true`. F2-12 mantém `ROLETA_V2_WRITES_ENABLED=false`.
>
> **Não reabrir o esclarecimento da linha física:** `docs/ROLETA_PHYSICAL_LINE_DRAWN_BALL_FINAL_ORDER_CANONICAL.md`. **LOCAL-FIRST / NO PREVIEW**; `remoteIterationAllowed=false`; sem mudanças Supabase compartilhado, sem integração automática de PDFs na estatística. Este bloco substitui apenas a orientação atual; os itens abaixo são históricos.
>
---

# CURRENT NEXT SAFE ACTION — 2026-10-10 / F2-11

The following supersedes older next-action and branch references below; older sections remain as historical records.

1. Verify live `main` and CI; read `handoffs/CURRENT.md` and `docs/F2-11_SHARED_SUPABASE_READINESS_20261010.md`.
2. Finish read-only effective-grants inventory in the shared Supabase, including inherited roles, PUBLIC, default ACLs, existing functions, and all non-system schemas.
3. Prepare a **separate**, reviewable production SQL migration (not disposable CI scripts) with explicit minimum privileges, fixed search path, FORCE RLS and non-exposed private schema.
4. Review isolated staging dry-run, negative permissions, backup, monitoring, disable and rollback procedures.
5. STOP for explicit Gate A authorization before any production schema/role DDL. STOP again for separate Gate B authorization before prospective writes or a public endpoint.

No change to the existing Discador database security or historical/frozen ledger is authorized. LOCAL-FIRST / NO PREVIEW remains in force.

---

# Roleta — Next Safe Action

## RLT-M5-01 — Week 05–11/10 Frozen

### Canonical state
- 83 logical canonical events;
- 82 validated complete permutations;
- 79 quality A / 4 quality B;
- 04/10/2026 incorporated as two distinct events: morning + afternoon;
- policy locked before cutoff: `PROSPECTIVE-V1.0.0`;
- model: `period_raw_global_fallback`;
- model version: `RLT-M5-WEEKLY-V1`;
- primary endpoint: 2X = Nº1 OR Último.

### Frozen at 2026-10-04T20:04:19-03:00
Generated from the 83-event canonical result ledger with `data_cutoff=04-10-T`:
- 48 `WEEKLY_FROZEN` recommendations — immutable;
- 48 initial `CURRENT` recommendations — DRAFT/revisable until each target event freeze;
- 48 `RANDOM_SHADOW` deterministic chains — frozen.

Initial period allocations, in family order Wagner / Laura / Brenda / Helena:
- morning: `14 / 3 / 5 / 4`;
- afternoon: `22 / 18 / 16 / 20`;
- integral: `21 / 4 / 8 / 12`.

### Current invariants
- WEEKLY_FROZEN never changes;
- CURRENT recalculates after every newly incorporated real roulette for all unresolved future events;
- CURRENT is frozen only before the operational choice for its target event;
- RANDOM_SHADOW chain is frozen before outcomes;
- recommendation != execution != outcome;
- no hindsight credit;
- no model shopping after cutoff;
- 3X/4X remain exploratory;
- the system may conclude COMPATÍVEL COM ACASO.

### Next safe action
1. Validate the RLT-M5-01 Overview locally via SFJM/LVR.
2. Confirm the weekly panel labels WEEKLY_FROZEN as **Oficial**.
3. Confirm CURRENT is shown only as **Diagnóstico** and never as an automatic replacement for the official number.
4. Confirm the status mark on each row adjudicates the official WEEKLY_FROZEN recommendation.
5. Confirm the weekly frozen numbers still come unchanged from `data/prospective/recommendations.jsonl`.
6. Confirm scorecard remains `AMOSTRA_INICIAL` until real target events are adjudicated.
7. On the next real roulette:
   - transcribe/ingest using the established canonical workflow;
   - adjudicate WEEKLY_FROZEN as the official recommendation;
   - retain CURRENT as a separately scored diagnostic track;
   - record EXECUTED_CHOICE independently;
   - never rewrite prior recommendations.
8. Backfill missing nominal full-sheet coverage for 02/10 and 03/10 as a data-quality follow-up; this does not alter the already frozen V1 week.

### SFJM
- branch: `feat/rlt-m4-01-simulation-lab-v1-20261004`;
- PR #3 remains Draft;
- LOCAL-FIRST / LVR;
- preferred port 8082;
- NO PREVIEW;
- NO REMOTE ITERATION;
- no merge without explicit approval;
- no production without explicit approval.


## RLT-M4-07 — Weekly Frozen vs Current

Implemented on the active branch without changing the frozen real-week policy.

### Next simulation gate
Run the first paired control:
- weeks: 10,000;
- scenario: NULL;
- signal strength: 0;
- seed: `weekly-duel-2026`.

First NULL v1 observation:
- Weekly O/E 0.993;
- Current O/E 0.996;
- Random O/E 1.004;
- NULL behavior passed, but valid-opportunity counts differed, so raw hit delta was not a fair strategy-quality comparison.

RLT-M4-07-v2 gate:
- rerun 10,000 weeks / NULL / same seed after paired-valid correction;
- operational block may show different valid-opportunity counts;
- paired-valid Weekly and Current must have exactly the same opportunity count and theoretical expected total;
- paired-valid Δ O/E must remain approximately 0;
- paired-valid Δ excess must remain approximately 0;
- Current must not show persistent artificial advantage merely because it recalculates after each event;
- churn may be non-zero, but helpful and harmful revisions should balance under NULL.

If NULL passes, run in order:
1. Stable period signal · 3%;
2. Regime shift · 3%;
3. Weak signal + noise · 1%.

Do not change `PROSPECTIVE-V1.0.0` or the already frozen real week based on these simulations. RLT-M4-07 evaluates the update mechanism only.


### 50,000-week paired-valid evidence

Accepted:
- NULL / 50,000 weeks / seed weekly-duel-2026:
  - Weekly paired-valid O/E 0.99906;
  - Current paired-valid O/E 0.99740;
  - mean Δ O/E -0.00191;
  - mean Δ hits/week -0.00746;
  - verdict: NULL PASS; no artificial Current advantage.
- Stable period / 3% / 50,000 weeks:
  - Weekly paired-valid O/E 1.04710;
  - Current paired-valid O/E 1.04653;
  - mean Δ O/E -0.00054;
  - verdict: both capture stable signal similarly; recalculation adds no material value in this scenario.

Rejected / rerun required:
- regime_shift export: test metadata says regime_shift but result payload says stable_period; invalid audit pair and must be rerun after export-binding fix.
- weak_noise was run at 3%; canonical planned gate remains 1%.

Audit fixes added:
- explicit zero signal strength is preserved;
- export disabled while a run is active;
- result scenario/strength must match the initiating test definition before save/export.

Final RLT-M4-07-v2 gate:
- regime_shift · 3% · 50,000 weeks: Weekly paired-valid O/E 1.061997 vs Current 1.057276; mean Δ O/E -0.004720.
- weak_noise · 1% · 50,000 weeks: Weekly paired-valid O/E 1.017500 vs Current 1.013143; mean Δ O/E -0.004238.

Decision: RLT-M4-07-v2 is CLOSED for the V1 operational question. WEEKLY_FROZEN is the official recommendation; CURRENT remains diagnostic only.


---

## RLT-PRINT-V2 — CLOSED

PR #19 was approved and merged to `main`.

Functional merge SHA:
`83dd22f264bfbe45a2049d4f4f73dd74e9ca559e`

Post-merge handoff/documentation commit:
`f526a86ef6a399b0991131ad6b355ef9e25e34d6`

Canonical specification:
`docs/PRINT_TEMPLATE_V2.md`

Implementation history:
`docs/RLT_PRINT_V2_CHANGELOG_2026-10-07.md`

Do not reopen the former direct JSON -> print workflow. Human review remains mandatory.

## NEXT SAFE ACTION — nominal backfill

Resume nominal-history reconstruction in strict chronological order, one roulette at a time.

First target:
- date: 21/07/2025;
- period: morning;
- event id: `21-07-M`;
- source reference: `IMG_1630.jpeg`;
- N=10.

Operational procedure:
1. use existing canonical/structural information first;
2. inspect the original sheet/photo when available;
3. ask the user only for unresolved names/numbers/positions, never for full re-entry when existing data are sufficient;
4. never infer illegible identities;
5. resolve identities against `data/brokers-official.csv`;
6. write only human-confirmed/reproducible nominal rows into the auditable ledger;
7. keep ambiguous identities quarantined;
8. advance to the next missing event only after the current event is reconciled.

Purpose:
increase auditable nominal coverage and statistical sample size without contaminating broker-level statistics with inferred identities.
