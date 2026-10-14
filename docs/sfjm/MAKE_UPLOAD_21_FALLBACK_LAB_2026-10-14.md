# SFJM — Gate de LAB para falha no upload Gemini (14/10/2026)

**Estado:** teste isolado aprovado para a semântica de `Resume`; **correção real ainda não implementada**. Main de partida `3d91a6d372db5125a429b6092854500b3b3c3189`. Referência operacional anterior: `docs/sfjm/MAKE_OCR_SFJM_BASELINE_2026-10-14.md`.

## Objetivo e restrições

O cenário **Roleta 6549955** encontra-se ativo. O módulo 21 de upload Gemini utiliza conexão 11711372, e não tem handler de erro. Falha HTTP 402 em 21 abortou a rota principal antes do 19 e 27; o OCR.space 26 continuou independente, mas sem resposta ao app. **Não alterar cenário produtivo sem prova de entrega HTTP ao operador e aprovação de promoção.**

## Inventário do ambiente isolado criado

- Cenário Make **6637329**: `LAB Roleta · upload 21 falha → resposta de contingência · 2026-10-14`.
- Tipo **on-demand**, sem conexão externa, sem foto, sem escrita em Supabase, sem registrar dados estatísticos.
- Entradas: `fixture` (string).
- Saídas: `result` e `source` (strings).
- Módulos: 1 `scenario-service:StartSubscenario` → 2 `builtin:ThrowError` (falha simulada) → 4 `scenario-service:ReturnData`; handler do 2 = 3 `builtin:Resume` que substitui `result={{1.fixture}}` e `source=ocr-space-lab-mock`.
- Simulação de falha: mensagem `LAB: simular falha HTTP 402 no upload Gemini 21`.
- Execução Make `1ca0dd8d2d2744e1b2f0ebb948d619a8`, 14/10/2026 às 22:07:11Z (19:07:11 BRT), **success**, 230 ms, 1 crédito, saída `source=ocr-space-lab-mock`; resultado retornado preservou JSON sintético marcado `LAB-SEM-FOTO`.
- **Cenário LAB desativado** após a prova; produtivo 6549955 não foi modificado.

## O que esse teste comprova e o que não comprova

- Comprova que um handler com `Resume` pode substituir os campos de um módulo que falhou, permitindo alcançar `ReturnData` em um cenário controlado.
- **Não comprova** autenticação OCR.space, envio de foto, `Upload a File` real, recuperação de falha 402/429/503 real, fluxo 21→19→13, saída JSON OCR.space com `ParsedResults`, integração com `api/roleta-ocr.js` nem revisão humana.
- Atenção: simplesmente acoplar 30→31→32→`Resume` ao **21** e enviar `result` **não** resolve o caso real: após 21 o módulo **19 ainda exige `21.uri` e `21.mimeType`**, que não existem quando o upload falha. Não simular `uri` falsa para mascarar erro.

## Decisão de projeto que precisa de prova no próximo gate

Separar a resposta ao cliente da dependência do URI do Gemini. Alternativas a validar isoladamente:

1. Inserir bifurcação **após 21** usando marcador inequívoco de fallback produzido por handler de 21, com uma rota que **não chama 19** e retorna envelope OCR.space, e outra que segue com 19/27. Verificar compatibilidade dos campos de saída do `Resume` com condições do Make e existência de **uma** resposta HTTP por execução.
2. Extrair OCR.space como serviço de contingência no backend Vercel, apenas se a opção anterior não puder garantir resposta/timeout; exige credencial segura e testes de integração.
3. Não usar `Break` como substituto quando cliente espera resposta síncrona, porque retry assíncrono não entrega a leitura ao telefone no tempo da solicitação.

Em ambas as alternativas, preservar prioridade **Gemini 3.8 → Gemini 3.6 → OCR.space**, identificação explícita da origem, JSON validado, revisão humana e limite global de 175 s da API Vercel. Não promover sem testes de erro no 21, 19, 27 e 30; inspeção da resposta HTTP; comparação de resultados; e autorização explícita.

## Próxima ação segura

Montar LAB com foto sintética não pessoal e conector Gemini/OCR.space em cenário isolado, testar bifurcação com **resultado real até o ReturnData/WebhookRespond** sem utilizar produção; registrar todos os módulos executados e confirmar que 21 falho nunca força 19 a consumir `uri` inexistente. Se provado, preparar plano de rollback e aprovação antes de mudar 6549955.


## Segundo LAB — 14/10/2026

