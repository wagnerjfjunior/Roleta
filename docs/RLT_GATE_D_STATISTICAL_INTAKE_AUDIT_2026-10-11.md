# RLT Gate D — Auditoria de foto, conferência humana, impressão e base estatística

Data: 2026-10-11. Estado: correção do carregador estatístico + testes de regressão. Nenhum banco, backfill ou controle de impressão foi alterado.

## Fluxos encontrados no código (as-is)

- `roulette-intake.js`: recebe JSON `rlt-print-v2` (Skill/Gemini/arquivo), valida estrutura, exige conferência humana, prepara PDF, permite imprimir/salvar PDF e compartilhar JPG. **Não há chamada para incluir o evento na base histórica** nesses botões. A captura da folha pode ocorrer mais tarde.
- `app.js`: carrega `data/manifest.json`, busca arquivos CSV, normaliza os eventos e renderiza a estatística. Estado da base em repositório GitHub, não persistência automática via botão de impressão.
- `data/manifest.json`: contagem declarada de 86 eventos, 82 qualidade A / 4 qualidade B, distribuídos entre baseline e entradas datadas. Na inspeção pontual não havia IDs duplicados.
- O código anterior fazia `byId.set(e.id,e)` para todo arquivo; qualquer duplicidade com dados divergentes sobrescreveria **silenciosamente** o evento anterior no navegador. Isso prejudicaria a rastreabilidade, mesmo sem alterar diretamente os arquivos Git.

## Proteções realizadas

- O carregamento agora usa `domain/canonical-dataset.js`, com auditoria por fonte, contagem do manifesto, total de qualidade, integridade das posições físicas e detecção de ID duplicado.
- Duplicidade **idêntica** no carregamento é idempotente; duplicidade **divergente** é rejeitada com erro explícito, sem escolher arbitrariamente a última versão.
- O carregador nunca altera `Data` do sorteio segundo a data do upload. Uma entrada D+1 conserva a data do evento original.
- É erro operacional bloquear um PDF porque ainda não existe foto histórica; impressão/compartilhamento não acionam persistência estatística. O código operacional existente foi preservado.
- O pipeline de **gravação automática auditável** da foto na base Git **ainda não existe neste caminho**. Não foi inventado um endpoint nem uma credencial com acesso de escrita.

## Critérios ainda pendentes para salvar/retificar estatística diretamente no app

1. Autorizar um backend de ingestão versionada, autenticada e com evidência de revisão humana, independente do gerador PDF.
2. Determinar identificador estável do evento e estratégia explícita de colisão entre IDs legados (`P01` etc.) e novas datas/períodos; não tratar apenas data de importação como chave.
3. Prever controle idempotente de submissão, revisão com motivo/autoria/versão, concorrência e rollback auditável sem apagar o original.
4. Ao receber imagem em D+1, conservar data/período do sorteio e registrar horário distinto de ingestão e validação; resultado só entra na amostragem após conferência humana.
5. Diferenciar posição física original, posição efetiva compactada, bolinha sorteada e ordem final; respeitar lacunas da folha real.
6. Acrescentar controles de publicação para que `manifest.json` e os CSVs sejam atualizados em transação lógica versionada, com CI de contagem e não duplicação, e sem integração automática com F2-12 prospectivo.

**Gate:** nenhuma gravação estatística nova ou ativação prospectiva foi realizada. As proteções atuais se aplicam à **leitura** de dados canônicos, não substituem a necessidade de implementar uma via de persistência com sua autorização própria.
