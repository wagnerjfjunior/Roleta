# SFJM — Roleta / baseline Make OCR recuperada em 14/10/2026

**Status:** documentação auditada; sem modificação de módulos Make, Supabase, Vercel, dicionário ou estatísticas. **LOCAL-FIRST / NO PREVIEW / Live Sync**. Repo `wagnerjfjunior/Roleta`; referência da main no início `1b9baff7a7c34c49f33432c5b8432838c42abeac`.

**Fontes:** cenário ativo Make `6549955` na zona `us2.make.com` conferido com `scenario_get` e `scenario_module_get`; blueprint fornecido `Roleta.blueprint (12).json`; saídas fornecidas `module-13-execution (3).json` e `module-26-execution (2).json`; execução Make `8bd9ee49b47f4f70bf7ffab8e21c02e6`. Arquivos brutos, fotos e bytes não são publicados aqui.

## 1. Incidente e recuperação

- Em 14/10 ocorreram três falhas HTTP **402 (prepayment credits depleted)** no **upload Gemini módulo 21**, antes do Gemini 3.8 e dos handlers: execuções `9e5d131e208543e1a96dbf1bb4054236`, `9b123344cf824389be5041649375df3b`, `4ac4d28b0bd042bf89e513a8e3907d5d`. **Não foi timeout**.
- Operador cadastrou uma nova chave no projeto Google AI Studio Free Tier e configurou uma **conexão nativa Google Gemini AI** no Make, não uma keychain HTTP genérica.
- Conexão **atual** Gemini: `OCR-Roleta-Make-Gemini`, ID **11711372**, tipo `gemini-ai-q9zyjp`, usada por **21, 19, 27**, status `ok`. Anterior: `Gemini_417478640836`, ID `5125735`. Não registrar valor da chave.
- Conexão OCR.space existente: ID **11569872**, `Roleta-ocr.space-API-Key-connection`, tipo `http-v4-apikey`, status `ok`.
- Make editado em `2026-10-14T21:22:46.553Z`. Execução manual de `2026-10-14T21:24:01.835Z` (**18h24 BRT**), ID `8bd9ee49b47f4f70bf7ffab8e21c02e6`, **SUCCESS**, 13.731 ms, 6 operações. Módulos **1→23→21→19→13**, mais **26** da rota paralela; nenhum erro. **Não testou 27/30/31/32/29, nem comprova revisão/geração de PDF no app.**

## 2. Topologia do cenário

```text
1 gateway:CustomWebHook
└─ 24 builtin:BasicRouter (duas rotas fan-out, NÃO é if/else)
   ├─ rota principal: 23 GET CSV → 21 Gemini Upload → 19 Gemini 3.8 → 13 WebhookRespond
   │                                             └─ erro 19 → 27 Gemini 3.6 → 29 Resume → 13
   │                                                                         └─ erro 27 → 30 OCR.space → 31 JSON
   │                                                                                                     → 32 Resume → 29 → 13
   └─ rota paralela: 26 OCR.space shadow (NÃO envia Webhook Response ao app)
```

**Falha pendente:** erro no **21** precede handler de **19**; se upload Gemini falhar, OCR.space 26 pode processar a imagem, mas a resposta da rota principal não chega ao cliente. Testar correção em LAB isolado, não alterar produção sem autorização.

## 3. Inventário completo de módulos e variáveis

