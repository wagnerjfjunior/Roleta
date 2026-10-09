# RLT-ARCH-01 — V1/V2 com infraestrutura compartilhada e rollback controlado

Estado: **PROPOSTA DE ARQUITETURA — NÃO IMPLEMENTADA EM PRODUÇÃO**
Branch: `feat/ocrspace-shadow-reconciler-20261009` — PR #41
Data: 2026-10-09

## 1. Decisões e limites desta etapa

V1 é a linha estável de recuperação; V2 é a evolução modular, com releases identificáveis e retorno operacional testável. O nome de produto `Roleta Intelligence V3` e a versão do pacote não identificam esses marcos operacionais.

Por decisão do usuário, V1 e V2 **compartilham um único cenário Make ativo**, as credenciais/segredos e uma base oficial única. Não se exige outro cenário ativo nem outro conjunto de segredos para rollback. As rotas das duas versões coexistirão no mesmo cenário; somente a versão selecionada processará oficialmente cada requisição. Blueprints arquivados são artefatos de recuperação, não cenários mantidos ativos.

Alternar versão preserva todos os dados de ambas. Rollback de execução não desfaz dados; exclusão crítica é uma operação excepcional independente, descrita na seção 7. Segurança, modularização, rastreabilidade e DevSecOps continuam obrigatórios. Isolamento lógico reduz propagação de falhas, mas não equivale a isolamento físico: cenário, quotas, credenciais e armazenamento compartilhados mantêm riscos comuns.

Esta revisão altera somente este documento. Não autoriza merge, deploy, edição do Make, migração, backfill ou exclusão de dados.

## 2. Estado inspecionado e lacunas

Inspeção do repositório na cabeça `1d4dd1b824726a2d0bf1668bba65394e389a7ef0` da branch, com PR #41 aberto:

| Evidência | Conclusão e limite |
| --- | --- |
| `vercel.json` | Habilita deployment de `main`, desabilita demais branches e contém regra para ignorar alterações documentais. Não comprova configuração efetiva da plataforma nem ambiente publicado para esta branch. |
| `api/roleta-ocr.js` | Entrada com sessão Google, mesma origem, CSRF, validação MIME/assinatura e limite de tamanho; envia apenas `file` a `ROLETA_MAKE_WEBHOOK_URL`, com timeout de 55 s. Não há envelope de versão nessa chamada. |
| `api/ocr-reconcile.js` e `docs/RLT_OPS_02_OCRSPACE_SHADOW.md` | Diagnóstico experimental SHADOW, sem persistência; não constitui fallback oficial. O histórico registra 20 testes locais aprovados, não repetidos nesta revisão documental. |
| `docs/DATA_DICTIONARY.md` | Define `event_id` e proveniência em campos existentes, mas não formaliza os novos campos de versão abaixo. Não comprova schema do armazenamento em produção. |
| `.github/workflows/gemini-intake.yml` | Há verificações de segurança/testes com filtros de arquivos e branches; não demonstra que todos os gates propostos estejam configurados ou que esta edição documental dispare CI. |

O contexto operacional informado descreve Gemini e a ramificação OCR.space no mesmo cenário. **Na revisão inicial não houve inspeção ao vivo.** O inventário posterior de 09/10/2026 está em [RLT_ARCH_V1_V2_INVENTORY_20261009.md](RLT_ARCH_V1_V2_INVENTORY_20261009.md): confirmou deployment/aliases e estrutura do cenário compartilhado, sem ler valores secretos ou executar requisições de teste. A configuração completa, limites/filas, escritores externos, atomicidade, backups e restauração ainda precisam de verificação antes da implementação. Não presumir roteador, kill switch, releases imutáveis ou rollback já implantados.

## 3. Arquitetura e controles de execução

### Releases e módulos

