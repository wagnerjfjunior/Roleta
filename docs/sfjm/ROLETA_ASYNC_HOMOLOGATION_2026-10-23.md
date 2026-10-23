# Roleta — homologação OCR assíncrono — 23/10/2026

## Decisão
NO-GO para migrations produtivas, merge e ativação. Configuração/homologação autorizadas pelo responsável nesta sessão; aprovação específica dessas três ações continua obrigatória. Não há pedido de aprovação de produção neste checkpoint.

## Estado live inspecionado
- PR #126 Draft, base main `68feb2a73d1e4c66f3477dad1ba08d1d8f387e10`, HEAD de entrada `257a9c283a8f005181bb840e97b8d23c4b70db52`. Seis workflows retornados para esse HEAD concluíram SUCCESS; isso não comprova E2E.
- Vercel roleta: `prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o`, deployment produtivo `dpl_3KcF1YFfUTGfojf5ytTp3b9P44gr` READY, main `68feb2a`. Metadados consultados com decrypt=false: nenhuma variável ROLETA_INTAKE_*. Nenhum deploy nesta sessão. A branch bloqueia deploy Git fora de main em vercel.json.
- Make us2, equipe 19059: 6549955 ACTIVE, lastEdit 2026-10-15T12:07:06.804Z. Fluxo 1→23→21→19, handler 27→29, resposta 13. Conexão Gemini existente saudável; nenhum callback. Nenhuma modificação no cenário.
- Falhas Make de 23/10: execuções `3f001d14a6314e76822cf8d09773ad3f` (13:49 BRT), `2305a9992f8e4d1e9f099367f446f3b5` (13:51 BRT), `1fcae5ca8fab48ccb79cf1ef38674b72` (13:53 BRT): HTTP 503, nenhuma reexecução provocada nesta sessão.
- Supabase uobxxgzshrmbtjfdolxd: consulta somente leitura retornou roleta_ocr e roleta_audit; roleta_intake ausente. Advisors de segurança consultados; apontamentos legados não foram corrigidos por este trabalho. Nenhum dado/schema/role produtivo alterado.

## Mudança candidata
- api/ocr-callback.js aceita envelope autenticado `{status:"FAILED",error_code:"GEMINI_503_EXHAUSTED"}`. Códigos permitidos adicionais: GEMINI_RATE_LIMIT_EXHAUSTED e GEMINI_REQUEST_FAILED. Não aceita resultado simultâneo; não persiste mensagens arbitrárias do provedor.
- F4 draft acrescenta fail_callback: nonce e estado na mesma transação, bloqueio de linha, falha idempotente com novo nonce, replay rejeitado. READY não é sobrescrito; falha terminal não reabre job. Reenvio explícito da fotografia cria novo job depois de FAILED. read_job passa a retornar error_code ao proprietário.
- Testes de API: sucesso da persistência, repetição idempotente, falha após sucesso, payload inválido, banco indisponível e nonce duplicado (DB simulado no conjunto Node).
- Testes SQL novos: falha persistida, error_code, replay, nova tentativa explícita, resultado salvo preservado.
- Testes DOM novos: reload consulta job da conta atual; outra conta não consulta; perda de rede preserva job_id; flag OFF não consulta job assíncrono. Não equivalem a iPhone real nem a sessão Google real.
- Workflow F1–F4 passa a executar também testes DOM de recuperação.

## Evidências locais
Comando: `node --test tests/ocr-callback-endpoint.test.cjs tests/ocr-callback-hmac.test.cjs tests/ocr-async-contract.test.cjs tests/ocr-job-submit.test.cjs tests/ocr-async-recovery-ui.test.cjs tests/ocr-review-render.test.cjs tests/mobile-review-calendar-compact.test.cjs tests/backfill-mobile-review-ui.test.cjs`
Resultado: 51 testes, 51 PASS, 0 FAIL, 0 skipped.
Ensaio SQL: F1, smoke F1, F2, smoke F2, F3, F4 e smoke F3/F4 executados em PGlite 0.5.11 / PostgreSQL 18.6 descartável, todos concluídos. Não é Supabase produtivo, não comprova TLS/pooler nem concorrência entre conexões. PostgreSQL 17 do CI deve confirmar o SHA final antes da aprovação.
Ambiente não possui psql/postgres/docker; instalação apt indisponível. Não se usou Supabase como substituto do laboratório. Dependências de laboratório não integram a aplicação.

