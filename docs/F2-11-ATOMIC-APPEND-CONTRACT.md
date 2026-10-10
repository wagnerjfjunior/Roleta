# F2-11 — Contrato de append transacional (design sem deploy)

**Status:** somente especificação; nenhuma migração no Discador-MesaCliente.

## Operação `append_prospective_evidence`
Entrada autenticada pelo backend Roleta: `event_id`, `kind` (prediction/outcome/correction), `policy`, `snapshot_hash`, `payload`, `idempotency_key`. A identidade do ator é derivada da sessão Google validada no servidor, nunca do corpo HTTP.

A transação deve:
1. Validar credencial dedicada `roleta_runtime` e negar execução a `PUBLIC`, `anon`, `authenticated`, `service_role` via grants (observação: superusuários/proprietários não podem ser isolados exclusivamente por RLS).
2. Adquirir lock transacional de cadeia (por exemplo `pg_advisory_xact_lock` com namespace estável), sem bloqueio de tabelas operacionais do Discador.
3. Checar idempotência no banco; reenvio idêntico devolve referência já gravada; chave reutilizada com conteúdo diferente gera conflito.
4. Verificar unicidade de `event_id + policy` para prediction, unicidade de outcome por `event_id`, anterioridade e fechamento do evento.
5. Aplicar relógio do banco `clock_timestamp()`, validar limite de payload e campos, calcular hash canônico e vincular ao hash anterior sob o mesmo lock.
6. Inserir uma única evidência imutável e retornar id/hash/horário; sem `UPDATE` ou `DELETE` de registros.
7. Garantir rollback automático em qualquer falha, incluindo concorrência e indisponibilidade.

## Regras de proteção ao Discador
- **Proibido:** alterar objetos de `public`, `auth`, `forensic_evidence` ou roles/policies já existentes.
- **Proibido:** compartilhar service_role, segredo de banco, credenciais do Discador, tabelas de usuários ou seus dados.
- **Obrigatório:** schema `roleta_audit` não exposto via PostgREST, runtime sem BYPASSRLS, pool de conexões limitado, `statement_timeout` e monitoramento.
- A eventual criação de papel SQL dedicado é uma mudança global de catálogo e requer revisão adicional. Não se pode prometer isolamento absoluto entre aplicações em um mesmo cluster.
- Não ativar endpoints de escrita antes de homologação, testes de restauração e autorização específica.

## Plano de teste negativo
- `anon`, `authenticated`, runtime do Discador: sem USAGE/SELECT/EXECUTE.
- Duas requisições simultâneas: apenas um append para chave idempotente; encadeamento válido.
- Predição após outcome, outcome sem predição, policy duplicada: rejeição.
- `captured_at` forjado, replay, hash divergente, payload acima do limite: rejeição ou substituição segura pelo horário do banco.
- SQL injection, `search_path` hijacking, RLS bypass e acesso cruzado: negação.
- Falha durante append: nenhuma evidência parcial.
- Carga sob limite: sem degradação mensurável do Discador.
- Backup e restauração em ambiente descartável antes de qualquer migração.

## Gate
A aprovação para **prosseguir com código e testes** não é aprovação para migrar o banco. DDL e funções devem passar por revisão e homologação em Postgres isolado antes de qualquer solicitação de mudança em produção.