- Preservar artefato V1 executável, Git SHA, ID do deployment, dependências, contrato e URL de verificação; confirmar qual release realmente atende produção.
- Identificar V2 pelos mesmos elementos, sem exigir projeto Vercel separado. A disponibilidade simultânea dos artefatos e a troca de destino devem ser verificadas no ambiente real.
- Versionar blueprint Make e configuração por revisão/hash, arquivando cópias sanitizadas com acesso restrito. Nunca salvar valores secretos ou URLs de webhook sensíveis no Git.
- Separar módulos de entrada/autenticação, OCR, normalização, reconciliação, gate estrutural, revisão humana, impressão, auditoria e persistência. Bibliotecas puras podem ser compartilhadas; mudanças V2 não alteram silenciosamente o contrato V1.
- Só validação humana autoriza publicação estatística. Reimpressão não gera evento novo. OCR.space permanece SHADOW, sem autorizar impressão, persistência oficial ou substituição automática do Gemini.

### Roteamento no Make compartilhado — contrato a implementar

1. Manter configuração administrativa protegida com `active_version` (`v1`/`v2`), `v2_enabled` (kill switch), revisão e referência dos artefatos compatíveis. Nomes são propostos; mecanismo e local de armazenamento dependem do inventário.
2. Resolver a versão no ingresso confiável e fixá-la na execução junto com `request_id`, `event_id`, chave de idempotência e revisão de configuração. Não aceitar seleção oficial por querystring, localStorage, filename ou campo arbitrário do cliente.
3. Validar autenticidade do envelope servidor → Make e impedir acesso que contorne a decisão. Requisições antigas sem envelope só podem seguir V1 por caminho legado explicitamente identificado e protegido; nunca inferir versão pelo conteúdo OCR.
4. Usar filtros mutuamente exclusivos, cobrindo também versão inválida e erro. Uma requisição executa uma única rota oficial. Versão/configuração inválida falha de forma controlada; indisponibilidade do controle só admite V1 se houver configuração V1 previamente validada, caso contrário bloqueia o processamento.
5. Garantir **uma única resposta webhook por requisição**, com um único responsável lógico pela resposta, inclusive em timeout, rejeição e tratamento de erros. Verificar no blueprint real se isso exige módulo comum ou saídas exclusivas; não presumir convergência de rotas. Rota SHADOW jamais responde ao webhook nem escreve dados oficiais. Não confiar na resposta automática do Make como sucesso de negócio.
6. Reservar orçamento de tempo compatível com os 55 s do relay atual, limites de operações, tamanho, concorrência e retries. Diagnósticos V2/SHADOW não podem bloquear a resposta V1; a forma de desacoplar ou dispensar diagnóstico deve ser provada no cenário disponível.
7. Tratar erro V2 localmente com limite de tentativas, circuito de interrupção e registro para reconciliação. Não encadear V1 automaticamente após resultado V2 incerto, pois a gravação pode ter ocorrido. Falha ou lentidão OCR.space não deve parar Gemini/V1 nem desativar o cenário inteiro.
8. O kill switch bloqueia novas admissões V2 e novas gravações V2 ainda não confirmadas mediante verificação na fronteira de escrita. Execuções em andamento mantêm sua versão de origem; drenar, concluir sob política aprovada ou colocar em quarentena, nunca relabelar/reexecutar cegamente como V1.

O bloqueio de escrita e a gravação precisam de proteção contra corrida (transação, trava ou mecanismo equivalente comprovado). Se o armazenamento não a oferecer, suspender admissões e drenar escritores antes da troca. Duplicatas e retries preservam a identidade do evento, independentemente da versão ativa. Não prometer isolamento absoluto: exaustão de quota, falha do Make ou revogação de segredo compartilhado podem afetar ambas as versões.

## 4. Base única, proveniência e compatibilidade

Todo registro novo, inclusive produzido por V1 após a instrumentação, deve ter versão geradora confiável. A atribuição ocorre na fronteira de escrita controlada, sem exigir que a interface antiga forneça campos novos. Inventariar todos os escritores para não deixar caminhos sem identificação.

Contrato proposto, a adaptar ao armazenamento real:

