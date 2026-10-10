# F2-11 — Auditoria read-only do Supabase compartilhado (2026-10-10)

Projeto inspecionado: `Discador-MesaCliente` (`uobxxgzshrmbtjfdolxd`). **Nenhuma migração, DDL, escrita, configuração de credencial ou deploy foi executado.**

## Evidências observadas
- `public`: 44 tabelas, 44 com RLS habilitada.
- `forensic_evidence`: 2 tabelas, 2 com RLS habilitada; sem privilégios diretos de schema nem SELECT/INSERT para `anon` e `authenticated` nas tabelas verificadas.
- `public` e `auth` têm USAGE para `anon` e `authenticated`; isso não significa acesso irrestrito aos dados.
- O projeto possui dados e funções de produção de Discador/FECH.AI. Três Edge Functions existentes, uma delas com `verify_jwt=false`; não é prova de vulnerabilidade por si só, mas requer revisão isolada do endpoint.
- Security Advisor reportou achados informativos `rls_enabled_no_policy` (incluindo duas tabelas `forensic_evidence`) e pelo menos um alerta sobre função `SECURITY DEFINER` executável por autenticados. São achados **preexistentes** e não autorizam alterações no Discador. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Recomendação condicionada
O compartilhamento **pode ser tecnicamente viável** com isolamento por schema, mas não é isolamento físico, financeiro ou de superusuário. Não é possível afirmar segurança suficiente sem validar papéis efetivos, exposição no PostgREST, gestão de segredos, funções SECURITY DEFINER e modelo de ameaça.

Arquitetura proposta:
1. Criar futuramente `roleta_audit` fora dos schemas expostos pelo PostgREST, com `REVOKE ALL` de `PUBLIC`, `anon` e `authenticated`, sem permissões herdadas.
2. Usar credencial de banco dedicada e de menor privilégio para API da Roleta; **não reutilizar a service_role do Discador** e nunca disponibilizar segredos ao navegador. Verificar viabilidade de provisionar credencial independente com as permissões do plano.
3. Transação no servidor: lock serializado por cadeia, idempotência por `event_id + policy`, relógio do banco, ordem monotônica, registro append-only, hash verificável. Evitar `SELECT then INSERT` sem trava.
4. Triggers ou permissões que proíbam UPDATE/DELETE, com procedimento formal de retificação por novo registro; backup e teste de recuperação.
5. Google auth da Roleta no backend, allowlist e CSRF; jamais equiparar sessão Google a token Supabase `authenticated`.
6. Testar negação de acesso entre aplicações, concorrência, replay, falha de conexão, duplicidade, retenção e restauração em ambiente não produtivo antes de migrar.
7. Desempenho e quotas de um banco compartilhado podem afetar ambos os sistemas; medir limites e rollback.

## Gate de implantação
A autorização do usuário é para **avaliar** o uso compartilhado, **sem aplicar migrações antes da auditoria**. Esta auditoria preliminar é read-only. Próxima fase: detalhar DDL e matriz de permissões como arquivos de revisão, executar testes estáticos e solicitar autorização específica para migração em banco compartilhado. Até lá, nenhuma tabela `roleta_audit` deve ser criada.
