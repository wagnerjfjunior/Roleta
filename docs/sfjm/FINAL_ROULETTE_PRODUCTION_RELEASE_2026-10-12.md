# Roleta final — release e ativação em produção

Data: 12/10/2026, America/Sao_Paulo. Autorização expressa do responsável: finalizar publicação e ativação, sem novo gate de aprovação.

## Resultado confirmado

- PR #95 mergeada: https://github.com/wagnerjfjunior/Roleta/pull/95
- Commit funcional em produção: `54031ad2577811f68598a0b9b68cd34dc52c4f20`.
- Commit de implementação homologado: `ca28e0d54a84fc2be8d5661c19e4f9044f274144`, cinco workflows success, incluindo PostgreSQL 17, vínculo de identidade, replay e correções concorrentes. Run PG17: https://github.com/wagnerjfjunior/Roleta/actions/runs/38302090827
- Migration aplicada com success=true: `20261012200806 / roleta_final_roulette_versioned_ledger_and_operator_binding_v1`, projeto `uobxxgzshrmbtjfdolxd`.
- Deployment inicial: `dpl_2fLyXPiXMPVNC3tBPv45UPyHjxpt`, READY.
- Redeploy após explicitar as duas contas no allowlist Google: `dpl_5MPQWnouiJwqH7WKVPqvVbTZmmp5`, READY, target production, mesmo commit funcional, aliases atribuídos sem erro.
- Domínio operacional: https://roleta-tgv.vercel.app

## Configuração final

`ROLETA_FINAL_READS_ENABLED=true` e `ROLETA_FINAL_WRITES_ENABLED=true`, Production. `ROLETA_FINAL_OPERATOR_EMAILS` restringe a folha final a `wagnerjfjunior@gmail.com` e `brendatatianelima@gmail.com`. O allowlist de login `ROLETA_GOOGLE_ALLOWED_EMAILS` também foi atualizado para essas duas contas e entrou no redeploy final.

DSN e CA existentes foram reutilizados; nenhuma senha, client secret, session secret ou token foi lido, mostrado ou trocado. A flag de escrita prospectiva não foi modificada.

## Vínculo real de identidade

O callback existente obtém userinfo diretamente do Google usando access token, exige email_verified=true e conta autorizada, e assina a sessão com email e sub reais. O endpoint final aceita somente essa sessão, nunca email/sub fornecidos no corpo do cliente.

O cadastro privado final_operator_identities começa com as duas contas habilitadas, sem sub inventado. Na primeira utilização autenticada, a função restrita vincula o sub efetivamente recebido. Após isso, substituição por outro sub é recusada; enabled=false revoga o acesso. O sub real fica registrado como autoria de cada versão. Não é necessário copiar IDs manualmente nem pedir segunda aprovação.

## Postflight do banco

Confirmados ao vivo:
- final_roulette_versions e final_operator_identities com RLS e FORCE RLS;
- writer com EXECUTE para salvar e vincular, sem SELECT/INSERT/UPDATE/DELETE direto nas duas tabelas;
- anon sem EXECUTE de save; authenticated sem EXECUTE de bind;
- exatamente duas contas autorizadas, habilitadas e ainda sem primeiro vínculo no momento do postflight;
- zero eventos finais e zero evidências prospectivas; nenhum evento sintético inserido em produção;
- advisor não retornou achados nomeando objetos Roleta. Avisos de outros módulos do projeto compartilhado não foram tratados nem usados para afirmar auditoria integral.

## Verificação da publicação e limites da evidência

Manifesto servido no domínio real: HTTP 200, 86 eventos, 82 A / 4 B. Script publicado: HTTP 200, botão Salvar no Supabase presente e mensagem de PR GitHub retirada. Build/redeploy READY observados pela API Vercel.

A ferramenta de fetch Vercel encontrou 401 na rota final e classificou-o como barreira de autenticação; não forneceu o corpo da resposta. Não usar esse resultado como prova de sessão autenticada ou gravação real. O navegador de verificação retornou ERR_BLOCKED_BY_CLIENT, uma restrição do cliente de teste, não evidência de falha do aplicativo. Não foram forjadas sessões Google nem criados dados fictícios no ledger real. Consulta de logs filtrada não retornou linhas; isso não comprova ausência integral de erros.

Portanto: código, migração, configuração e ativação estão publicados. Primeiro vínculo e primeiro salvamento de uma folha real conferida ainda precisam ser observados pelo operador no próprio aplicativo. Não confundir essa verificação operacional com configuração pendente ou necessidade de recriar a conexão.

## Fluxo para o operador

Entrar com uma das duas contas Google, abrir Nova Roleta, conferir os dados e as posições físicas, confirmar e escolher Salvar no Supabase. Impressão/PDF/compartilhamento não gravam. Para corrigir, carregar o evento salvo, conferir novamente, informar o motivo e salvar; versão anterior permanece. Atualizar o painel para carregar o ledger vigente.

## Continuidade e rollback

Próxima ação: observar primeiro registro real e sua leitura pelo painel, usando folha efetivamente validada; não adicionar eventos inventados para teste. Preservar os 86 registros Git, WEEKLY_FROZEN e a evidência prospectiva.

Se for necessário desativar, usar ROLETA_FINAL_WRITES_ENABLED=false e redeploy, preservando versões; não apagar tabelas, usar DROP CASCADE nem modificar o Discador. Deployment anterior conhecido: dpl_G3gTsXuEB9C2xtkySzU5HsxLbyvJ. Rollback da aplicação não desfaz nem deve apagar registros persistidos.