| Campo | Regra |
| --- | --- |
| `event_id`, `record_id`, `request_id`, `run_id` | Identificam evento, registro, requisição e tentativa; preservar identidade nos retries e revisões. |
| `generator_version` | `v1`, `v2` ou `unknown/legacy` para histórico sem prova; imutável na criação, atribuído por origem confiável. |
| `pipeline_version` | Revisão imutável do pipeline, vinculando código, blueprint e configuração; não apenas “versão ativa agora”. |
| `schema_version` | Versão do contrato efetivamente gravado e aceito pelo leitor. |
| `created_at` | Momento de criação do registro, UTC, imutável e distinto da data do sorteio e do momento de importação. Ausência histórica não deve ser preenchida com data fictícia. |
| `audit_metadata` | Ator/serviço, fonte, referência de release, revisão da configuração, correlação, motivo e aprovação humana; sem segredos ou fotos desnecessárias. |
| Revisão/proveniência | Cada alteração registra versão autora e vínculo com original; uma revisão V2 de evento V1 não transforma a origem do evento em V2. |

A versão atual fica na configuração de execução; a versão geradora fica nos dados e nunca muda com o cutover. Metadados desconhecidos devem permanecer explicitamente desconhecidos, inclusive pipeline/schema históricos sem evidência.

- Adotar formato comum retrocompatível ou adaptador na fronteira, com testes de leitura **e escrita** V1 sobre registros V1, V2 e legados. Se V1 regravar objetos inteiros, o adaptador deve preservar metadados e campos adicionais.
- Migrações aditivas em etapas; não renomear/remover campos, mudar semântica ou impor obrigatoriedade que quebre escritores V1. A fase destrutiva de expand/contract permanece proibida enquanto V1 for opção de retorno.
- Se houver efeitos V2 que V1 não compreenda, mapear sem perda comprovada ou bloquear promoção/escrita V2. Não resolver com exclusão automática ou dual-write ingênuo.
- **Bloqueador identificado no inventário:** o painel atual lê arquivos `/data/*` incluídos em cada deployment. Trocar para um artefato antigo também troca o snapshot visível. Definir e homologar uma fonte canônica comum independente dos releases, com caminhos/contratos compatíveis com V1, antes de considerar o rollback apto a preservar dados operacionalmente.
- Dados das duas versões seguem disponíveis ao alternar; não filtrar histórico pela versão ativa. Dados oficiais continuam separados logicamente dos diagnósticos, com vínculos auditáveis.
- Idempotência deve funcionar entre versões e tentativas; revisão humana cria revisão rastreável, reimpressão não duplica evento. Backup e restore testados são pré-condições para cutover, mas restaurar snapshot antigo sobre a base inteira não é rollback de aplicação.

### Backfill dos registros antigos

Executar posteriormente como migração separada, revisada e reversível: inventariar, fazer backup, gerar dry-run com IDs/contagens, aplicar em lotes e reconciliar. A ausência de versão recebe `unknown/legacy`, nunca V1 por aproximação de data, nome de produto ou branch. Não sobrescrever proveniência válida nem inferir pipeline/schema sem evidência. Registrar ID da migração, horário de execução e valores anteriores separadamente de `created_at`. Reexecutar não altera linhas já tratadas; reversão restaura apenas os campos da migração se não houve atualização concorrente. Legados continuam legíveis/graváveis e ficam excluídos de expurgos por V1/V2.

## 5. Segredos compartilhados e DevSecOps

Compartilhar segredos não elimina gestão segura: guardar em gerenciadores apropriados, referenciar por nome/ID, restringir acesso administrativo e conceder somente permissões necessárias. Evitar exposição em frontend, logs, blueprint exportado ou documentação. Rotação/revogação é coordenada e validada nas duas versões; rollback de código não deve reintroduzir credencial revogada. Registrar responsáveis, validade e dependências sem valores. Reconhecer o impacto comum de comprometimento; segregação por função quando disponível não pressupõe conjuntos separados por versão.

Gates obrigatórios, a comprovar antes de operação:

1. Threat model das fronteiras imagem/OCR, relay, Make, autenticação, revisão humana e persistência; validação de entrada e negação por padrão.
2. Revisão por PR, políticas de branch, testes unitários/integração, SAST, secret scanning, auditoria de dependências e contratos de schema; registrar cobertura real e lacunas do CI.
3. Auditoria protegida contra alteração, correlação por evento/requisição/versão, acesso mínimo, retenção definida e minimização de dados pessoais.
4. Homologação sem escrita oficial, testes de falhas, idempotência, uma resposta webhook e concorrência durante troca; OCR.space permanece SHADOW.
5. Controles administrativos autenticados, aprovação explícita de promoção/retorno e evidência de quem, quando, motivo, artefatos e revisão antes/depois. O kill switch deve ter autoridade de emergência previamente aprovada, sem depender de novo deploy.
6. Monitorar erros, latência, duplicatas, execução pendente e uso de quotas por versão; reservar capacidade V1 e interromper carga V2 ao atingir limites homologados. Definir limiares e RTO antes da promoção, medir o ciclo completo sem prometer tempo zero.

