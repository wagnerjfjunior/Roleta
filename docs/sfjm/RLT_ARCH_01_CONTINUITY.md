# Roleta — Continuidade SFJM de RLT-ARCH-01

Estado: **REGISTRO VERSIONADO NA BRANCH EXPERIMENTAL; NÃO PROMOVIDO A MAIN**

Data: 2026-10-09. Autoridade do projeto: usuário / Product Authority. Repositório: `wagnerjfjunior/Roleta`. Branch: `feat/ocrspace-shadow-reconciler-20261009`. PR: [#41](https://github.com/wagnerjfjunior/Roleta/pull/41), aberto na última verificação.

## 1. Fronteira de autoridade e retomada

`main` continua a referência operacional canônica do projeto; o estado deste trabalho experimental é versionado nesta branch. Resolver ambos ao retomar: última referência `main` verificada `2ca0165992c97a7e5db601863236788fe1f18729`; referência experimental anterior a esta reconciliação `22a92b5ad944abc89488ad1d452fba9cdabce1f0`. A revisão que contém este registro deve ser obtida no Git/PR; não inferir que os artefatos experimentais já foram incorporados a `main`.

SFJM é o protocolo de continuidade, não um serviço que transfere automaticamente o chat. StopJuniorMode permanece autoridade do protocolo; SFJM Workspace é somente consumidor derivado. Não houve atualização desses dois repositórios nem publicação de dashboard.

Referência do protocolo consultada: `wagnerjfjunior/StopJuniorMode`, SHA `2188c19a35a90e624314bbc01c42c6f5526d1629`: `docs/SFJM_CONTINUITY_CONTRACT_V2.md`, `docs/SFJM_TASK_DECOMPOSITION_CONTINUITY.md` e template de handoff. A aplicação aqui é incremental e restrita a este workstream; não é declaração de adoção integral de toda a pesquisa/protocolo.

## 2. Objetivo, estratégia e posição

- Objetivo material deste workstream: preparar Roleta V1/V2 modular, segura e reversível, com preservação dos dados e controles DevSecOps.
- Estratégia aprovada pelo usuário: um cenário Make ativo compartilhado, segredos compartilhados sob gestão segura e uma base única; cada nova escrita deve identificar sua origem; rollback de execução preserva dados.
- Posição atual: arquitetura documental revisada e inventário somente leitura concluídos; especificação de base comum e controle de versão pendente.
- Objetivo global estatístico/operacional da Roleta não foi substituído nem sua eficácia preditiva reavaliada.
- Decomposição material formal: `N/A` nesta consolidação. A sequência documental já registrada é preservada; não foi aprovado novo plano de implementação ou delegação paralela.
- Próxima ação autoritativa: seção vigente RLT-ARCH-01 de `docs/NEXT_SAFE_ACTION.md`.

A mudança de Chat/Work é escolha de ambiente de colaboração, não mudança de objetivo, evidência ou autorização. Discussão e elaboração no Chat; execução no repositório em etapa delimitada quando solicitada.

## 3. Decisões e condições de reabertura

| ID | Decisão vigente | Autoridade / efeito |
| --- | --- | --- |
| ARCH-D01 | Um cenário Make ativo para V1/V2. | Usuário; não exigir cenário paralelo como pré-condição. |
| ARCH-D02 | Compartilhar credenciais/segredos com gestão segura. | Usuário; conservar privilégio mínimo, proteção, rotação coordenada e auditoria. |
| ARCH-D03 | Base oficial única; preservar escritas das duas versões ao alternar. | Usuário; rollback não apaga nem oculta deliberadamente eventos de outra versão. |
| ARCH-D04 | Proveniência confiável em toda nova escrita; pipeline/schema/auditoria fazem parte do contrato a especificar. | Solicitação desta atividade; origem histórica sem prova recebe `unknown/legacy`. |
| ARCH-D05 | Exclusão crítica somente por versão e período fechado, com dry-run, aprovação forte, backup, integridade e prevenção de apagamento cruzado. | Usuário; procedimento documentado não autoriza executar exclusão. |
| ARCH-D06 | Compatibilidade V1 de leitura/escrita, nenhuma mudança destrutiva enquanto V1 for retorno. | Usuário; comprovar antes de promover V2. |
| ARCH-D07 | Uma resposta webhook por requisição, rotas oficiais exclusivas, kill switch V2 e contenção de falhas. | Requisito a implementar/testar; não declarar recurso existente. |
| ARCH-D08 | Sem merge, deploy ou mutação operacional nesta etapa; OCR.space permanece SHADOW. | Escopo explícito do usuário. |
| ARCH-D09 | Canonicalizar a continuidade SFJM antes de migrar a discussão ao Chat. | Pedido atual do usuário; registro no projeto, sem alterar a autoridade do protocolo. |

D01–D08 só podem mudar por decisão explícita do usuário ou revisão autorizada vinculada a nova evidência. D09 é atendida pela publicação desta reconciliação; não autoriza iniciar automaticamente implementação.

## 4. Evidências e entregas

| Evidência / entrega | Referência vinculada | Limite |
| --- | --- | --- |
| Arquitetura compartilhada e runbook | `docs/RLT_ARCH_V1_V2_RELEASE_ROLLBACK.md`, commit `a914499d6eb6f252a35c7c22294ad0ed9216a931`, atualizado no `22a92b5` | Proposta/documentação, não implementação. |
| Inventário Vercel/Make/código | `docs/RLT_ARCH_V1_V2_INVENTORY_20261009.md`, commit `22a92b5ad944abc89488ad1d452fba9cdabce1f0` | Retrato de 09/10, aproximadamente 18:15 São Paulo; não monitoramento nem teste funcional. |
| Produção V1 candidata | SHA `2ca0165992c97a7e5db601863236788fe1f18729`, deployment `dpl_BYrkeBBcqJtHEA2ockrFh93z3NPf` | Destino de aliases verificado no inventário; freeze/restore ainda não homologados. |
| Make compartilhado | Cenário `6549955`; última edição observada `2026-10-09T16:24:28.255Z` | Gemini/OCR.space no router 24; resposta explícita 13; sem exclusividade de versão ou kill switch demonstrados. |
| Dados do projeto | `data/manifest.json` e `docs/sfjm/CURRENT_DATA_STATE.json` | Fontes de contagens; dataset lógico não identifica release de aplicação. |
| Testes OCR anteriores | Histórico do usuário e `docs/RLT_OPS_02_OCRSPACE_SHADOW.md` | 20 testes relatados; não repetidos ou convertidos em homologação nesta consolidação. |
| Validação documental anterior | Commits `a914499` e `22a92b5` | Diff e links locais verificados; não prova integração HTTP/rollback. |

Especificação detalhada ainda **não criada**: o turno que a iniciaria foi interrompido após leituras. Não registrar sua conclusão ou inventar arquivo/commit correspondente.

## 5. Bloqueadores, caminhos rejeitados e lição observada

- Bloqueador operacional: `/data/*` é servido do snapshot de cada deployment; voltar a artefato antigo pode exibir dados antigos. Fonte comum independente de releases é requisito ainda não implementado.
- Nenhum escritor automático canônico foi encontrado no fluxo API/Make/revisão/PDF inspecionado; autores manuais/externos continuam a inventariar. Não presumir banco, transação ou adaptador pronto.
- Falta comprovar autenticação do webhook, filas/retries/handlers, quota, blueprint restaurável, backup/restore seletivo e RTO.
- Isolamento lógico não elimina risco comum de quota, credencial ou cenário compartilhado.
- Caminhos rejeitados: exigir Make V2/segredos separados; rollback só por frontend; apagar V2 ao voltar V1; rotular legado como V1 por data; promover SHADOW automaticamente. Reabrir somente com mudança explícita da decisão correspondente.
- Lição `ARCH-L01`, estado `OBSERVED`, escopo desta topologia: disponibilidade do código antigo não garante continuidade dos dados se estes estão dentro do artefato. Evidência: `app.js` e inventário. Revalidar quando o caminho comum de dados for implementado; não generalizar como impossibilidade universal de rollback.

## 6. Autorizações e limites duráveis

Autorizado: consolidar/versionar esta documentação e os índices SFJM na branch do PR #41. A solicitação de canonicalizar sucede e complementa a autorização prévia de atualização documental da mesma branch.

Próxima etapa planejada: elaborar/discutir a especificação no Chat, sem ações operacionais. Não autoriza implementar roteador, criar serviço de dados, ativar/desativar cenário, migrar/backfill dados, excluir registros, trocar segredos, merge ou deploy. Não disparar webhook para demonstrar estado sem escopo de teste aprovado.

Não remover gates de impressão, identidade nominal, prospectivo ou backfill. Esses workstreams são paralelos; seus snapshots antigos não foram revalidados integralmente nesta tarefa.

## 7. Reconciliação de continuidade

Divergência encontrada: índices SFJM de 04/10 e narrativas de 07/10 apontavam para branches/gates anteriores e contagens antigas. Esta mudança atualiza a entrada do workstream, referências e próxima ação; preserva snapshots antigos com data e limite de validade. Contagens correntes são derivadas, não copiadas para índices como fatos novos.

Classificação de continuidade para discutir a especificação: `CONDITIONAL`, por lacunas operacionais explícitas e pela ausência de revalidação integral dos workstreams históricos. Escopo seguro: planejamento documental de RLT-ARCH-01. Promoção/implementação dependentes das lacunas continuam bloqueadas; não declarar `CONTINUABLE` global nem homologação aprovada.

Recepção em novo Chat: resolver `main` e a branch/PR, ler bootstrap e registro autoritativo da próxima ação, reconstruir decisões/rejeições/limites e informar lacunas. Se não houver acesso ao GitHub, anexar os documentos versionados desta revisão; tratar cópia como transporte vinculado à revisão, nunca como prova de atualização automática.