## Credencial HTTP gerenciada — ponto de ação humana
Solicitação Make `d96fade6-c23a-4699-8061-cb87d800eba8`, HTTP v4 API key connection, PENDING. Nenhum segredo novo foi provisionado pelo agente.
A conexão existente Roleta-ocr.space-API-Key-connection NÃO foi reutilizada.
Cadastrar exclusivamente na página segura Make; nome sugerido Roleta Callback Homologacao; header X-Roleta-Callback-Key; chave exclusiva aleatória de pelo menos 32 bytes; restringir URLs permitidas ao callback Roleta. Nunca cadastrar chave como mapper, query string, blueprint, comentário ou texto de execução. Destino real de homologação e pareamento do segredo no servidor continuam pendentes. Não inventar URL Preview.
Após conexão: confirmar id, criar shadow separado/inativo, inspecionar exportação/execução sem revelar a credencial; testar chave inválida, revogação e substituição. A existência do formulário seguro não é prova de redaction ou rotação.

## Retry e recuperação — pendente de implementação Make
Política candidata para homologação: no máximo três chamadas por modelo, esperas de 5 s e 15 s apenas em 503/429; depois fallback, com mesmo limite. Não repetir 400/401/403 como indisponibilidade transitória. Após exaustão emitir callback FAILED com código seguro. Não usar Ignore para perder job nem afirmar que Break produz callback terminal após esgotar tentativas. ACK antecipado não é resultado salvo.
Ainda NÃO instalado/testado no shadow: retries dos modelos, callback de sucesso/falha, retries de entrega do callback, preservação de payload, reconciliação de jobs sem callback. `reconciliation_required` continua somente sinal read-only. Sem fotografia durável/outbox, reexecutar despacho automaticamente pode duplicar processamento; permanece bloqueado até desenho e prova de idempotência.

## Gates restantes
1. Conexão gerenciada pareada e prova de não exposição/revogação; shadow isolado completo com ACK, job_id, retry limitado, fallback e callback.
2. PostgreSQL 17 no SHA final, privilégios efetivos no banco compartilhado, backup verificável, role dedicada e TLS/CA. Aprovação específica antes de F1→F4 produtivas.
3. E2E real >180s, callback/nonce/reload Google, isolamento entre operadores, recuperação sem callback, foto incompleta, conferência humana e mobile real.
4. Retenção/limpeza, timeout/worker de reconciliação e limite de funções Vercel. Há 15 arquivos api; quantidade implantável/plano não homologados.
5. AppSec no SHA final, rollback exercitado, aprovação específica de merge e depois de ativação. Não marcar READY agora.

## Rollback preservado
ROLETA_INTAKE_ENABLED ausente/false mantém caminho síncrono e importação JSON. Não destruir jobs/resultados para rollback; conservar cenário 6549955. Antes da publicação registrar deployment/commit de retorno, confirmar env efetiva no build e provar desativação. Login Google, impressão, PDF, estatística e schemas existentes não foram alterados.

## Confirmação remota do SHA funcional 717a9a7
Seis workflows SUCCESS: OCR intake F1–F4 40009794426; Gemini intake safety 40009794517; F2–11 security 40009794552; F2–12 storage PostgreSQL 17 40009794628; audit regression 40009794531; guardrails 40009794560. Job 120606920034 confirma SUCCESS nas etapas F1, F2, F3/F4 e Node. O ensaio PostgreSQL 17 pendente acima está concluído para este SHA; gates de produção/E2E permanecem abertos.
Evidência: https://github.com/wagnerjfjunior/Roleta/actions/runs/40009794426
Nenhuma autorização de migrations, merge ou ativação foi solicitada/concedida nesta sessão. A conexão Make continua PENDING.