## 6. Runbook de cutover e recuperação (a implementar e ensaiar)

### Preparação / freeze V1

1. Confirmar SHA/deployment V1 ativo, caminho de retorno, contrato de dados e autores de escrita; salvar manifesto de release e blueprint do cenário único com revisão/hash.
2. Inventariar roteamento, filas, retries, handlers, respostas webhook e configurações por nome; validar capacidades reais de trava, idempotência, auditoria, backup e restauração.
3. Preparar V1 preservada e V2 modular no cenário único, com V2 desabilitada por padrão. Testar o caminho V1 e mudanças comuns; arquivar blueprint V1 como recuperação de desastre sem manter outro cenário ativo.
4. Definir responsável, aprovador, RTO e limiares numéricos de abortar/retornar; comprovar acesso ao controle mesmo com V2 indisponível. Se não houver homologação isolada, usar janela aprovada com ingresso suspenso, drenagem e dados de teste sem escrita oficial; não improvisar teste em tráfego real.

### Promoção V1 → V2

1. Confirmar gates, integridade da base, backup recuperável e compatibilidade de ambos os artefatos com o cenário compartilhado. Executar teste autenticado de login, foto, processamento, revisão humana e impressão.
2. Validar V2 em diagnóstico sem gravação oficial; comprovar resposta única, erro/timeout SHADOW inofensivos à V1 e proteção contra duplicações.
3. Registrar aprovação e manifesto da troca (artefatos, blueprint, revisão, IDs em voo, métricas e backup). Serializar mudanças administrativas; rejeitar revisão de configuração obsoleta.
4. Suspender novas admissões durante troca não atômica e drenar requisições antigas. Atualizar roteamento de aplicação e decisão de pipeline como par compatível; usar revisão única se o mecanismo permitir, ou manter suspensão até ambos estarem consistentes. Não confiar apenas em flag do frontend ou propagação de domínio/cache.
5. Habilitar V2 e selecionar `active_version=v2`; confirmar leitura da revisão efetiva, executar smoke test controlado e reabrir ingresso. Escrita oficial somente após gates e aprovação humana, com proveniência V2. Monitorar pelos limiares aprovados.

### Rollback rápido V2 → V1

1. Operador autorizado aciona `v2_enabled=false`; bloquear novas admissões/gravações V2, preservar requisições e tentativas pendentes para reconciliação. Não desligar o cenário inteiro como mecanismo normal de rollback.
2. Drenar/quarentenar execuções em andamento conforme política; apurar commits de resultado incerto antes de replay. Registros confirmados V2 permanecem na base.
3. Selecionar `active_version=v1` e o artefato V1 previamente testado, usando a mesma disciplina de revisão/suspensão da promoção. **Não recriar cenário, trocar segredos ou recompilar branch arbitrária.** Confirmar filtros e contrato V1 no cenário compartilhado.
4. Verificar login, foto, resposta webhook única, revisão/impressão, leitura dos dados V2 e gravação identificada V1 sem duplicação. Reabrir ingresso e registrar tempo real de recuperação e integridade.
5. Se o cenário comum estiver corrompido, suspender ingresso e restaurar blueprint compatível previamente validado no mesmo cenário, verificando conexões e filas. É recuperação de desastre, com RTO próprio; não prometer que o kill switch resolve falha da infraestrutura comum.

### Roll-forward V1 → V2

Corrigir e homologar a causa, confirmar artefato e blueprint V2, reconciliar pendências sem repetir eventos e validar registros escritos por V1 durante o retorno. Repetir aprovação, troca controlada e smoke tests da promoção. Preservar todos os dados anteriores e a trilha do incidente.

## 7. Exclusão crítica por versão e período — procedimento separado

