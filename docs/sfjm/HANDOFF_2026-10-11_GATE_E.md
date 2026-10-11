# SFJM / Roleta — Checkpoint canônico e transferência de conversa

**Registro:** 2026-10-11 · **Projeto:** Roleta Intelligence V3 · **Repositório:** `wagnerjfjunior/Roleta`.  
**Base verificada antes deste checkpoint:** `main@676d0f9e300404c6d1434b61dbf7c5b61d23cb31` (Vercel production deployment READY). **Sempre resolver o HEAD vivo novamente** ao retomar: SHAs registrados são âncoras, não ponteiros eternos.

## 1. SFJM / LVR e hierarquia de autoridade

- Manifesto obrigatório: `.sfjm/project.json`. Verificado em 11/10: `project=Roleta`, `repository.fullName=wagnerjfjunior/Roleta`, branch `main`, porta local `8082`, rota `/`, runtime `auto`.
- Política: `LOCAL-FIRST / REMOTE-ON-PROMOTION`; `remoteIterationAllowed=false`; `pushRequiresExplicitIntent=true`; `deployRequiresExplicitIntent=true`; **NO PREVIEW**.
- Na próxima sessão: ler primeiro `.sfjm/project.json`, `handoffs/CURRENT.md`, `docs/NEXT_SAFE_ACTION.md` e este checkpoint. Verificar branch local, worktree e estado do SFJM compartilhado antes de modificar qualquer arquivo. **Esta documentação foi atualizada pelo conector GitHub; NÃO constitui execução do launcher local SFJM nem prova de teste no Mac/Windows.**
- Não usar Vercel Preview para iterar, ZIPs de testes, branches aleatórias nem aplicações paralelas. Para simulações, usar o Simulation Lab existente; para aprovação operacional, usar o fluxo `RLT-PRINT-V2`.
- Não efetuar alteração de schema Supabase, permissões Discador, escrita prospectiva, merge ou deploy operacional sem cumprir gates específicos e autorização cabível.

## 2. Estado real de produção e dados (verificação pontual)

- Vercel produção `roleta-tgv.vercel.app`: deployment do commit `676d0f9e300404c6d1434b61dbf7c5b61d23cb31` estava `READY` na inspeção de 11/10. Versão anterior Gate E: PR #89, merge `a8ad0919ae155455c258bf6e62e579207fb3a93f`. O commit posterior `676d0f9` inclui reforço do staging GitHub e da evidência `data/intake-proofs` conforme arquivo presente em `main`; revalidar o diff exato antes de novas alterações.
- Vercel env Gate E: `ROLETA_STAT_WRITES_ENABLED` **ausente**, `ROLETA_STAT_GITHUB_TOKEN` **ausente**, `ROLETA_STAT_ALLOWED_SUBS` **ausente**. Consequência: `POST /api/statistical-submit` responde indisponibilidade, **nenhuma PR real de estatística pode ser criada**.
- F2-12 independente: `ROLETA_V2_WRITES_ENABLED=false`, sem liberação prospectiva. A conexão de leitura/restrição anteriormente validada (`CONNECTED_RESTRICTED`) não equivale a homologar escrita fim-a-fim. Não modificar Gate B por consequência do Gate E.
- `data/manifest.json`: `logical_dataset_version=2026-10-06-86`, **86 eventos**, **82 qualidade A**, **4 B** e **8 fontes**. `docs/sfjm/CURRENT_DATA_STATE.json` coincide quanto à base, e registra **51 eventos nominais / 1093 linhas**, **144 recomendações** (48 WEEKLY_FROZEN, 48 CURRENT, 48 RANDOM_SHADOW), 0 execuções, 12 adjudicações. São **fotografias de estado versionadas**, não contagem automática ao vivo.
- Nenhuma importação real, PR de dados de evento ou modificação da base foi feita neste checkpoint.

## 3. Semântica operacional obrigatória

Documento autoritativo: `docs/ROLETA_PHYSICAL_LINE_DRAWN_BALL_FINAL_ORDER_CANONICAL.md`.

Três dimensões distintas: **posição física da linha pré-sorteio** (pode conter lacunas), **bolinha sorteada** e **ordem final de atendimento**. Exemplo obrigatório: Wagner linha física 1 → bolinha 10 → décimo a atender; outro corretor linha física 10 → bolinha 1 → primeiro a atender. Quem **recebe a bolinha 1**, e não quem assinou na primeira linha, assume a tarefa de passar a limpo, imprimir, levar à recepção, fotografar e divulgar.

