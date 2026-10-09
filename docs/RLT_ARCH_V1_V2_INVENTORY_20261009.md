# RLT-ARCH-01 — Inventário V1/V2 e plano de concretização

Estado: **INSPEÇÃO SOMENTE LEITURA — IMPLEMENTAÇÃO E HOMOLOGAÇÃO PENDENTES**

Inspeção: 09/10/2026, aproximadamente 18:15, America/Sao_Paulo (21:15 UTC). Branch `feat/ocrspace-shadow-reconciler-20261009`, PR #41; referência documental inicial `a914499d6eb6f252a35c7c22294ad0ed9216a931`. Decisões e runbook: [RLT_ARCH_V1_V2_RELEASE_ROLLBACK.md](RLT_ARCH_V1_V2_RELEASE_ROLLBACK.md).

Foram consultados os conectores autenticados de Make/Vercel e o código correspondente ao SHA de produção. Não foram disparados webhooks, executadas fotos de teste, editados cenários, consultados valores de segredos ou realizadas mutações na base. As observações são um retrato temporal, não um monitoramento contínuo.

## 1. Deployment operacional localizado

| Item | Evidência |
| --- | --- |
| Projeto Vercel | `roleta`, ID `prj_Fc4IcpnaqmYj3XSvhV8g0avwbv4o` |
| Equipe Vercel | `team_WIH0gs3BUjcZdk59oPViSjEm` |
| Deployment de produção e destino dos aliases | `dpl_BYrkeBBcqJtHEA2ockrFh93z3NPf`, estado `READY` |
| Commit vinculado | `2ca0165992c97a7e5db601863236788fe1f18729`, branch `main`, merge PR #39 |
| URL fixa | `https://roleta-q4huocovi-wagnerjfjunior-3025s-projects.vercel.app` |
| Aliases apontando para esse deployment | `roleta-tgv.vercel.app`, `roleta-six-lime.vercel.app`, `roleta-wagnerjfjunior-3025s-projects.vercel.app`, `roleta-git-main-wagnerjfjunior-3025s-projects.vercel.app` |
| Deployment anterior listado | `dpl_HQFiFsh4h3oUU9PAuKgPsJvXD2DX`, SHA `73c5401f9c87c2e6c04f1e315bebc5f02f9fdad5`, `READY` |

As consultas de projeto, deployment e aliases convergem para a mesma referência operacional. Ambos os deployments aparecem como candidatos a rollback na listagem da plataforma; isso não comprova compatibilidade de dados nem ensaio funcional. O deployment corrente é **candidato à referência congelada V1**, ainda sujeito à confirmação operacional e testes de recuperação. Não foi criado tag, release, deployment ou alias.

## 2. Make compartilhado: estrutura real