Cenário Make 6637419 criado com seis módulos: inicializador, erro sintético, chamada HTTP OCR.space, serialização JSON, Resume e retorno. A configuração foi aceita pelo Make e a conexão OCR.space existente foi referenciada. Duas tentativas de enviar imagem de teste foram recusadas pela ferramenta antes de alcançar o Make. Conferência do histórico: zero execuções. LAB desativado após conferência. Resultado real OCR.space: **não testado**. O cenário produtivo 6549955 não foi alterado. Próximo passo: executar o LAB com uma imagem sintética pela interface Make e verificar o resultado HTTP e os módulos, antes de considerar promoção.


## Testes com imagem real no LAB de upload direto (14/10)

Cenário LAB **6637476**, ativo e isolado, recebeu três requisições em 14/10 às 22:36:59, 22:38:55 e 22:40:20 UTC (19h36/38/40 BRT). IDs de execução `596ddc9d4b7440b1b91d74f1d6057598`, `66c18fb0c8994c209a89077abec871d3`, `0ea55ae8486c473f9e1624a8e02ffbb7`. Em todos os casos, módulo 1 recebeu `roleta_whatsapp.jpeg` (264883 bytes), módulo 2 acionou o erro artificial e módulo 3 tentou chamar OCR.space. Resultado: **ModuleTimeoutError em 40 segundos** em todas as chamadas OCR.space; módulos 4/5/6 não executaram. Não houve retorno válido nem aprovação do fallback. Nunca copiar imagem/IMTBuffer para o GitHub.

Após conferir logs e parâmetros, o timeout do **módulo 3 apenas no LAB 6637476** foi ampliado de `40` para `90` segundos via `scenario_patch`, com sucesso; versão do cenário de 14/10/2026 22:41:45Z, confirmada por nova leitura. Não se alterou engine=3, language=auto, isTable=true, scale=true, isOverlayRequired=true, conexão OCR.space ou produção Make 6549955. O LAB segue **ativo para reteste**. Um teste após o ajuste ainda é necessário; maior timeout não comprova disponibilidade do provedor. Limites síncronos do produto (175s backend) continuam inalterados.


## Reteste com fotografia — validado no navegador

Execução LAB 6637476: e106b1250dad4eb0b1f2f082b7b958d4, status success, duração 17,204 segundos. Operador forneceu resposta completa no navegador. Parser JSON independente confirmou `source=ocr-space`, `OCRExitCode=1`, `IsErroredOnProcessing=false`, 163 linhas de overlay e tempo OCR de 16,150 segundos. Resposta HTTP e transporte aprovados no LAB; nomes e data continuam sujeitos a revisão humana. O upload Gemini real e a bifurcação de produção ainda não foram testados, e a produção 6549955 permaneceu intocada.


## Gate de integração: upload real com bifurcação exclusiva — preparado para prova

Em 14/10/2026 foi criado o novo LAB Make **6637766** (webhook exclusivo, não registrar URL/segredo no GitHub). Fluxo: webhook 1 → GET CSV oficial 23 → upload Gemini 21. O handler **40 Resume** substitui os campos do upload falho por `uri=RLT_OCR_UPLOAD_FAILED`, `mimeType=application/x-roleta-fallback`. Em seguida, **41 BasicIfElse** seleciona exatamente uma rota: **índice 0** quando `21.uri` é o marcador → **30 OCR.space** (timeout 90s), **31 TransformToJSON**, **42 WebhookRespond** (envelope `{source:'ocr-space',ocr:...}`); **índice 1** caso contrário → **19 Gemini 3.8**, error handler **27 Gemini 3.6**, fallback **50 OCR.space**, serialização **51**, Resume **52**, Resume Gemini **29**, resposta **13**. Os módulos 19/27/50/51/52/29 mantêm lógica do baseline, com fallback OCR do LAB em 90s. Nenhuma rota de fallback do upload chama Gemini 19.

O cenário foi **salvo sem erros de configuração** com a conexão Gemini existente 11711372 e OCR.space 11569872 nos HTTPs; não se expõem segredos. Inicialmente a ativação falhou por limite de cenários ativos do Make; o LAB anterior **6637476 foi desativado** para abrir vaga e o novo LAB **6637766 foi ativado** com sucesso. Estado confirmado: **Roleta produção 6549955 ativo**, novo LAB **6637766 ativo**. Página HTML local de teste usa webhook exclusivo e campo de arquivo `file`; não publicar a página, URL do webhook, foto ou resposta bruta no repositório.

**Pendências de validação:** ainda não houve execução do LAB 6637766 com foto; não está provado que o `Resume` do 21 substitua corretamente `uri`/`mimeType` em falha real nem que a condição `BasicIfElse` roteie corretamente. Testar upload Gemini normal, indução controlada de falha no 21 e retorno OCR sem executar o 19; verificar HTTP ao navegador, envelopamento para o front-end e tempos totais. Não promover para o Make de produção sem evidências e autorização de gate.
