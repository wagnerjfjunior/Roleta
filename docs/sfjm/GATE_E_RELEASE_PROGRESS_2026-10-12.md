# SFJM — Gate E: promoção e ponto de decisão — 12/10/2026

## Autoridade atual

O responsável autorizou nesta conversa execução, correções, merge e produção, com parada apenas em decisão relevante. Essa autorização substitui os pedidos de autorização repetidos dos handoffs anteriores. Não fornece, por si, identidades Google, credencial técnica ou um revisor independente. LOCAL-FIRST / NO PREVIEW permanece; nenhum Supabase, histórico, contrato RLT-PRINT-V2 ou flag prospectiva foi alterado.

Referência anterior: `GATE_E_MASTER_HANDOFF_2026-10-12.md`, PR #92, HEAD documental d4256e0. Main observada antes desta promoção: 0d95d16ac5f46da3108e597b0b093ce7671b8e49.

## Etapa 1 — evidência GitHub real

- LAB PR #1: merge confirmado, commit `6594487070cb933a2f78cc390337a83fcb694bd3`.
- LAB PR #2: SHA original `5f9c925e129348b6543822ec2893396afa8b1536`, não mergeada.
- [Run 38276201269](https://github.com/wagnerjfjunior/roleta-gate-e-lab/actions/runs/38276201269), job 114902161688. Log do novo run contém linha executada `STALE_BASE` e saída 1. SHA da PR preservado.
- O conflito de manifesto impede o evento `pull_request` comum de executar. Foi instalado no LAB um workflow `pull_request_target`, contents:read, que só verifica ancestralidade a partir do checkout da base e nunca executa código candidato.
- Run anterior 38276038306 falhou por fetch sem credencial em repo privado. Não é evidência de STALE_BASE. Corrigido usando refs recém-obtidos pelo checkout (sem persistir credencial); apenas o run posterior comprova a negativa.
- **HOMOLOGADO:** rejeição real da base defasada no LAB. **PENDENTE:** cadeia completa do validador oficial em submissão GitHub real após instalação na base protegida. O validador original do LAB é simplificado.

## Correções deste pacote

1. O backend passa a aceitar fontes `incoming/AAAA-MM-DD-M/T/I.csv`. Antes, a segunda inclusão falharia porque o próprio arquivo da primeira inclusão não satisfazia a expressão de caminhos.
2. Recuperação operacional da branch órfã conserva o commit original. Confere ator/digest/prova, PRs abertas e fechadas, pai único contra main, comparação GitHub, três arquivos esperados, manifesto e prova pelo mesmo validador de conteúdo do CI. Reconfere refs antes de abrir PR. Base defasada, prova adulterada ou PR encerrada bloqueiam recuperação.
3. Duas solicitações iguais podem convergir para a mesma PR, sem substituir ref. Erro ambíguo de rede é reconciliado por leitura; não existe auto-merge nem escrita direta em main.
4. Replay de PR aberta confere o SHA real, repositório, branch e base, além de autoria e digest. Não cria novos registros.
5. Política protege também `data/events.csv`, ledger nominal e futuro diretório de correções contra PR ordinária.
6. Workflow Gate E usa `pull_request_target`, checkout da base protegida e leitura dos objetos Git. Não executa scripts, dependências ou testes da HEAD candidata nesse job. Testes candidatos continuam nos workflows independentes, sem misturar sua execução com a decisão de integridade confiável. Forks e merge queue permanecem bloqueados.

## Validação local

- 195/195 testes de regressão PASS em Node 24.19.0.
- 3/3 verificações de integração em Git real descartável PASS.
- Suites Gemini, relay Google/CSRF, impressão iOS, revisão mobile, PDF A4 e servidor PDF local PASS.
- Testes de recuperação incluem branch órfã, manifesto/prova adulterados, main avançada, PR fechada, PR com HEAD divergente, reenvio sem writes, concorrência idêntica e segunda inclusão após publicação de fonte com sufixo.
- Transportes GitHub dos testes de recuperação são isolados. **Não** chamar esses testes de homologação GitHub real da recuperação. Não houve fonte real inserida na produção.

## Matriz de aceite e limitações

| Item | Estado |
| --- | --- |
| Concorrência stale real no LAB | HOMOLOGADO |
| Recuperação operacional e idempotência | IMPLEMENTADO / TESTADO LOCAL; GitHub real pendente |
| Correção pós-publicação versionada | Contrato somente; endpoint/ledger/UX não implementados |
| Histórico 86 eventos, 82 A / 4 B | Preservado; nenhum data/ alterado pelo pacote |
| Gate E workflow confiável | Implementado; requer prova após instalação em main |
| Check Gate E obrigatório | PENDENTE; ruleset 24843983 exige só os dois checks anteriores |
| Aprovação independente | PENDENTE; ruleset observado exige 0 |
| Supabase / F2-12 | Não alterados; escrita prospectiva false |
| Foto original arquivada | Não implementado; referência textual não são bytes da foto |
| E2E Google→GitHub→merge→dashboard | PENDENTE; credencial e operadores ausentes |
| GO de aplicação com escrita bloqueada | Permitido pela autorização atual, condicionado aos checks |
| GO de gravação estatística | NO-GO até fechar pendências e configuração operacional |

## Produção e rollback

Projeto Vercel confirmado: `roleta`, `prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o`, equipe `team_WIH0gs3BUjcZdk59oPViSjEm`. Não confundir domínio com nome do projeto.

Antes da promoção, último deployment funcional observado READY: `dpl_AfqwZiqVdhaJouJH7DZJ1Jn73Z9X`, commit 676d0f9. Deployment documental 0d95d16 foi cancelado pelo ignoreCommand; não é falha funcional. As variáveis estatísticas ROLETA_STAT_WRITES_ENABLED, ROLETA_STAT_GITHUB_TOKEN e ROLETA_STAT_ALLOWED_SUBS estão ausentes. ROLETA_V2_WRITES_ENABLED=false.

Rollback: manter escrita bloqueada; restaurar deployment funcional anterior se o smoke falhar, sem apagar dados/commits. Reverter código por PR se necessário. Rollback de aplicativo não apaga provas, manifesto ou propostas de eventos. Anexar SHA de merge, deployment READY e smoke em adendo após promoção. Não declarar o programa Gate E concluído pela publicação desta versão.

## Próxima decisão relevante

Definir quais pessoas podem submeter estatísticas e qual conta GitHub fará revisão independente. Provisionar credencial técnica limitada a Contents write e Pull requests write no Roleta, sem administração, workflows ou bypass da main; não enviar token pelo chat. O conector GitHub disponível não oferece mutação de rulesets nem criação de GitHub App/segredos; não contornar proteção por push direto.

Depois das identidades e do acesso administrativo: fechar correção versionada, homologar recuperação no LAB com cadeia oficial, instalar proteção obrigatória, testar negativas e E2E autenticado; só então habilitar escrita. Esta é a próxima ação segura, sem recomeçar o projeto.

## Adendo — produção confirmada

- PR [#92](https://github.com/wagnerjfjunior/Roleta/pull/92) mergeada com SHA `1d836b6c61c523dae3e98f6126cab78a115b3f34`; HEAD revisado `74c029b28846589d0d80e8ebb80038e72b303b50`.
- Cinco workflows no HEAD revisado: todos completed/success. Runs: audit 38277069119, guardrails 38277069160, Gemini 38277069115, F2-11 38277069158, F2-12 38277069104. Gate E target precisa de base instalada; sua verificação ocorre na PR documental posterior, sem contar sua ausência na PR de instalação como PASS.
- Vercel production READY: `dpl_FMJi473JZg1oXzPTT6rmWM7x8YS4`, exatamente o SHA do merge.
- Domínio confirmado pertencente ao projeto: [roleta-tgv.vercel.app](https://roleta-tgv.vercel.app).
- Smoke HTTP: raiz 200; /data/manifest.json 200, 86 eventos / 82 A / 4 B; /api/auth/session 200 com authenticated:false. POST vazio em /api/statistical-submit foi usado somente para conferir bloqueio, não para registrar evento.
- Estado final: **DEPLOY REALIZADO com escrita estatística bloqueada**. **Não** significa GRAVAÇÃO ATIVADA nem conclusão das etapas 2–4.
- A autorização de merge/deploy foi executada, não precisa ser repetida. Próxima decisão: identidades de operadores e revisor independente; escolher/provisionar credencial restrita e acesso administrativo às regras. Após isso ainda executar os bloqueadores técnicos registrados acima.
