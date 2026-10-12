# Retorno OCR: prazo compatível com leituras lentas

## Evidência antes da alteração

O operador confirmou funcionamento no próprio telefone e desktop e relatou timeout no teste pelo telefone da Sabrina. No cenário Make 6549955, execução `587c3195a6eb4998a56d1bd3934de45f`, o webhook começou às 19:58:19 BRT de 12/10/2026. Upload terminou às 19:58:20; Gemini concluiu às 20:00:42 e Webhook Response executou em seguida, cerca de 143,8 segundos após o início. O cenário terminou com sucesso em 148,2 segundos, sem erro em nenhum módulo. O ramo OCR.space terminou depois do Webhook Response e não bloqueou essa resposta. O log não identifica por si só o dispositivo do operador.

O relay `/api/roleta-ocr` abortava a chamada ao Make após 55 segundos. Portanto uma resposta disponível após 143,8 segundos não poderia chegar por essa requisição ao app, apesar do sucesso posterior no Make. Nenhuma falha de compressão foi observada nessa execução.

## Correção e limites

- Espera pelo Make: 175 segundos, com margem para o limite documentado de 180 segundos do Webhook Response (https://apps.make.com/gateway). O prazo cobre também a leitura do corpo da resposta, não só a chegada dos headers.
- `vercel.json`: `maxDuration=200` apenas para `api/roleta-ocr.js`, conforme configuração oficial para Node (https://vercel.com/docs/functions/configuring-functions/duration).
- Cliente: limite explícito de 210 segundos para upload + processamento + resposta; erro próprio se a conexão do navegador encerrar a espera.
- Interface informa até três minutos de processamento e pede manter a página aberta. O progresso de processamento continua indeterminado, sem percentuais inventados.
- Sem retry automático ou nova execução do Make por timeout. A execução original pode continuar no Make depois de encerrada a conexão; o erro esclarece que não houve retorno ao app.

Não foi alterado o cenário Make, modelo/prompt, compressão, conferência, impressão, ledger, ACL ou banco. Uma conexão perdida, app fechado ou execução além da janela síncrona continua exigindo recuperação/reteste; esta alteração não implementa fila assíncrona ou recuperação automática de resultados antigos.

## Validação

Teste com relógio virtual: resposta após 143 segundos chega ao handler; leitura após 190 segundos interrompe com 504; corpo tardio também respeita a janela. Configuração Vercel precisa superar o prazo do relay. Suite Gemini Intake inclui esse teste. Próxima validação real: reenviar no telefone da Sabrina mantendo a página aberta, observar resposta e conferir a tabela. Não afirmar retorno real nesse aparelho antes desse teste.