Cenário [Roleta](https://us2.make.com/19059/scenarios/6549955), ID `6549955`, organização `1872222`, equipe `19059`, zona `us2.make.com`. Ativo, gatilho webhook, última edição registrada `2026-10-09T16:24:28.255Z` (13:24:28 em São Paulo). A configuração retornou `maximum_runs_per_minute=100`, zero execuções incompletas e ausência de bloqueio por execuções incompletas. Esses campos não comprovam capacidade contratada ou sucesso das execuções recentes; histórico de execuções não foi consultado.

A listagem do escopo acessível retornou 16 cenários, dois ativos, incluindo Roleta. O limite do plano não foi retornado; a restrição de cenários ativos permanece uma decisão informada pelo usuário, sem presumir quota adicional.

| Ordem/ramo | ID e módulo | Observação |
| --- | --- | --- |
| Entrada | 1 — `gateway:CustomWebHook` | Webhook existente; URL sensível omitida. |
| Distribuição | 24 — `builtin:BasicRouter` | Router com duas rotas; não é seleção exclusiva por si só. |
| Rota 0 | 23 — `http:MakeRequest` | GET, timeout configurado 40 s, parse de resposta, redirects e parada em erro HTTP habilitados. Destino não documentado nesta inspeção. |
| Rota 0 | 21 — `gemini-ai:uploadAFile` | Usa conexão Gemini. |
| Rota 0 | 19 — `gemini-ai:createACompletionGeminiPro` | Filtro chamado Gemini com condições vazias. |
| Rota 0 | 13 — `gateway:WebhookRespond` | Único módulo explícito de resposta encontrado; status `200`, corpo `{{19.result}}`. |
| Rota 1 | 26 — `http:MakeRequest` | POST, timeout 40 s, parse de resposta, redirects e parada em erro HTTP habilitados; conexão OCR.space. |

A entrada da rota 0 também tem filtro Gemini com condições vazias; na rota 1 não foi retornado filtro. Nenhuma rota foi marcada como desabilitada. Não foram retornados módulos de tratamento de erro, persistência, controle de versão ou kill switch. O snapshot estrutural não prova a ordem temporal entre as rotas nem que um erro posterior afete uma resposta já enviada; isso exige ensaio controlado. Confirma, porém, que **não há exclusividade de versão demonstrada** e que a rota OCR.space não tem handler local demonstrado.

Conexões retornadas: Gemini ID `5125735`, usada por 21/19; HTTP API key OCR.space ID `11569872`, usada por 26. Ambas com status `ok` no conector; valores de credenciais não foram lidos. Esse status não substitui teste de chamada.

Foram lidas configurações específicas de 13/23/26 para resposta e orçamento HTTP. Não foi exportado blueprint integral de recuperação: a tabela acima é inventário sanitizado, não backup restaurável. Prompts, mappings restantes, política de filas/retries e autenticação do webhook precisam de verificação adicional antes de editar o cenário.

## 3. Fluxo de dados e escritores identificados

Código de produção inspecionado no SHA `2ca0165992c97a7e5db601863236788fe1f18729`; os arquivos centrais abaixo não divergem dos correspondentes na branch experimental na inspeção.

| Caminho | Comportamento observado | Persistência oficial |
| --- | --- | --- |
| `api/roleta-ocr.js` → Make | Sessão Google + origem + CSRF; imagem até 4 MiB; multipart contém apenas `file`; timeout 55 s; devolve `PENDENTE_REVISAO`. | Não grava eventos; não envia metadados V1/V2. |
| `roulette-intake.js` → `api/roleta-pdf.js` | Após revisão, envia payload para geração de PDF; PDF/JPG ficam disponíveis para download/compartilhamento. | Exportação de arquivo não é inserção na base estatística. |
| `api/analyze-roulette.js` | Chama OpenAI e devolve JSON de prévia. | Não há escrita canônica no handler inspecionado. |
| `api/ocr-reconcile.js` (experimental) | Diagnóstico protegido SHADOW. | Sem persistência; não é endpoint operacional da V1 identificada. |
| `app.js` | Busca `/data/manifest.json`, percorre `manifest.sources`, lê CSVs e deduplica por `Evento`; lê histórico nominal e dados derivados. | Leitura de arquivos do deployment. |
| `data/README.md` e histórico Git | Processo documentado: validar fonte, adicionar ledger datado, atualizar manifest e recalcular derivados. Há commits de ingestão de arquivos. | Escrita versionada em Git; executor humano/externo efetivo não identificado pelo código. |
| `scripts/build-current-data-state.js` | Escreve `docs/sfjm/CURRENT_DATA_STATE.json` a partir dos arquivos canônicos. | Estado derivado, não ingestão de eventos. |
| Laboratórios de simulação | Usam localStorage para simulações. | Não são base oficial. |

Nenhum escritor automático da base canônica foi encontrado no fluxo de API/Make inspecionado. Isso não exclui scripts locais externos, operações manuais ou integrações fora do cenário Roleta; inventariar esses autores antes de garantir proveniência em todas as escritas. Não há evidência para presumir banco transacional, schema SQL, trava distribuída ou restore seletivo pronto.

Os cabeçalhos dos CSVs canônicos e nominal não incluem `generator_version`, `pipeline_version`, `schema_version`, `created_at` ou `audit_metadata`. `Data`/`date` representam a data do evento; não substituem data de criação. O parser do painel lê por nome de coluna, mas `eventFromRow` projeta somente campos conhecidos: leitura tolerante a coluna extra é uma indicação de compatibilidade, não garantia de preservação numa futura regravação.

O manifest do commit de produção identifica `logical_dataset_version=2026-10-06-86`. Contagens futuras devem vir do manifest/estado derivado, não de cópias desta nota ou de documentação antiga.

## 4. Bloqueador da base única durante rollback

Os dados atuais são arquivos incluídos no deployment e o painel os consulta por caminhos relativos. Reapontar o domínio para um deployment antigo também reaponta essas leituras para o snapshot de dados antigo. Registros posteriores podem continuar no Git sem permanecer visíveis na aplicação restaurada. Portanto, **um rollback apenas de alias não atende ainda à preservação operacional da base única**.

Proposta para detalhamento: manter um único catálogo canônico versionado, publicado independentemente do ciclo de releases de aplicação. Servir os caminhos `/data/*` para V1 e V2 por fonte comum com contrato compatível, sem exigir segundo cenário Make. Escolher o mecanismo após verificar os recursos disponíveis: camada comum que encaminhe os caminhos existentes, ou adaptação mínima e formal da V1 para ler essa fonte. Nenhuma dessas opções está implantada ou aprovada tecnicamente nesta nota.

Congelar V1 exige um artefato compatível com essa leitura comum, ou uma camada comum comprovada que preserve o artefato atual. Recompilar código V1 com dados novos a cada retorno não constitui o mecanismo de rollback rápido proposto. Restauração de dados e exclusão crítica também deverão tratar Git, snapshots publicados, histórico nominal e derivados; apagar linhas numa única cópia não basta. Política de retenção e preservação de histórico Git deve ser definida antes de eventual remoção física.

## 5. Plano concreto de implementação, condicionado às lacunas

1. **Referência V1:** confirmar o deployment localizado, arquivar manifesto e blueprint integral sanitizado/restaurável em local protegido, e definir como as referências de conexões serão reconstituídas. Provar login, foto, revisão e PDF em janela de homologação autorizada.
2. **Base comum:** escolher publicação independente e caminho retrocompatível `/data/*`; inventariar autores manuais/externos e os derivados. Demonstrar que um evento criado durante V2 continua visível ao retornar V1.
3. **Controle de versão:** especificar uma configuração administrativa com revisão, `active_version` e `v2_enabled`, lida no ingresso e fixada por requisição. O relay atual envia só `file`; portanto, formalizar a evolução do envelope autenticado e a admissão explícita do legado V1. O local desse controle ainda não está escolhido.
4. **Router 24:** planejar filtros exclusivos para rotas oficiais V1/V2. A rota 26 é diagnóstico OCR.space; não tratá-la como V2 oficial só por ocupar o segundo ramo. Delimitar seu orçamento e handler local e garantir que diagnóstico não decida resposta nem persistência.
5. **Resposta 13:** preservar o contrato Gemini existente da V1. Definir saída V2 e respostas de erro exclusivas sem duplicar resposta por requisição; confirmar limites do Make e testar erros/timeout antes de alterar mappings.
6. **Proveniência:** implementar na fronteira real de ingestão, inclusive ingestão manual em Git. Definir IDs estáveis de registro, versão de pipeline e schema; preparar dry-run de backfill `unknown/legacy`, sem escrever dados agora.
7. **Recuperação:** definir sincronização da troca entre aplicação e Make, requisições em voo, idempotência e autoridade de emergência. Provar kill switch sem deploy e ciclo V1 → V2 → V1 → V2, com dados compartilhados e RTO medido.

Ainda faltam: mecanismo administrativo de controle; autenticação efetiva do webhook e prevenção de bypass; prompts/mappings completos relevantes; comportamento de filas, retries e erros; quota disponível; autores externos de dados; publicação comum; backup/restore seletivo e ambiente/janela de homologação. A ausência dessas evidências bloqueia promoção operacional, não a elaboração documental do plano.

## 6. Próximo marco

Produzir uma especificação revisável para **base comum + controle de versão + filtros/handlers do cenário 6549955**, com contratos e casos de ensaio, a partir das lacunas acima. A implementação deve ser faseada, começando por compatibilidade V1 e preservação de dados antes de ativar V2. Manter PR #41 sem merge e produção sem alterações nesta etapa.
