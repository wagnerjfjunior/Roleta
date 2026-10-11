# F2-12 — Gate B · Homologação de segurança antes de qualquer escrita real

Data: 2026-10-11. Escopo: `api/prospective-v2-append.js`, fronteira Google/CSRF, ACL pessoa, cutoff e transporte PostgreSQL. **Nenhum teste deste pacote grava no banco de produção**. A Roleta Simples e o backfill histórico não fazem parte do escopo.

## Evidência live existente (read-only)

- Preflight autenticado informado pelo operador: `F2-12: 200 CONNECTED_RESTRICTED` após configurar o CA e novo redeploy; confirma conexão e resultado da matriz consultada pelo endpoint, **não** um teste de escrita.
- Supabase `uobxxgzshrmbtjfdolxd`, tabela `roleta_audit.prospective_evidence`: 19 colunas, 14 constraints; `relrowsecurity=true` e `relforcerowsecurity=true`.
- Privilégios efetivos de `roleta_v2_writer`: EXECUTE da função `append_authenticated_person_evidence_v2(...)`=true; SELECT/INSERT direto da tabela=false.
- Production env Vercel: `ROLETA_V2_WRITES_ENABLED=false`; URL do DB e CA permanecem Sensitive. Nunca incluir valores secretos em CI, logs ou evidências.
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
| G-B-09 | Repetição da mesma chave/payload | **PENDENTE: transação PostgreSQL descartável** | Mesmo ID e apenas um registro |
| G-B-10 | Mesma chave com payload/ator diferente | **PENDENTE: transação PostgreSQL descartável** | Rejeição atômica |
| G-B-11 | Concorrência na idempotência | **PENDENTE: ambiente PostgreSQL isolado** | Sem duplicidade |
| G-B-12 | Revisão `CURRENT_SHADOW` e predecessor cross-person/cross-event | **PENDENTE: banco isolado + inspeção da função SQL** | Rejeição de vínculo ilegítimo |
| G-B-13 | Integridade de linha física / participantes reais | **PENDENTE: fonte canônica confiável no servidor** | Não basta campo `physical_position>0` |
| G-B-14 | Correção pós-salvar e preservação do histórico | **PENDENTE: contrato e teste ponta a ponta** | Apêndice rastreável, sem sobrescrever |
| G-B-15 | ACL Google sub → person_id real | **PENDENTE: operador/gestão de identidade** | Atribuição canônica e revogação testadas |
| G-B-16 | Retentativa após timeout e rollback | **PENDENTE: banco isolado + prova transacional** | Sem duplicidade, sem gravação parcial |

## Condições para permitir canário de escrita

1. Todos os testes negativos no CI concluídos e verdes, com commits e logs de execução rastreáveis.
2. ACL `ROLETA_V2_PERSON_ACL_JSON` configurada pelo operador autorizado, ligando Google `sub` de fato verificado a identificador de corretor oficial; cadastro/revogação documentados; nunca inferir `sub` a partir do e-mail.
3. Cutoffs/calendário e identidade de linha física conferidos contra fonte canônica independente do payload do cliente. O guard atual intencionalmente **não prova elegibilidade nem numeração física**.
4. Testes G-B-09..16 executados em DB isolado e descartável com a mesma função, constraints, RLS e papéis do ambiente real; zero escrita na base histórica ou tabelas operacionais.
5. Evidências e rollback/cancelamento de canário avaliados. Só então solicitar autorização **separada** para alterar `ROLETA_V2_WRITES_ENABLED`.

## Ponto de atenção obrigatório

**STOP / NO GO PARA ESCRITA.** A suíte unitária e o preflight de leitura não homologam idempotência transacional, integridade do operador/linha ou comportamento concorrente da função SQL em ambiente real. Não ativar feature flag nem executar inserções de teste em produção. O próximo trabalho permitido sem autorização adicional é exclusivamente revisão e preparação de um laboratório PostgreSQL descartável e as respectivas evidências de testes.