Não existe autorização de exclusão nesta etapa nem se presume ferramenta pronta. Preferir quarentena/tombstone reversível; remoção física exige justificativa e aprovação específicas, compatíveis com retenção e integridade.

1. **Escopo fechado:** indicar ambiente/base/tabelas, versão geradora exata, campo temporal e intervalo `[início, fim)` com timezone explícito convertido para UTC. O padrão proposto é `created_at` confiável, não data do sorteio ou `updated_at`; outro critério exige nova especificação e aprovação. Rejeitar versão vazia, curinga, período aberto/invertido, timestamps ausentes/ambíguos e `unknown/legacy`.
2. **Seleção conjunta:** versão **E** intervalo **E** escopo; nunca `OR`. Selecionar por proveniência imutável do registro, não versão ativa nem última edição. Eventos compartilhados, referências cruzadas, revisões de outra versão ou origem duvidosa bloqueiam exclusão automática e exigem plano próprio. Proibir cascade que remova dados de outra versão.
3. **Dry-run obrigatório:** produzir manifesto protegido com IDs exatos, revisões/hashes, contagens por tabela/versão, dependências e impactos estatísticos; incluir controles negativos comprovando zero candidatos V1/legados ao selecionar V2 (e vice-versa). Não expor dados pessoais no relatório público.
4. **Backup e integridade:** snapshot/export consistente dos candidatos e vínculos necessários, criptografado e com acesso/retenção restritos; validar checksum e ensaiar restauração seletiva sem sobrescrever registros novos. Registrar contagens e invariantes antes da operação.
5. **Aprovação forte:** solicitante e aprovador autorizado distinto, autenticação reforçada, confirmação explícita do ambiente, versão, datas, quantidade, motivo e hash do manifesto, com validade curta. Nenhuma aprovação genérica de rollback ou desta documentação autoriza expurgo.
6. **Execução protegida:** credencial administrativa de privilégio mínimo, bloqueio de escritores relevantes ou isolamento comprovado, limites de lote e teto total aprovados. Revalidar versões, hashes e dependências imediatamente antes da mutação; qualquer desvio invalida o manifesto e exige novo dry-run/aprovação. Executar somente IDs aprovados com predicado de versão/período novamente aplicado, não uma consulta aberta recalculada.
7. **Verificação e recuperação:** registrar cada resultado de lote e estado parcial; interromper diante de divergência. Comparar contagens, integridade referencial, agregados e controles de dados fora do escopo, especialmente da outra versão. Reconstruir derivados somente por plano validado. Usar restauração seletiva se necessário, preservando escritas posteriores.
8. **Auditoria independente do conjunto excluído:** guardar quem solicitou/aprovou/executou, motivo, IDs, período, versão, manifesto/hash, backup, resultado e evidência pós-operação. Não apagar a trilha junto com os registros. Um novo ciclo ou ampliação de escopo exige novo manifesto e aprovação.

## 8. Critérios de aceite e próximo passo

Antes de promoção operacional (esta documentação não autoriza merge/deploy):

- V1 e V2 identificadas, recuperáveis, com contratos e artefatos comprovados.
- Cenário único inventariado; filtros exclusivos, resposta única, isolamento lógico de erros e kill switch testados, inclusive em concorrência e exaustão de recursos.
- Gestão de segredos compartilhados auditada; rotação compatível com ambas.
- Base única preservada, todas as escritas identificadas, leitura/escrita V1 compatíveis e backfill `unknown/legacy` validado sem inferência fictícia.
- Backup/restore e ensaio de exclusão em dados de teste comprovam ausência de apagamento cruzado; nenhuma exclusão real é requisito para promover.
- Ciclo completo V1 → V2 → V1 → V2 com evidências de continuidade, idempotência, integridade e RTO medido; aprovação explícita do usuário.

**Próximo passo:** detalhar base comum e controle de versão a partir do [inventário realizado](RLT_ARCH_V1_V2_INVENTORY_20261009.md), completando a verificação de filas, autenticação, escritores externos e recuperação. Especificar mecanismo concreto de roteamento, controle de escrita e ensaio antes da implementação. Até lá, manter PR #41 sem merge e nenhuma alteração em produção.