A lista recebe inscritos até **08:45:59** ou **13:45:59**; após o fechamento a folha passa ao responsável pelo sorteio, e pode ficar inacessível até a noite. NÃO exigir snapshot de presença antes do sorteio. Registro posterior (no mesmo dia, em D+1 ou depois) guarda a **data original do evento** distinta da data de importação. Importação estatística não ocorre por imprimir, salvar PDF, compartilhar, reimprimir ou copiar JSON. Diferenciar SALÃO, STAND-BY e ON-LINE; somente SALÃO participa de N/permutação.

### Fluxos separados

1. **Operação pós-sorteio / Roleta Simples**: JSON/OCR → validação humana no app → folha final → PDF/impressão → recepção → foto/WhatsApp; independente de persistência histórica.
2. **Ingestão histórica / Gate E**: após a folha estar disponível → preencher e conferir as linhas físicas reais de cada corretor na etapa independente → submeter PR de revisão → auditoria/CI/merge posteriores; só então `data/manifest.json` incorpora o evento à amostragem.
3. **Prospectivo / F2-12**: recomendação ANTES do resultado; jamais transformar retrospectivamente uma folha recebida à noite em evidência pré-sorteio. `WEEKLY_FROZEN` oficial e imutável; `CURRENT` diagnóstico. A exigência antiga de roster pré-sorteio do Gate C é premissa operacional revogada; o endpoint permanece *fail-closed* até redesenho explícito da elegibilidade hipotética.

## 4. Entregas integradas relevantes — não refazer sem necessidade

| Marco | PR e referência | Resultado |
| --- | --- | --- |
| Segurança F2-12 Gate B | #84 | SQL allowlist exato, testes negativos auth/ACL/CSRF/horário, PostgreSQL descartável; escrita desabilitada |
| Gate C | #85 | bloqueio de previsão sem prova física independente; posteriormente identificada incompatibilidade dessa exigência com lista física pré-sorteio e documentado limite |
| Regra física × bolinha | #86 | contrato e correção da premissa de roster antecipado |
| Simulation Lab | #87 | teste Wagner linha 1/bolinha 10 e linha 10/bolinha 1; lacunas físicas; 125/125 na suíte daquela PR |
| Integridade estatística Gate D | #88, merge `2f6511b` | manifesto verificado, replay idêntico idempotente, divergência de ID rejeitada; 131/131 naquela PR |
| Fluxo estatístico Gate E | #89, merge `a8ad0919` | UI de conferência física, autenticação Google+CSRF e controle de sub, estágio GitHub em branch+PR, 138/138 naquela PR, 5 workflows verdes |
| Hardening posterior Gate E | `main@676d0f9` | código de staging atual inclui pinning da leitura no SHA da main, proof JSON com mapa completo, e replay somente de PR aberta idêntica e mesmo operador. Consultar arquivo e testes atuais; não presumir que #89 é a versão final |

Nomes-chave do código: `roulette-intake.js`, `statistical/submission.js`, `api/statistical-submit.js`, `server/statistical-github-stage.cjs`, `domain/canonical-dataset.js`, `data/manifest.json`, `data/print-brokers.json`, `simulation/engine.js`, `api/prospective-v2-append.js`.

## 5. Gate E — arquitetura e garantias reais

- `ROLETA_STAT_WRITES_ENABLED` requer valor exato `true`; `ROLETA_STAT_GITHUB_TOKEN` é credencial **somente de servidor**, ainda NÃO provisionada; `ROLETA_STAT_ALLOWED_SUBS` é lista explícita de `sub` Google autorizado e também não provisionada. O sistema não deve inferir identidade por e-mail.
- O endpoint não grava no Supabase nem move a branch `main`. O estágio cria branch `stat-intake/YYYY-MM-DD-{M,T,I}`, commit com CSV `data/incoming/`, manifesto atualizado e prova detalhada JSON `data/intake-proofs/`, e uma PR em aberto. A resposta `202 pending_review` **não é uma gravação na amostragem**.
- Staging atual verifica possível branch anterior e autor/sha de payload para retornar replay de PR idêntica ainda aberta; divergência ou branch órfã exige reconciliação manual. Não fazer auto-merge.
- **Importante:** a fonte/filename digitada é metadado. **Os bytes da foto original NÃO são preservados nesse fluxo**. Não anunciar auditoria da imagem como pronta.
- O teste atual usa transport de GitHub mockado, **não** comprovou ponta a ponta com GitHub API em repositório descartável nem resolução de concorrência entre duas PRs distintas após alteração da `main`.
- Correção de evento já publicado, substituição versionada, cadeia de motivos, retenção de provas e rollback de dados continuam **pendentes**. Gate E deve continuar bloqueado até cobrir risco e credenciais.