| ID | Módulo e campos | Configuração efetiva / mapa |
|---|---|---|
| **1** | `gateway:CustomWebHook` | `hook=1003384`; `maxResults=1`; interface `file.name` texto, `file.mime` texto, `file.data` buffer e `file.files[]` com `name/mime/data`; não publicar URL secreta |
| **24** | `builtin:BasicRouter` | Rota 0 filtro nome `Gemini`, `conditions=[]`; rota 1 sem filtro; executa ambas |
| **23** | `http:MakeRequest` cadastro | `url=https://raw.githubusercontent.com/wagnerjfjunior/Roleta/refs/heads/main/data/brokers-official.csv`; `method=get`; `timeout=40`; `authenticationType=noAuth`; `parseResponse=true`; `allowRedirects=true`; `stopOnHttpError=true`; `shareCookies=false`; `requestCompressedContent=true`. Saída `23.data` |
| **21** | `gemini-ai:uploadAFile` | `__IMTCONN__=11711372`; `file_name={{1.file.name}}`; `file_data={{1.file.data}}`; `useFileSearchStore=false`; saídas `21.uri`, `21.mimeType`; timeout não explícito no mapper |
| **19** | `gemini-ai:createACompletionGeminiPro` | `__IMTCONN__=11711372`; `model=gemini-3.8-flash`; `contents[0].role=user`; arquivo `file_uri={{21.uri}}`, `mime_type={{21.mimeType}}`; `parts[1].text=prompt visual`; `parts[2].text={{23.data}}`; `generationConfig.maxOutputTokens="15000"`, `thinkingConfig.thinking_level=low`, `mediaResolution=media_resolution_high`, `responseMimeType=application/json`, `responseModalities=[text]`, `imageConfig={}`, `system_instruction={}`; saída `19.result` |
| **27** | `gemini-ai:createACompletionGeminiPro` fallback | Handler de erro de 19; `__IMTCONN__=11711372`; `model=gemini-3.6-flash`; mesmo `21.uri/mimeType`, mesmo prompt, mesmo `23.data`; `maxOutputTokens=15000`, `thinking_level=low`, `mediaResolution=media_resolution_high`, `responseMimeType=application/json`, `responseModalities=[text]`; saídas `27.result/candidates/responseId/modelVersion/usageMetadata`; timeout não explícito |
| **29** | `builtin:Resume` | `result={{27.result}}`; `candidates={{27.candidates}}`; `responseId={{27.responseId}}`; `modelVersion={{27.modelVersion}}`; `usageMetadata={{27.usageMetadata}}`; retoma fluxo, não responde diretamente |
| **30** | `http:MakeRequest` fallback OCR.space | `url=https://api.ocr.space/parse/image`; `method=post`; `timeout=40`; `contentType=multipart`; `authenticationType=apiKeyConnection`; `apiKeyAccount=11569872`; `parseResponse=true`; `allowRedirects=true`; `stopOnHttpError=true`; `shareCookies=false`; `requestCompressedContent=true`. `multipartBodyContent`: `file.data={{1.file.data}}`, `file.fileName={{1.file.name}}`; `OCREngine=3`, `language=auto`, `isTable=true`, `scale=true`, `isOverlayRequired=true`. Saída `30.data` |
| **31** | `json:TransformToJSON` | `object={{30.data}}` → `31.json` |
| **32** | `builtin:Resume` | `result={"source":"ocr-space","ocr":{{31.json}}}`; `modelVersion=ocr-space` |
| **13** | `gateway:WebhookRespond` | `body={{19.result}}`, `status=200`, header `Content-Type: application/json; charset=utf-8`; o handler Resume pode fornecer resultado retomado. `output:null` em export terminal não significa falha |
| **26** | `http:MakeRequest` OCR.space shadow | `url=https://api.ocr.space/parse/image`; `method=post`; `timeout=40`; `contentType=multipart`; `authenticationType=apiKeyConnection`; `apiKeyAccount=11569872`; `parseResponse=true`; `allowRedirects=true`; `stopOnHttpError=true`; `shareCookies=false`; `requestCompressedContent=true`. Multipart: `file.data={{1.file.data}}`, `file.fileName={{1.file.name}}`, `OCREngine=3`, `language=auto`, `isTable=true`, `scale=true`. **Sem `isOverlayRequired`**; sem resposta HTTP própria |

### Prompt canônico em 19 e 27

Mesmo prompt de transcrição visual preliminar **RLT-PRINT-V2**. Fotografia prevalece para posições e bolinhas; CSV apenas auxilia grafia e CRECI. Distinção obrigatória entre **posição impressa** e **número sorteado**; não inferir `01/10/16` quando ambíguos; preservar rasuras e `null`; separar quantidade Tegra de `helbor_qtd_lida`; preservar nomes anotados sem sorteio; não inferir SALÃO/STAND-BY/ON-LINE; não inventar gerente, diretor, data, período nem identidades. Saída apenas JSON, confiança visual e dúvidas. Campos: `empreendimento`, `data`, `periodo`, `sorteio_empresa`, `quantidade_corretores`, `helbor_qtd_lida`, `linhas[]` com `posicao_impressa/nome_lido/numero_sorteado/gerente/diretor/confianca`, `inconsistencias[]`, `observacoes[]`. O texto literal integral está no mapper dos módulos 19/27 e no blueprint original; nenhuma variante deste resumo substitui aquele prompt.