## Continuação — conexão autorizada e laboratório criado (23/10, 16h24 BRT)
Este bloco substitui o status PENDING da conexão nas seções anteriores.
- Request d96fade6-c23a-4699-8061-cb87d800eba8: AUTHORIZED, HTTP v4 connectionId 11902957. Origens informadas pelo responsável: https://roleta-tgv.vercel.app e https://caminhosdalapategra.com.br. A segunda não é necessária para o callback atual; amplia os destinos autorizados da credencial.
- LAB 6752690 criado e verificado INACTIVE/on-demand: Start → HTTP v4 → ReturnData. Usa apenas apiKeyAccount=11902957; headers mapeados são job_id, nonce e timestamp. Envelope sintético FAILED/GEMINI_503_EXHAUSTED. Não foi executado; não existe prova de autenticação ou redaction de execução. Blueprint lido pelo conector contém referência à conexão, sem chave literal. scenario_get não listou a conexão no resumo connections; o vínculo foi confirmado diretamente em scenario_module_get.
- GET sem credencial para https://roleta-tgv.vercel.app/api/ocr-callback retornou 404. O endpoint candidato ainda não está implantado. Não enviar credencial apenas para obter 404 nem chamar isso de E2E.
- Configuração Vercel autorizada: criadas ROLETA_INTAKE_ENABLED=false e ROLETA_INTAKE_CALLBACK_AUTH=managed_api_key, target production. Nenhum redeploy. Configuração armazenada não equivale a env ativa em deployment existente. Google login e tráfego atuais preservados.
- A chave cadastrada no Make não pode ser recuperada via conector. Próxima ação humana: cadastrar a MESMA chave diretamente no projeto roleta da Vercel, variável ROLETA_INTAKE_CALLBACK_API_KEY, tipo Sensitive, target Production; não enviar chave ao chat nem colocar em comentário. Confirmar no Make o nome do header X-Roleta-Callback-Key. A correspondência e o mínimo de 32 bytes ainda não foram comprovados pelo agente.
- Separadamente, definir/aprovar destino backend de homologação sem Preview; não fazer merge só para eliminar 404. Shadow OCR completo, retries 503/429, callbacks reais, worker/outbox e E2E permanecem pendentes. A consulta dinâmica de modelos Gemini retornou lista vazia nesta sessão; os modelos observados foram preservados e nenhum modelo novo foi escolhido.
- Make produtivo 6549955 intacto; nenhuma migration Supabase, merge ou ativação. NO-GO permanece.
Laboratório: https://us2.make.com/19059/scenarios/6752690

## Continuação — chave Vercel e prova de autenticação sem banco
- Responsável informou correção do header de Authorization para X-Roleta-Callback-Key. Relato humano, não leitura direta do segredo/conexão.
- Metadados Vercel confirmam ROLETA_INTAKE_CALLBACK_API_KEY como Sensitive e target Production; valor não lido. A correspondência com a chave Make será comprovada somente pela chamada autenticada.
- Candidato acrescenta probe opcional no endpoint existente: header X-Roleta-Probe: auth, corpo exclusivo {"probe":"auth"}, chave/envelope válidos e ROLETA_INTAKE_CALLBACK_PROBE_ENABLED=true. Resposta AUTHENTICATED_NO_WRITE. Não abre DB nem aceita resultado/falha para persistência, mesmo com flag intake ligada. Probe é OFF por padrão e separado de ROLETA_INTAKE_ENABLED. Não comprova nonce durável, OCR ou recuperação.
- 57 testes locais PASS, zero FAIL/skipped; inclui seis novos cenários de probe: intake OFF, default OFF, payloads de escrita bloqueados, credencial errada/rotacionada/curta, expiração, isolamento mesmo com intake ON. Testes usam chave fictícia exclusiva, sem acesso remoto.
- Próximo gate proposto: deployment de homologação tipo Production, sem atribuição de domínios, sem merge, com intake=false e probe=true somente nesse deployment. Não executado; requer aprovação específica do responsável. Nenhum Vercel Preview. Após gerar o hostname exato, incluí-lo como origem permitida na conexão Make antes de chamar o probe; não enviar chave a destinos não autorizados. Verificar proteção Vercel e capacidade/plano antes de executar.
- O cenário 6752690 ainda está inativo/configurado para callback de falha no domínio atual; não foi mudado/executado para o probe antes da autorização do destino. Migrations, retries OCR, nonce durável e mobile continuam pendentes. NO-GO para liberação.

