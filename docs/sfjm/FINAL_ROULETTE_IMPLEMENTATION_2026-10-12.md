# Folha final Supabase — implementação candidata

Branch: `feature/final-roulette-supabase-20261012`. Base main resolvida ao vivo: `a5d3d0d7b8b84ae8a24c39d824d08623840dcf1e`.

## Comportamento implementado

- Endpoint `api/final-roulette.js`: leitura autenticada e gravação explícita, sessão Google assinada existente, ACL server-only por sub, origem e CSRF em POST, limite de corpo, erros sanitizados.
- `server/final-roulette-contract.cjs`: revalida todas as classes contra cadastro oficial, bloqueia duplicatas nominais, valida SALÃO e posições físicas, mantém data original/D+1, bloqueia resultados futuros e colisão com histórico versionado.
- `server/final-roulette-store.cjs`: somente SQL parametrizado fixo; reutiliza conexão pooler, TLS/CA e limites já existentes. Sem credencial administrativa.
- `database/production-review/final_roulette_v1_candidate.sql`: ledger adicional com versões, predecessor, digest verificado no banco, autor e motivo; RLS/FORCE RLS, owner privado sem LOGIN/BYPASSRLS, writer sem acesso direto à tabela. Reenvio idêntico não duplica; correção exige versão corrente e motivo; locks transacionais serializam concorrência.
- `roulette-intake.js`: salvar no Supabase, carregar evento salvo e corrigir pelo mesmo fluxo de conferência; impressão/PDF/compartilhamento continuam separados.
- `domain/final-ledger.js` e `app.js`: união de baseline e versões atuais por evento/data/período, sem precedência silenciosa; resultados nominais da família incorporam apenas SALÃO; TOP 5 usa conjunto nominal completo verificado quando há novos registros. Sem novos registros, mantém o artefato estatístico existente integralmente.

## Configuração necessária após homologação SQL

Reutilizar `ROLETA_V2_DATABASE_URL` e `ROLETA_V2_TLS_CA_PEM`; não recriar senha nem copiar segredo em chat. Confirmar `ROLETA_STAT_ALLOWED_SUBS` com sujeitos Google efetivamente verificados dos dois operadores já autorizados. Os e-mails sozinhos não revelam sujeitos.

Novos gates independentes: `ROLETA_FINAL_READS_ENABLED` e `ROLETA_FINAL_WRITES_ENABLED`; ausentes/false bloqueiam. Nenhuma mudança em `ROLETA_V2_WRITES_ENABLED` nem ativação prospectiva como consequência desta integração.

O SQL é candidato de revisão, não migration aplicada. A CLI Supabase não está instalada neste ambiente; só gerar registro final de migration após ensaio e promoção, preservando as três migrações já aplicadas. Não repetir bootstrap nem usar DROP CASCADE.

## Evidências locais

- 16 testes novos: contrato, D+1, digest, classes, cadastro adulterado, duplicatas, permissão, flags, origem, CSRF, actor forjado, conflito sanitizado e união do dashboard.
- Suíte consolidada inicial: 212/212 testes de regressão aprovados.
- Suíte de UI/OCR/PDF existente: 10/10 arquivos aprovados.
- Sintaxe app/intake verificada; `git diff --check` aprovado.
- PostgreSQL indisponível localmente; tentativa de instalação não concluiu por restrições de ambiente/rede. Não substituir teste real por mocks.
- Ensaio PostgreSQL 17 e script concorrente incluídos no workflow descartável existente. Até resultado observado, idempotência transacional/DDL/concorrência permanecem PENDENTES.

## Limites e proteção de histórico

Nenhum registro histórico, WEEKLY_FROZEN, tabela prospectiva ou objeto Discador foi alterado. Edição de evento existente do baseline é recusada: correção de histórico exige processo próprio. Não declarar segurança integral do banco a partir desta suíte específica. Funções finais confiam no sujeito verificado pelo backend restrito, e não em Supabase Auth do navegador.

Leitura atual retorna versões vigentes com limite de 5000 eventos; antes de volume elevado, implementar paginação. O dashboard mostra indisponibilidade explicitamente ao exibir apenas baseline. Após salvar, atualizar o painel para carregar os registros; não há atualização em tempo real nesta versão.

## Próxima ação

Observar CI PostgreSQL 17 no SHA promovido para homologação, corrigir localmente qualquer falha e repetir apenas checks afetados. Depois auditar configuração de runtime e aplicar migração adicional, sob autorização existente do responsável, somente com provas verdes. Verificar grants e fluxo real antes de afirmar ativação. A conferência é pelo próprio operador, sem segundo revisor.