## 4. Timeouts entre telefone e Make

| Componente | Valor real | Interpretação |
|---|---|---|
| Make cadastro CSV 23 | `40` segundos | Só request 23 |
| Make Gemini Upload 21 | não explícito | Conector controla execução |
| Make Gemini modelos 19/27 | não explícito | Conector controla execução |
| Make OCR.space 30/26 | `40` segundos cada | Não aumenta prazo de resposta total |
| Vercel `api/roleta-ocr.js` | `175000` ms | AbortController interrompe fetch Make após 175 s |
| Vercel `vercel.json` | `maxDuration=200` s | Função OCR |
| Frontend `gemini-draft-ui.js` | `XMLHttpRequest.timeout=210000` ms | Limite cliente |
| Make Webhook Response | 180 s | Janela síncrona documentada em `docs/sfjm/OCR_RETURN_TIMEOUT_2026-10-12.md` |

A cadeia 19→27→30 pode exceder orçamento global mesmo com timeout por requisição; não existe recuperação assíncrona automática implementada. O HTTP 402 em 21 ocorreu em menos de um segundo e não foi timeout.

## 5. Saídas fornecidas para 09/10/2026 TARDE — evidência não validada

**`module-13-execution (3).json`:** entrada de Webhook Response com status 200, Content-Type JSON e corpo Gemini estruturado; `output:null` no terminal. Folha identificada como ELO DUO / GARDEN / NOVA VIVERE, data `09.10.26`, TARDE, `quantidade_corretores=12`, `helbor_qtd_lida="11"`, empresa `TEGRA 1-3 HELBOR 2`. Há **17 linhas** nas posições 1–13, 15–17 e 32, com **12 números sorteados** e cinco nulos. Gemini sinalizou rasura na posição 1, linha 13 sem nome, linhas anotadas sem sorteio 15/16/17/32 e possível duplicidade do nome Paola entre 17 e 32. **Não tomar como verdade sem foto e conferência humana.**

**`module-26-execution (2).json`:** OCR.space paralelo status 200, `IsErroredOnProcessing=false`, `OCRExitCode=1`, `ProcessingTimeInMilliseconds="3890"`, `TextOverlay.HasOverlay=false`, `Lines=[]`, mensagem `Overlay not requested.`. Saída `ParsedText` é texto linear e colunas desacopladas, sem associação segura de bolinhas a nomes. Filename no input `IMG_1718-ocr.jpg`; binário IMTBuffer não versionado. Há grafias divergentes entre motores; são **candidatas**, não aliases confirmados. O módulo 26 não foi o mecanismo de resposta ao app no teste saudável.

## 6. Checklist de reprodução, segurança e próxima ação

1. Make **Credentials → Connections**: conferir conexão nativa Gemini `OCR-Roleta-Make-Gemini` ID `11711372` (não salvar segredo no GitHub); checar aplicação em 21/19/27.
2. Conferir chave independente OCR.space ID `11569872`, módulos 26/30; conferir `21.file_data/name`, `19.contents` e `13.body={{19.result}}`.
3. Execução funcional observada valida 21/19/13, mas não valida fallback nem tela do operador. Conferência humana permanece obrigatória.
4. Criar **LAB isolado** para erro no upload 21, indisponibilidade 19, falha 27 e erro OCR 30, validando resposta HTTP ao aplicativo. Não disparar falhas propositalmente no cenário ativo.
5. Só depois planejar handler para **21**, encaminhando foto original ao OCR.space; ramo shadow 26 sozinho não garante retorno. 
6. Dicionário Supabase, estatística, Roleta Simples, Sorteador e `WEEKLY_FROZEN` não foram alterados. Não treinar bolinhas nem associações nominais a partir das duas saídas não revisadas.
7. Conservar evidência de IDs e parâmetros **sem** API keys, URLs completas de webhook, fotografias, bytes, sessões ou dumps privados. Documento registra comportamento observado, não concede permissão de produção.

**Next Safe Action:** revisão da documentação e aprovação explícita da PR documental; correção funcional de handler e sincronização do dicionário são gates separados.
