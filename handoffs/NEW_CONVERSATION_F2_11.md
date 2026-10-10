# Roleta — Restart a new SFJM conversation

Use this text to resume work. The live main branch, not this note, is authoritative.

## Copy into the new conversation

Ative SFJM — Roleta Intelligence V3, no repositório wagnerjfjunior/Roleta, branch main. Ambiente LOCAL-FIRST / NO PREVIEW, remoteIterationAllowed=false. Resolva o HEAD real da main e leia bootstrap/BOOTSTRAP_CANONICO.md, handoffs/CURRENT.md, docs/PROJECT_STATUS.md, docs/NEXT_SAFE_ACTION.md, docs/BLOCKED_ACTIONS.md e docs/F2-11_SHARED_SUPABASE_READINESS_20261010.md antes de propor alterações.

Estado verificado em 10/10/2026: PRs #73–#76 incorporados; #76 merge 2b949fbdf7282026035e3556ed5f03f8526f9174. Testes de sessão autenticada, identidade do autor, SQL parametrizado, hash encadeado e isolamento em PostgreSQL descartável. Quatro workflows aprovados no PR #76. Supabase compartilhado Discador-MesaCliente uobxxgzshrmbtjfdolxd, PostgreSQL 17.6. Schema roleta_audit e papéis exclusivos do Roleta ainda inexistentes na produção; nenhuma gravação prospectiva ativada.

Objetivo: consolidar a matriz de permissões efetivas, inclusive PUBLIC, memberships e default ACLs; revisar dependências e SQL separado de migração para produção; preparar ensaio isolado, monitoramento, plano de implantação, desativação e reversão. Não executar SQL de alteração em produção.

Limites: nenhuma credencial, lógica sensível ou permissão privilegiada no frontend. Não alterar schemas, políticas RLS, dados, privilégios ou funcionamento do Discador. Manter histórico e WEEKLY_FROZEN imutáveis. Gate A: autorização específica para migração de schema. Gate B: autorização específica e separada para ativar gravação prospectiva. O comando genérico "siga" não autoriza nenhum deles.

Pode avançar autonomamente com GitHub, revisão, testes e consultas SQL somente de leitura até o próximo bloqueio real. Não presumir que testes em CI provem isolamento de todos os objetos existentes no banco compartilhado. Registrar PRs, testes, decisões e próximos passos no handoff versionado.

## Precedence and continuity

Historical numerical snapshots in older README/status sections are not current dataset counts. Resolve data/manifest.json and docs/sfjm/CURRENT_DATA_STATE.json before using counts. For printing read docs/PRINT_TEMPLATE_V2.md and its changelog. For security read the F2-11 readiness review. Conversation memory never overrides live repository state.
