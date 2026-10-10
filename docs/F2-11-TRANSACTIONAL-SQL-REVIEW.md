# F2-11 — Revisão da migração candidata (sem deploy)

A migração candidata `database/review-only/20261010_roleta_private_ledger_candidate.sql` **não deve ser executada no Supabase Discador-MesaCliente** nesta fase.

## Escopo
- Criar somente schema privado `roleta_audit` e tabela de evidências.
- Impedir grants de `PUBLIC`, `anon` e `authenticated`.
- Exigir RLS e FORCE RLS, chaves de idempotência únicas e constraints de previsão/resultado.
- Não tocar em `public`, `auth`, `forensic_evidence`, funções Edge ou policies existentes.
- Não expor o schema no PostgREST.

## Bloqueios antes de implantação
1. A tabela é deliberadamente **sem permissões para runtime**. Ainda falta criar papel dedicado e função de append atômico, sem uso de `service_role` ou `postgres` como runtime.
2. O hash de evidência não pode ser aceito de um cliente sem recomputação no servidor/banco. O SQL atual é apenas estrutura de dados.
3. Proibir UPDATE/DELETE também para funções de aplicação; preparar correção por novo registro.
4. Confirmar PostgREST exposed schemas, default privileges e superfície `SECURITY DEFINER` por auditoria.
5. Ensaio de concorrência, replay, restore e limites de conexões em Postgres descartável. Não executar testes de carga no Discador.
6. Confirmar backup/restauração, janela de mudança e rollback reversível.
7. Aprovação humana específica antes de qualquer migração.

## Critério de aceite
Não ativar captura prospectiva real até haver prova de isolamento e função transacional segura. Preservar `WEEKLY_FROZEN`, dados históricos e impressão atual.