## Deployment isolado autorizado — limite Hobby e consolidação
- Responsável autorizou deployment Production sem domínios, sem merge/migrations/ativação, além do uso do navegador e autenticação CLI. CLI 65.2.0 autenticada; nenhum token exposto.
- Primeira tentativa do candidato 9f6b721: dpl_7zQpZWyUse2NXVJ3RdLgJT7W3PXj, URL roleta-kfyetwqrk-wagnerjfjunior-3025s-projects.vercel.app, ERROR exceeded_serverless_functions_per_deployment: Hobby permite 12, candidato possuía 15. Não declarar READY com base no texto inicial da CLI. Endpoint de aliases confirmou lista vazia.
- Domínio roleta-tgv.vercel.app continuou em dpl_9dw2CSm3yNkEpAZtuaRUNbfukXHU READY/main 68feb2a; a tentativa não promoveu o candidato.
- Correção local: mover implementações submit/status/callback e shadow legado para server/*-handler.cjs; único wrapper api/ocr-shadow-submit.js despacha para handlers isolados. Rewrites preservam /api/ocr-job-submit, /api/ocr-job-status e /api/ocr-callback; job_id e raw body preservados. 12 arquivos API. Login Google, sessão/CSRF, chave, nonce e gates permanecem nos handlers originais.
- 84 testes locais PASS, zero FAIL/skipped, cobrindo roteamento/rewrite, limite12, probe autenticado sem DB, callback, submit/status, recuperação DOM/mobile e regressões shadow/retencão/cleanup. Primeira execução no worktree falhou por ausência de jsdom; repetida com as dependências locais já instaladas (NODE_PATH), sem alteração de dependências e todos aprovados.
- Repetir CI e deployment sem promoção no SHA consolidado. Rewrites e contagem real ainda exigem a prova da Vercel. Não há sucesso Make→Vercel nem autorização de migrations/merge/ativação.

## Resultado da implantação isolada — candidato 18dbd4f
- Seis workflows SUCCESS no SHA 18dbd4f7057c4f3d20d3535bfa67bd88ff03124b: audit 40017074925; guardrails 40017074924; Gemini 40017074647; storage17 40017074851; intake F1–F4 40017074590; security F2–11 40017074841.
- Deployment Production dpl_6ZHJiwppNu8L6giGNYkHSJUJEsae, https://roleta-ygyct2jhx-wagnerjfjunior-3025s-projects.vercel.app, READY; build aprox.14s. Fonte CLI em worktree limpa do SHA; intake=false e probe=true como overrides desse deployment. Chave herdada do segredo Production, sem leitura.
- Atenção operacional: --skip-domain preservou os aliases principal/six-lime/git-main, mas houve associação automática do alias técnico roleta-wagnerjfjunior-3025s-projects.vercel.app ao candidato. Detectado por inspeção de aliases; restaurado via alias set ao deployment anterior. Após restauração, consulta de CADA um dos quatro aliases confirmou dpl_9dw2CSm3yNkEpAZtuaRUNbfukXHU (main 68feb2a) e list_deployment_aliases do candidato retornou []. Não declarar que nunca ocorreu associação temporária.
- Testes HTTP pelo conector autenticado Vercel: GET /api/ocr-job-submit => 200 {"enabled":false}, no-store; GET /api/ocr-job-status =>503 {"error":"Disabled"}; GET /api/ocr-callback =>405 {"error":"Method not allowed"}. Provam roteamento/gate em deployment real, não autenticação positiva do callback.
- vercel curl não atravessou Vercel Authentication nessa execução: GET recebeu302 e ambos POSTs receberam401 da proteção Vercel. Esses401 NÃO são resultado da aplicação. Leitura via web_fetch_vercel_url funcionou usando acesso temporário do conector. Não foram expostos links/cookies de acesso.
- Nenhuma chamada Make do laboratório executada; a origem do hostname de homologação ainda não está permitida na conexão11902957. Callback com chave correta, revogação e redaction de execução continuam NÃO HOMOLOGADOS.
- Próxima decisão: autorizar acesso temporário SOMENTE ao hostname do deployment isolado para a execução Make, preservando autenticação por chave no callback e login Google; adicionar essa origem à conexão HTTP gerenciada. Não desabilitar Deployment Protection do projeto inteiro. Reverter a exceção ao encerrar o teste. Alternativa é um transporte Make autenticado à proteção Vercel com armazenamento seguro adicional; não gravar bypass/cookie/chave no blueprint.
- Sem migrations Supabase, merge, promoção ou ativação do intake. Make6549955 preservado. GO apenas para continuidade da homologação; NO-GO para liberação produtiva.
Inspeção: https://vercel.com/wagnerjfjunior-3025s-projects/roleta/6ZHJiwppNu8L6giGNYkHSJUJEsae
