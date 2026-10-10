# F2-11 — Contrato de segurança do banco único (revisão pré-migração)

Decisão do usuário: **um único projeto Supabase, Discador-MesaCliente**; a Roleta deve operar com isolamento lógico rigoroso. O Discador já está em produção e seus controles de segurança não podem ser enfraquecidos.

## Evidência read-only em 2026-10-10
- `roleta_audit` ainda **não existe**; `forensic_evidence` existe e nega USAGE de schema a `anon` e `authenticated`.
- `public` concede USAGE de schema a esses papéis, mas a autorização real depende de grants e RLS.
- `service_role` e `postgres` têm `rolbypassrls=true`; portanto, **RLS não é barreira contra essas credenciais**.
- `max_connections` reportou **60**; pool/concurrency da Roleta exigem orçamento próprio e ensaio de carga.
- Não foi possível demonstrar por essas consultas quais schemas estão expostos no painel de configuração do PostgREST; confirmar separadamente antes da migração.
- Auditoria anterior: 44 tabelas em `public`, todas com RLS; 2 tabelas em `forensic_evidence`, ambas com RLS. Achados preexistentes do Security Advisor não são autorização para alterações no Discador.

## Requisitos bloqueantes
1. Schema `roleta_audit` privado, fora de API exposed schemas, sem `USAGE` ou grants para `PUBLIC`, `anon`, `authenticated` ou papéis da aplicação Discador.
2. Identidade SQL dedicada à Roleta, sem `BYPASSRLS`, sem acesso a `public` operacional, `auth` ou `forensic_evidence`. Nunca usar `service_role` ou `postgres` como runtime.
3. Endpoints server-side autenticados por Google da Roleta, allowlist, same-origin e CSRF. Nunca confiar no `actor_subject` vindo do cliente.
4. Escrita por função transacional restrita com `search_path` fixo e lock de cadeia; sem INSERT/UPDATE/DELETE direto pelo runtime. Evidências append-only; retificação como evento novo.
5. `received_at` e encadeamento definidos no banco, idempotência atômica, `event_id` com fechamento após outcome e validação de versão/política/snapshot.
6. Conexões via pooler apropriado e limites de concorrência, tempo de query e tamanho de payload. Testar falha de pool e indisponibilidade **sem degradar o Discador**.
7. Nenhuma alteração em schema `public`, roles existentes, policies do Discador, Edge Functions do Discador, API exposed schemas ou configurações globais como parte da migração da Roleta.
8. Backup, restauração ensaiada, plano de parada reversível, rollback sem `DROP CASCADE`, monitoramento de carga e alerta.
9. Validação negativa de acesso cruzado; revisão de grants efetivos, default privileges e possíveis funções SECURITY DEFINER antes de qualquer execução.
10. Implantação em janela aprovada e autorização explícita de migração. O teste local/CI não autoriza escrita no banco de produção.

## Plano de execução
- **Pacote A:** contrato, código e testes offline, revisão de privilégios read-only e inventário de superfície.
- **Pacote B:** DDL completo em branch, revisado e testado em Postgres descartável; não executar o rascunho anterior do PR #47.
- **Pacote C:** revisão de custo operacional (conexões/CPU), backups, política de credenciais e teste de restauração.
- **Gate humano:** aprovação expressa para migração de `roleta_audit` no projeto compartilhado. Até então, somente leitura no Supabase.
- **Pacote D:** implantação controlada, verificação de isolamento e ativação em modo sombra com captura humana; sem tocar em `WEEKLY_FROZEN` ou na base canônica.

## Critérios de rollback
Antes de ativar captura: revogar o acesso da identidade dedicada e desabilitar endpoints da Roleta; preservar schema e evidências para auditoria. Nenhum rollback destrutivo automático.
