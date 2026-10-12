# SFJM — Roleta Intelligence V3 — Dossiê de transição Gate E

**Data de corte:** 12/10/2026 (America/Sao_Paulo)  
**Status:** HOMOLOGAÇÃO EM CURSO — **NO-GO para gravação estatística em produção**  
**Repositório:** `wagnerjfjunior/Roleta`  
**Branch de trabalho:** `test/gate-e-negative-20261012`  
**PR de homologação:** [#92](https://github.com/wagnerjfjunior/Roleta/pull/92) — **OPEN / DRAFT / NÃO MERGEAR**  
**HEAD validado antes deste documento:** `6182f61956a4c455ec5d01045c6c979fc18ccf48`  
**Base de comparação:** `0d95d16ac5f46da3108e597b0b093ce7671b8e49`

> Este dossiê registra resultados confirmados, limitações, decisões e plano restante. **Não** substitui testes operacionais, autorizações de merge ou verificação de flags de runtime. Um commit apenas documental pode gerar novos runs; ao reler este documento, validar o SHA atual da PR e o respectivo Actions.

## 1. Contrato e invariantes canônicos

- A folha pré-sorteio possui **posições físicas** (linhas numeradas). O número da linha **não** representa necessariamente a ordem final de atendimento.
- Cada corretor recebe uma **bolinha sorteada**. A posição física de um corretor e o número obtido no sorteio são entidades distintas.
- A **ordem efetiva de atendimento** é determinada pelos números sorteados entre as posições físicas efetivamente ocupadas: a bolinha 1 corresponde ao primeiro atendimento, embora possa ter sido tirada pelo corretor originalmente localizado em outra linha física.
- Exemplo: Wagner é o primeiro nome da folha física e tira a bolinha 10; passa a ser o décimo na ordem final. A pessoa da décima linha física que tirou bolinha 1 passa a ser a primeira no atendimento.
- O mesmo modelo vale para posições especiais (1, 2, penúltimo/cortesia, último), apuradas a partir da correspondência física ↔ bolinha e da ordem efetiva.
- A conferência/validação humana é **obrigatória** antes da aceitação. OCR, GPT e automação são fontes de entrada, não árbitros exclusivos.
- Imprimir, reimprimir ou salvar PDF **não deve persistir** evento estatístico. Gravação é uma operação separada e explícita.
- Manter fallback de JSON copiável gerado pelo GPT, sem retirar o fluxo manual validado.
- Histórico canônico conhecido ao início desta etapa: **86 eventos (82 qualidade A, 4 B)**. É um baseline histórico, **não** leitura nova do dataset em runtime; não editar ou reprocessar histórico sem procedimento autorizado.
- Manter contrato de impressão RLT-PRINT-V2 e UX existente; não misturar mudanças do Gate E com mudanças estéticas.

## 2. Governança e limites SFJM

`LOCAL-FIRST / NO PREVIEW / remoteIterationAllowed: false`.

- **Proibido sem autorização explícita específica:** merge na `main` oficial, deploy, alteração de configurações de produção, habilitação de `ROLETA_STAT_WRITES_ENABLED` ou `ROLETA_V2_WRITES_ENABLED`, mudança do histórico, Supabase, apagamento de commits ou provas.
- Não compartilhar tokens/segredos em logs ou relatórios.
- Qualquer PR GitHub real do Roleta: revisão das mudanças, execução de checks no SHA vigente, e decisão consciente sobre merge.
- Correções estatísticas pós-publicação devem preservar a trilha histórica e permitir auditoria; rollback de aplicativo não é rollback destrutivo de registros persistidos.
- **Fato não verificado:** valor runtime atual das flags de produção Vercel. Não afirmar OFF como estado observado; tratá-las como **não autorizadas para ativação** até inspeção.

## 3. Linha do tempo e artefatos implementados

### 3.1. Bateria B e preflight local

Branch `test/gate-e-negative-20261012` introduziu validadores e testes:

- `scripts/gate-e/check-stale-base.cjs`: contrato de ancestralidade e base desatualizada.
- `scripts/gate-e/validate-intake-pr.cjs`: validação de CSV único, proof, manifesto, SHA de payload, posições físicas e sorteadas, integridade de fontes e unicidade de evento.
- `scripts/gate-e/ci-policy.cjs`: diferencia PR estatística `stat-intake/AAAA-MM-DD-[MTI]` de PR comum, com lista estrita de caminhos permitidos.
- `scripts/gate-e/review-state.cjs`: diagnóstico de revisão.
- `scripts/gate-e/recovery-plan.cjs`: diagnóstico **somente leitura** de recuperação (não abre PR e não altera Git).
- `scripts/gate-e/correction-contract.cjs`: preflight/contrato de correção; retorna `writesPermitted:false` (não implementa ledger operacional).
- `scripts/gate-e/integration-local.cjs`: integração Git isolada.
- `.github/workflows/gate-e-intake-integrity.yml`: candidato CI com `pull_request`, check `Gate E intake manifest and proof`, `contents:read`, `persist-credentials:false`. Evento `merge_group` **falha fechado**; não ativar merge queue sem suporte.
- Testes de regressão correspondentes em `tests/regression/`.

Comandos/provas conhecidos: **188/188 testes locais PASS**, **3/3 integração Git isolada PASS**. O superpacote posterior resultou em **27 PASS / 2 FAIL / 6 PENDING**. Os 2 FAIL eram de **governança** (Gate E não obrigatório; revisão independente 0), e não falhas nos testes de código. Os 6 PENDING incluíam proteção no laboratório privado, equivalência de validador, concorrência real pós-merge, recuperação operacional, correção operacional, flags Vercel.

Documentos preexistentes:
- `docs/sfjm/GATE_E_BATTERY_B_LOCAL_2026-10-12.md`
- `docs/sfjm/GATE_E_B2_REVIEW_STATE_2026-10-12.md`
- `docs/sfjm/GATE_E_CI_CANDIDATE_2026-10-12.md`
- `docs/sfjm/GATE_E_CI_HARDENING_2026-10-12.md`
- `docs/sfjm/GATE_E_C_LOCAL_GIT_PREFLIGHT_2026-10-12.md`
- `docs/sfjm/GATE_E_CYCLE1_RECOVERY_CORRECTION_2026-10-12.md`

### 3.2. Bateria C — laboratório GitHub

Repo privado descartável: [wagnerjfjunior/roleta-gate-e-lab](https://github.com/wagnerjfjunior/roleta-gate-e-lab).

- [PR #1](https://github.com/wagnerjfjunior/roleta-gate-e-lab/pull/1): evento fictício `2099-01-01-M`, workflow `Gate E Lab PR Validation` **PASS**; branch `stat-intake/2099-01-01-M`.
- [PR #2](https://github.com/wagnerjfjunior/roleta-gate-e-lab/pull/2): evento fictício `2099-01-02-M`, mesmo workflow **PASS**; branch `stat-intake/2099-01-02-M`.
- Ambas nasceram do mesmo SHA de base `926b448907f8e210fe8397c194179bf082a3ba7e`.
- **Estado reconsultado em 12/10/2026:** ambas **OPEN / DRAFT / NÃO MERGED**. Portanto, o teste **pós-merge STALE_BASE ainda não está comprovado**.
- O laboratório executa `scripts/validate-lab.cjs`, um validador próprio e simplificado, **não** a cadeia completa de `scripts/gate-e/validate-intake-pr.cjs` no Roleta oficial.
- Endpoint de rulesets do laboratório privado retornou HTTP 403 com aviso de requisito de plano GitHub Pro ou repositório público. **Não** tornar público automaticamente.
- Pacote criado para concluir o cenário: `roleta-gate-e-etapa1-lab.sh`; prevê merge da PR #1 **somente no laboratório**, reabertura da PR #2 com mesmo SHA, nova execução Actions e prova de rejeição `STALE_BASE`. **A existência do script não comprova sua execução.** Registrar URL/run/log antes de marcar PASS.

### 3.3. PR oficial #92 e correções CI

PR [#92](https://github.com/wagnerjfjunior/Roleta/pull/92) aberta como DRAFT contra `main`, sem tocar `data/` e sem merge.

- `01fea77`: teste Git isolado (precedido por commits Bateria B/CI).
- `30378e5`: introduz fronteira de confiança — após bootstrap, executa validador extraído do commit da branch-base protegida, não do código modificável da própria PR; teste adicional `gate-e-trusted-ci.test.cjs`. Regresso local **190/190 PASS**.
- Workflow CI inicialmente falhou no commit `30378e5` por variáveis não definidas: `BASE_SHA: unbound variable`.
- `6182f61`: vincula `BASE_SHA="$GATE_E_BASE_SHA"` e `HEAD_SHA="$GATE_E_HEAD_SHA"`. Local **190/190 PASS**.
- No SHA `6182f61956a4c455ec5d01045c6c979fc18ccf48`, foram consultadas **6 execuções GitHub Actions, todas `completed/success`**: `Roleta regression guardrails`, `Gate E intake integrity`, `Roleta audit regression`, `Gemini intake safety`, `F2-11 disposable PostgreSQL security`, `F2-12 Gate A storage PostgreSQL 17 rehearsal`.
- **Ressalva crítica:** aprovação do workflow de bootstrap **não** significa que toda PR estatística futura já foi testada com a versão protegida dos validadores. Para a primeira integração, a base `main` ainda não tinha `ci-policy.cjs`, e bootstrap autoriza exclusivamente PR sem alteração em `data/`. Após instalação e proteção, executar teste real de submissão normal/inválida com a base já protegida.
- A documentação deste dossiê alterará o HEAD da PR e poderá disparar novamente os checks; verificar novamente os novos runs.

## 4. Matriz de conclusão do programa Gate E

| Etapa | Resultado comprovado | Bloqueio para encerramento |
| --- | --- | --- |
| **1 — Concorrência real** | Duas PRs no LAB, base comum, checks pré-merge PASS; Git local detecta stale base | Comprovar PR #1 merged LAB, nova execução da #2 **FAIL STALE_BASE**, PR #2 sem merge, evidências do run; homologar também validador completo quando implantado |
| **2 — Recuperação e correções versionadas** | Contratos e diagnósticos locais; casos de regressão de contrato | Implementar API/fluxo de recuperação com verificação de ref/PR/prova/manifesto, idempotência, persistência de correção versionada e trilha humana; testar Git real isolado |
| **3 — Governança e proteção main** | Ruleset `Roleta - Proteção MAIN` ativo, strict checks true; Gate E Actions demonstrou PASS em PR #92 | Tornar Gate E check obrigatório **após instalação confiável**, revisão independente >=1, exigir atualização e proteger contra bypass/alteração de código de validação |
| **4 — E2E e go-live** | Regressão local 190/190; checks oficiais 6/6 no SHA de referência | E2E foto/PDF→OCR/JSON→reconciliação→humano→impressão sem escrita→gravação explícita→PR→merge aprovado→manifesto→dashboard; verificar Vercel/flags, rollback, smoke, GO/NO-GO |

A Etapa 1 é pré-requisito da Etapa 2; a Etapa 2 e a Etapa 3 devem estar encerradas antes da Etapa 4. Nenhuma destas quatro etapas está documentalmente homologada como encerrada em 12/10/2026.

## 5. Ruleset e pontos críticos de segurança

Consulta ao ruleset oficial ID **24843983** em 12/10/2026:
- `enforcement: active`.
- `strict_required_status_checks_policy: true`.
- Checks obrigatórios atualmente: **`audit-regression`** e **`canonical ledger and simulation invariants`**.
- **`Gate E intake manifest and proof` NÃO obrigatório**.
- `required_approving_review_count: 0`; sem revisão independente mandatória.
- Política de revisões obsoletas, última aprovação e threads: não habilitadas na consulta original.
- Proteger primeiro a cadeia real de CI e sua identidade de check; nunca exigir um check que não dispara para PRs comuns (deadlock).
- Testar negativa real para PR alterando arquivos protegidos fora de `stat-intake/`, manifesto stale, mutação de histórico, proof inválida, PR substituindo script de validação e PR sem aprovação.

**Advertência sobre confiança:** usar scripts da branch-base é uma defesa parcial; verificar explicitamente a fronteira entre checkout do PR, `git archive` da base, dependências relativas, ambiente, merge-group e ausência de mutação por scripts controláveis pelo proponente. Não inferir segurança completa somente de testes de string ou run PASS.

## 6. Plano de retomada SFJM — próximo passo seguro

1. **Etapa 1:** executar/confirmar Bateria C pós-merge no laboratório e anexar a saída `RELATORIO.md`, logs de `STALE_BASE` e IDs/URLs dos novos runs. Se o merge PR #1 já tiver ocorrido, não repetir o script cegamente.
2. **Etapa 2:** nova conversa com contrato operacional, auditoria real dos módulos `server/statistical-github-stage.cjs`, `statistical/submission.js`, `domain/canonical-dataset.js`, implementação mínima em branch local, superpacote consolidado e documentação SFJM. Sem alterar os 86 eventos.
3. **Etapa 3:** após a Etapa 2, homologar o validador completo, política de segurança e revisão independente; obter autorização separada antes de modificar ruleset, fazer merge na `main` ou ativar merge queue.
4. **Etapa 4:** homologação E2E e conferência de Vercel; plano de deploy/rollback e autorização específica para cada passo de produção.
5. Em todas as etapas, preservar PR #92 como referência e verificar se há outras alterações concorrentes na `main` antes de qualquer atualização.

## 7. Handoff / prompt mínimo para nova conversa

> Ative SFJM no projeto Roleta, leia `docs/sfjm/GATE_E_MASTER_HANDOFF_2026-10-12.md` na branch `test/gate-e-negative-20261012`, confira estado atual da PR #92, ruleset 24843983 e LAB PRs #1/#2. Siga exclusivamente a próxima etapa ainda não homologada, respeitando LOCAL-FIRST / NO PREVIEW, sem merge ou deploy ou habilitação de gravações. Distinga PASS confirmado, PENDING e NÃO TESTADO e atualize a documentação SFJM com evidências reais.

## 8. Decisão de release

**NO-GO para gravação estatística em produção.** Motivos mínimos: concorrência pós-merge não comprovada, recuperação e correção operacionais não implementadas/homologadas, Gate E não obrigatório na `main`, revisão independente não exigida e verificação de runtime Vercel/rollback pendente.

**Definição dos estados:** `HOMOLOGADO` = testes/evidências do escopo; `APTO PARA PRODUÇÃO` = todos bloqueadores P0 encerrados e aprovação GO; `DEPLOY REALIZADO` = versão efetivamente implantada e smoke verificado; `GRAVAÇÃO ATIVADA` = flags/runtime explicitamente autorizados e validados. São estados distintos.

---
_Documento de trilha SFJM gerado para preservação do conhecimento, não como autorização operacional._