## 6. Pontos de atenção e próximos testes (sequência recomendada)

**FASE E-READINESS / SEM ESCRITA REAL:**

1. Verificar `main` e 5 workflows do commit corrente, examinar a evolução do commit `676d0f9` e reconciliar `handoffs/CURRENT.md` / `docs/NEXT_SAFE_ACTION.md` com este documento. Inspecionar worktree local e launcher SFJM quando disponível.
2. Fazer threat model do `server/statistical-github-stage.cjs` atual: classe de falha entre branch e PR; dois envios simultâneos; duas PRs concorrentes de eventos diferentes alterando manifesto; replay idêntico; branch órfã; payload falso; CSRF/Origin; identidade `sub`; minimização de exposição de nomes/CRECIs e hash pseudonimizado.
3. Executar testes negativos no CI e **integração GitHub real apenas em repositório/laboratório isolado** com credencial temporária escopada ao laboratório; nenhuma escrita no repositório Roleta de produção para teste.
4. Projetar e testar processo versionado de **correção pós-merge** que preserve evento anterior, motivos e revisão humana; sem edit silencioso no manifest.
5. Documentar rotina de expiração/rotação da credencial técnica e restrições de branch protection obrigatória; quem revisa PR não deve ser o único validador.
6. Somente quando o laboratório estiver aprovado, levar ao responsável o **PONTO DE DECISÃO**: método de autenticação GitHub (preferência técnica: GitHub App com token curto e autorização por repositório), identidades Google `sub` autorizadas e quem aprovará as PRs; depois pedir autorização explícita separada para provisionar ambiente e habilitar `ROLETA_STAT_WRITES_ENABLED=true`. Não confundir com Gate B/F2-12.

### Gates e proibições

- No current state: **STAT WRITES = OFF; PROSPECTIVE WRITES = OFF.**
- No prod SQL/DDL, sem tocar Discador, sem PAT ou segredo em documentação, sem autorização automática para GitHub, sem merge automático de dados.
- Não confundir fluxo de imagem/OCR com prova física: a leitura é hipótese até validação humana; foto pode ser acessada apenas depois do sorteio.
- Não atualizar contagens `86/82/4` sem commit real da fonte de dados, e não criar novos eventos históricos como parte de testes.

## 7. Bootstrap EXATO para próxima conversa

> Ative o SFJM do projeto Roleta. Resolva o HEAD atual da `main` no GitHub `wagnerjfjunior/Roleta` e confira o manifesto `.sfjm/project.json`, `handoffs/CURRENT.md`, `docs/NEXT_SAFE_ACTION.md` e `docs/sfjm/HANDOFF_2026-10-11_GATE_E.md`. Execute apenas a próxima ação segura: auditoria e testes Gate E de persistência estatística, incluindo concorrência, retentativas, prova integral, correção versionada e integração GitHub em laboratório isolado. Não ativar `ROLETA_STAT_WRITES_ENABLED` nem `ROLETA_V2_WRITES_ENABLED`, não alterar a base histórica nem tocar o Supabase compartilhado. Respeite `LOCAL-FIRST / NO PREVIEW`, `remoteIterationAllowed=false` e gate de autorização para promoção. Pare no ponto de decisão da identidade técnica GitHub/operadores e autorização de escrita. Não peça novamente a definição de linha física × bolinha: ela está fechada no documento canônico.

## 8. Continuidade e fontes de verdade

- Handoff principal: `handoffs/CURRENT.md` (checkpoint no topo).
- Ação segura principal: `docs/NEXT_SAFE_ACTION.md` (checkpoint no topo).
- Este relatório completo: `docs/sfjm/HANDOFF_2026-10-11_GATE_E.md`.
- Estado dos dados: `data/manifest.json`, `docs/sfjm/CURRENT_DATA_STATE.json`.
- Regras: `docs/ROLETA_PHYSICAL_LINE_DRAWN_BALL_FINAL_ORDER_CANONICAL.md`, `docs/PRINT_TEMPLATE_V2.md`.
- Gate E: `docs/RLT_GATE_E_STATISTICAL_SUBMISSION_2026-10-11.md`; Gate D: `docs/RLT_GATE_D_STATISTICAL_INTAKE_AUDIT_2026-10-11.md`.
- Projeto e SFJM: `.sfjm/project.json`; políticas de validação e promoção acima.

**Não considerar esta atualização documental homologação da funcionalidade de escrita, nem afirmar que testes locais SFJM foram executados por este agente.**
