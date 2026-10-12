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
- Ensaio PostgreSQL 17 e script concorrente incluídos no workflow descartável existente. Ensaio confirmado PASS no run 38300941084, job 114983434806, step 8; SHA 2d6c890a30ccb34858bedf1531ce94edbcce1aff.

## Limites e proteção de histórico

Nenhum registro histórico, WEEKLY_FROZEN, tabela prospectiva ou objeto Discador foi alterado. Edição de evento existente do baseline é recusada: correção de histórico exige processo próprio. Não declarar segurança integral do banco a partir desta suíte específica. Funções finais confiam no sujeito verificado pelo backend restrito, e não em Supabase Auth do navegador.

Leitura atual retorna versões vigentes com limite de 5000 eventos; antes de volume elevado, implementar paginação. O dashboard mostra indisponibilidade explicitamente ao exibir apenas baseline. Após salvar, atualizar o painel para carregar os registros; não há atualização em tempo real nesta versão.

## Próxima ação

Observar CI PostgreSQL 17 no SHA promovido para homologação, corrigir localmente qualquer falha e repetir apenas checks afetados. Depois auditar configuração de runtime e aplicar migração adicional, sob autorização existente do responsável, somente com provas verdes. Verificar grants e fluxo real antes de afirmar ativação. A conferência é pelo próprio operador, sem segundo revisor.

## Homologação e configuração observadas

PR de homologação: https://github.com/wagnerjfjunior/Roleta/pull/95 (DRAFT; sem merge). Os cinco workflows retornaram success no SHA 2d6c890a30ccb34858bedf1531ce94edbcce1aff, incluindo PostgreSQL 17 e concurrent replay. URL: https://github.com/wagnerjfjunior/Roleta/actions/runs/38300941084

Projeto Vercel confirmado por inventário: roleta / prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o, equipe team_WIH0gs3BUjcZdk59oPViSjEm. Inventário sem descriptografar valores confirmou DSN e CA Sensitive/Production. ROLETA_STAT_ALLOWED_SUBS, ROLETA_FINAL_READS_ENABLED e ROLETA_FINAL_WRITES_ENABLED ausentes. Sem ACL de sujeitos verificados, ativação permanece bloqueada por desenho. Não criar sub a partir de e-mail. Nenhuma variável foi alterada.

A função final inclui explicitamente data/** no bundle Vercel para validar o histórico carregado por caminhos dinâmicos. Configuração ainda requer build/deploy real para smoke. Não foi aplicada migração nem feito merge/deploy nesta etapa.

A confirmação estatística é invalidada ao editar linhas físicas, fonte ou motivo. A bateria concorrente foi ampliada para duas correções divergentes sobre o mesmo predecessor: apenas uma deve vencer, preservando duas versões. Verificar CI do SHA final antes de promoção.

## Resultado final da etapa

SHA executável homologado: 82c87462a84c8f041de7c17b06140e0211025126. PostgreSQL 17: run 38301436483 / job 114985035766 / step 8 success, incluindo correções concorrentes divergentes (um vencedor, predecessor preservado). URL: https://github.com/wagnerjfjunior/Roleta/actions/runs/38301436483

Última verificação local após as alterações: 212/212 regressões e 10/10 arquivos UI/OCR/PDF aprovados; árvore de data/ idêntica à base. Código entregue na PR #95; main e banco de produção não modificados nesta etapa.

Pendência concreta: configurar sujeitos Google realmente verificados dos operadores. Em produção, a ACL ROLETA_STAT_ALLOWED_SUBS e as duas flags finais estão ausentes. Não habilitar escrita com ACL vazia nem inventar IDs a partir de e-mails. Antes do go-live, aplicar migração adicional homologada e realizar build/deploy e smoke com sessão real. Sem recomeçar conexão, OCR ou impressão.

## Encerramento solicitado pelo responsável — 12/10/2026

Autorização expressa para finalizar publicação e ativação. A exigência manual de copiar Google sub foi substituída por vínculo automático seguro: o callback existente consulta userinfo Google por HTTPS com access token, exige email_verified=true e assina sessão contendo o sub real. O endpoint final aceita somente as duas contas aprovadas por env server-only e o banco vincula o sub real na primeira utilização autenticada. Depois de vinculado, outro sub para o mesmo e-mail é rejeitado; desativação no cadastro privado também bloqueia. Não há ID inferido do e-mail, segundo revisor ou token no navegador.

Novo cadastro privado final_operator_identities (RLS/FORCE RLS), com as duas contas autorizadas. Writer executa somente função de vínculo, sem ler/alterar a tabela diretamente. Owner privado possui SELECT/UPDATE apenas nesse cadastro e SELECT/INSERT no ledger. ROLETA_FINAL_OPERATOR_EMAILS controla o gate server-side, separado de ROLETA_GOOGLE_ALLOWED_EMAILS e da escrita prospectiva. A ACL manual ROLETA_STAT_ALLOWED_SUBS não é mais requisito deste fluxo final.

Re-homologar alteração de identidade em PostgreSQL 17 antes de aplicar a migração. Depois instalar a migração adicional, configurar flags/contas finais, merge da PR #95 e verificar deployment READY no domínio real. Não fabricar roleta real para canário.
