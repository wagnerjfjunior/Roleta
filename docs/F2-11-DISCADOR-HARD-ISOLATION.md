# F2-11 — HARD STOP: Discador-MesaCliente não é destino da Roleta

Decisão de segurança em 2026-10-10: o Discador-MesaCliente é um sistema de produção com controles de segurança previamente auditados. A Roleta **não deve acrescentar qualquer schema, tabela, função, papel, segredo, migration, trigger, job, bucket ou configuração** ao projeto Supabase Discador-MesaCliente.

## Política vinculante
- O único Supabase atualmente conectado é `Discador-MesaCliente` (ref `uobxxgzshrmbtjfdolxd`). **Não usar esse ref em comandos de escrita/migração da Roleta**.
- A Roleta exige um **projeto Supabase próprio**, credenciais independentes, orçamento/custo explicitamente confirmado, acesso mínimo e configuração de backups, auditoria, RLS e rede.
- Não reutilizar a `service_role`, senha de banco, identidade administrativa ou tokens do Discador.
- Não alterar o fluxo canônico, impressão, JSON, `WEEKLY_FROZEN` ou o registro histórico.
- O PR #47, que continha rascunho de schema compartilhado, foi **fechado sem merge**. Não executar seu SQL.
- A auditoria anterior foi **somente leitura**; não foram realizadas migrações no Discador.

## Caminho autorizado
1. Desenvolver contratos de domínio, API em modo desabilitado por padrão, migrações e testes offline para um banco dedicado.
2. Criar novo projeto apenas depois de escolher a organização e confirmar custo, nome e região.
3. Implantar em homologação; verificar RLS, autenticação, idempotência, atomicidade, append-only, logs, backup e recuperação.
4. Ativar captura prospectiva em modo sombra apenas após homologação e aprovação explícita.
5. Preservar o Discador completamente fora do escopo de deploy, testes com escrita e administração da Roleta.

## Critério de bloqueio
Se alguma instrução, arquivo de ambiente, pipeline ou configuração da Roleta apontar para o ref `uobxxgzshrmbtjfdolxd`, a operação de implantação deve falhar fechada. Não há exceção automática.
