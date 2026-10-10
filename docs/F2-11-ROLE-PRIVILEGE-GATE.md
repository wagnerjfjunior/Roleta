# F2-11 — Gate de privilégios antes da migração

**Situação:** desenvolvimento offline. Nenhuma operação de escrita autorizada no Supabase compartilhado nesta fase.

## Papel exclusivo e separação
O futuro `roleta_runtime` deve ter `LOGIN` sem `SUPERUSER`, `BYPASSRLS`, `CREATEDB`, `CREATEROLE` ou `REPLICATION`. Não usar `service_role`, `postgres`, `anon` ou `authenticated` como credencial de runtime.

A tabela de evidências deve pertencer a um papel proprietário distinto e sem login; o runtime não pode ser dono de tabela, schema nem função. Não conceder `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` ou acesso a sequências. O runtime receberá apenas `USAGE` no schema e `EXECUTE` em uma função de append final auditada. A função deve ser `SECURITY DEFINER` de proprietário de menor privilégio, `search_path` restrito e sem SQL dinâmico, depois de revisão adversarial e testes em banco descartável. `FORCE RLS` exige política específica ao executor; caso contrário a função não gravará, como desejável enquanto não homologada.

## Auditoria efetiva (obrigatória)
O arquivo `database/audit-only/20261010_shared_db_privilege_inventory.sql` contém consultas somente de leitura sobre schemas, roles, ACLs, funções e RLS. Também verificar configuração real de schemas expostos no PostgREST, que não é provada por `pg_namespace`.

Testes de negação obrigatórios:
- `roleta_runtime` sem privilégios em `public`, `auth`, `forensic_evidence` e outros schemas do Discador, inclusive grants herdados por membership e `PUBLIC`.
- `anon` e `authenticated` sem `USAGE` em `roleta_audit` e sem `EXECUTE` na função.
- `roleta_runtime` sem leitura, update, delete ou insert direto nas evidências.
- Função transacional sem acesso a tabelas operacionais do Discador.
- Credenciais nunca expostas no frontend, nos logs, no Git ou em respostas HTTP.
- O backend limita conexões, tempo de execução, tamanho de payload e volume por usuário.

## Próximo ponto de decisão
Somente após SQL definitivo, teste de concorrência/recuperação em banco isolado, plano de rollback e auditoria efetiva concluídos: apresentar a migração e solicitar autorização específica para executar DDL no Supabase de produção. A autorização para ativar escrita operacional será separada.
