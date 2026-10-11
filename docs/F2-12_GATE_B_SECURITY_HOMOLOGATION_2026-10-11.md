# F2-12 — Gate B · Homologação de segurança antes de qualquer escrita real

Data: 2026-10-11. Escopo: `api/prospective-v2-append.js`, fronteira Google/CSRF, ACL pessoa, cutoff e transporte PostgreSQL. **Nenhum teste deste pacote grava no banco de produção**. A Roleta Simples e o backfill histórico não fazem parte do escopo.

## Evidência live existente (read-only)

- Preflight autenticado informado pelo operador: `F2-12: 200 CONNECTED_RESTRICTED` após configurar o CA e novo redeploy; confirma conexão e resultado da matriz consultada pelo endpoint, **não** um teste de escrita.
- Supabase `uobxxgzshrmbtjfdolxd`, tabela `roleta_audit.prospective_evidence`: 19 colunas, 14 constraints; `relrowsecurity=true` e `relforcerowsecurity=true`.
- Privilégios efetivos de `roleta_v2_writer`: EXECUTE da função `append_authenticated_person_evidence_v2(...)`=true; SELECT/INSERT direto da tabela=false.
- Production env Vercel: `ROLETA_V2_WRITES_ENABLED=false`; URL do DB e CA permanecem Sensitive. Nunca incluir valores secretos em CI, logs ou evidências.
- Inspeção read-only do trigger live `roleta_audit.guard_prospective_evidence()`: a validação de predecessor ocorre no gatilho BEFORE INSERT, com exigência do mesmo event_id, person_id, política CURRENT_SHADOW, tipo prediction, revisão anterior, frozen_at nulo e ausência de track congelado. A função de append, isoladamente, só busca por recommendation_id; a análise de segurança **deve considerar função e trigger em conjunto**. Falta prova transacional em banco isolado.
- A informação acima valida configuração e observações pontuais, não prova isolamento de todas as tabelas nem correção de toda lógica SQL.

## Matriz Gate B

| ID | Cenário | Verificação | Evidência / expectativa |
|---|---|---|---|
| G-B-01 | Flag ausente, false ou inválida | `prospective-v2-gate-b-security.test.cjs` | 503, zero acesso a auth/SQL |
| G-B-02 | ACL ausente, JSON inválido, sujeito estranho ou chave reservada | Mesma suíte | Fail closed |
| G-B-03 | Cookie/sessão ausente, CSRF adulterado, origem falsa, actor_subject forjado | Mesma suíte + testes Google HTTP existentes | Bloqueia antes de construir comando |
| G-B-04 | `person_id` fora da ACL autenticada | Mesma suíte | Negado |
| G-B-05 | Semana/fim de semana, `integral`, fora do cutoff, geração não atual | Mesma suíte + guard atualizado | Negado no servidor, sem SQL |
| G-B-06 | SQL livre, parâmetros extras, flag desligada | Mesma suíte + regression transport | Negado |
| G-B-07 | Divulgação de credenciais por erro | Mesma suíte + health regression existente | Resposta sanitizada |
| G-B-08 | TLS com hostname verificado e DB role mínimo | Health real + regressão existente | `CONNECTED_RESTRICTED` |
| G-B-09 | Repetição da mesma chave/payload | **CI PostgreSQL 17 descartável: aprovado** | Mesmo ID, sem linha duplicada |
| G-B-10 | Mesma chave com payload diferente | **CI PostgreSQL 17 descartável: aprovado** | Rejeição atômica por conflito de idempotência |
| G-B-11 | Concorrência na idempotência | **PENDENTE: ambiente PostgreSQL isolado** | Sem duplicidade |
| G-B-12 | Revisão `CURRENT_SHADOW`, predecessor de outra pessoa | **CI PostgreSQL 17 descartável: aprovado** | Trigger rejeita predecessor cross-person; cross-event ainda pendente |
| G-B-13 | Integridade de linha física / participantes reais | **PENDENTE: fonte canônica confiável no servidor** | Não basta campo `physical_position>0` |
| G-B-14 | Correção pós-salvar e preservação do histórico | **PENDENTE: contrato e teste ponta a ponta** | Apêndice rastreável, sem sobrescrever |
| G-B-15 | ACL Google sub → person_id real | **PENDENTE: operador/gestão de identidade** | Atribuição canônica e revogação testadas |
| G-B-16 | Retentativa após timeout e rollback | **PENDENTE: banco isolado + prova transacional** | Sem duplicidade, sem gravação parcial |

## Condições para permitir canário de escrita

1. Todos os testes negativos no CI concluídos e verdes, com commits e logs de execução rastreáveis.
2. ACL `ROLETA_V2_PERSON_ACL_JSON` configurada pelo operador autorizado, ligando Google `sub` de fato verificado a identificador de corretor oficial; cadastro/revogação documentados; nunca inferir `sub` a partir do e-mail.
3. Cutoffs/calendário e identidade de linha física conferidos contra fonte canônica independente do payload do cliente. O guard atual intencionalmente **não prova elegibilidade nem numeração física**.
4. Executar em DB isolado os cenários ainda pendentes da matriz, sobretudo concorrência G-B-11, predecessor cross-event G-B-12, elegibilidade G-B-13, correção G-B-14 e retentativa/rollback G-B-16. Os testes G-B-09, G-B-10 e predecessor cross-person de G-B-12 passaram no CI PostgreSQL 17 descartável com função, constraints, RLS e papéis da migration candidata; isso não prova paridade de cada byte do banco live.
5. Evidências e rollback/cancelamento de canário avaliados. Só então solicitar autorização **separada** para alterar `ROLETA_V2_WRITES_ENABLED`.

## Execução automatizada concluída

- Em 2026-10-11, commit `e34917823aa206aee21d42ac794aedcc7b84b11b`: 5/5 GitHub Actions aprovados, incluindo `Roleta regression guardrails`, `Roleta audit regression`, `Gemini intake safety`, `F2-11 disposable PostgreSQL security` e `F2-12 Gate A storage PostgreSQL 17 rehearsal`.
- A suíte PostgreSQL descartável executa `tests/postgres/gate-a2-v2-append-pg17.sql`, incluindo replay idempotente, recusa de chave conflitante e predecessor cross-person, sem usar o banco de produção.
- Os testes restantes da matriz não devem ser anunciados como homologados.

## Ponto de atenção obrigatório

**STOP / NO GO PARA ESCRITA.** A suíte unitária e o preflight de leitura não homologam idempotência transacional, integridade do operador/linha ou comportamento concorrente da função SQL em ambiente real. Não ativar feature flag nem executar inserções de teste em produção. O próximo trabalho permitido sem autorização adicional é exclusivamente revisão e preparação de um laboratório PostgreSQL descartável e as respectivas evidências de testes.
