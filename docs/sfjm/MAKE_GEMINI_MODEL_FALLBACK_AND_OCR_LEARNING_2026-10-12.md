> **TESTE FUNCIONAL CONCLUÍDO — 13/10/2026:** após o responsável liberar uma vaga, o LAB 6610742 foi ativado e a execução `4c6f7035f2704f2daa099d88f08a53fc` terminou com sucesso em 16.586 ms. A chamada 3.8 recebeu um URI de arquivo inexistente; o handler executou 3.6, Resume substituiu o resultado e ReturnData devolveu `model=gemini-3.6-flash` com JSON válido de 17 linhas. O teste demonstra erro de arquivo tratado; não simula especificamente 503 nem prova precisão OCR ou o Webhook HTTP do app. A resposta alternativa divergiu da leitura 3.8 anterior da mesma imagem na data (17/09/26 versus 15/09/26) e na contagem declarada (16 versus 17 linhas retornadas). Conferência humana continua indispensável. LAB desativado após o teste para liberar a vaga; produção 6549955 permanece ativa com handler 19→27→28. Os registros de bloqueio anteriores abaixo são históricos.

# Make: fallback Gemini 3.8 → 3.6 e proposta de aprendizado pós-OCR

## Alteração operacional aplicada

Cenário Roleta 6549955, equipe 19059 em us2.make.com. O responsável autorizou manter 3.8 principal e tentar 3.6 quando houver falha. A disponibilidade de `gemini-3.6-flash` foi confirmada na conexão existente antes da edição; especificações do módulo Gemini e Resume foram consultadas.

Estado anterior: webhook 1 → router 24 → CSV 23 → upload 21 → geração 19 (3.8) → Webhook Response 13; segunda rota chama OCR.space 26 após a primeira rota. Nenhum handler existia no módulo 19.

Estado ativo após a alteração, lastEdit `2026-10-13T02:14:39.412Z`:

- Módulo 19 continua `gemini-3.8-flash`.
- Novo módulo 27, `gemini-ai:createACompletionGeminiPro`, é o errorHandler do 19 e usa `gemini-3.6-flash`, mesma conexão, mesma foto já enviada pelo módulo 21, mesmo CSV e mesmo prompt.
- Novo módulo 28, `builtin:Resume`, fornece `result`, `modelVersion`, `responseId`, `usageMetadata` e `candidates` do 27 como saída substituta do 19.
- Módulo 13 continua respondendo uma vez com `{{19.result}}`; recebe o resultado original ou substituto. Nenhuma segunda resposta foi criada.
- Sem loop ou retry do 3.8. Há uma tentativa alternativa de modelo para qualquer erro recebido pelo módulo 19, inclusive 429/503. Não adicionamos filtro por código.
- Se o 3.6 também falhar, não há terceiro provedor operacional: o erro permanece visível. Falha anterior no upload 21 também não é resolvida por trocar o modelo 19.
- A segunda rota OCR.space 26 permanece experimental e não foi modificada. As rotas do router são sequenciais; OCR.space ainda não responde ao app nem constitui fallback homologado.

O mapper do novo módulo foi adequado ao esquema atual do Make: responseModalities `text`, maxOutputTokens numérico 15000, thinking low, media high e JSON. Não altera o prompt do principal. A configuração foi lida novamente após salvar e o cenário permanece ativo, sem problemas de configuração reportados.

## Evidência e limite de homologação

Foi preparado o laboratório isolado `6610742`, sob demanda, com um arquivo inexistente na chamada 3.8 para provocar erro e uma foto já usada no fluxo na chamada 3.6, seguido de Resume e ReturnData. Nenhuma falha foi injetada em produção. A ativação do laboratório foi recusada pelo Make: **Maximum number of active scenarios has been exceeded**. `scenario_run` recusou executar o laboratório inativo. Portanto o teste forçado não rodou; não declarar fallback efetivamente executado com sucesso antes de obter essa evidência. O laboratório está inativo e contém referência de arquivo Google com expiração; ao retomar, renovar essa referência com uma foto válida se necessário.

O handler entra somente depois que o 3.8 retorna erro. O módulo nativo não oferece um prazo próprio configurável e não foi substituído por HTTP. A janela síncrona do app segue em 175 s, com Make Webhook Response em 180 s; uma primeira chamada muito lenta pode consumir o tempo da segunda. Não afirmar que esta alteração resolve lentidão sem erro ou indisponibilidade geral do Google. Rollback pontual: retirar 27/28 conjuntamente em uma alteração atômica, preservando 19/13 e o restante do cenário.

## Proposta de aprendizado independente do OCR.space

Este desenho ainda não foi implementado. O aprendizado será no pós-processador JavaScript próprio, não no modelo remoto OCR.space. Já existe o dicionário de aliases confirmados `data/broker-name-aliases.json` e a recomposição conservadora `intake-normalization.js`; reaproveitar essas camadas.

1. **Identificar e capturar cada leitura.** Gerar `ocr_run_id` e hash da foto preparada. Conservar separadamente saída Gemini e modelo efetivo, saída OCR.space com texto original/coordenadas, template e versão do parser/dicionário. Habilitar overlay no OCR.space durante a implementação para permitir associação de palavras às colunas. A rota shadow pode enviar evidência por callback mesmo após a resposta ao app; não atrasar o retorno esperando os dois resultados.
2. **Parear com a revisão humana.** Associar nome OCR e nome oficial confirmado por posição física da mesma foto e campo (corretor/gerente/diretor), nunca pelo índice da ordem final nem por similaridade isolada. Quando a posição ou a associação for incerta, não criar uma regra automática. O Gemini oferece candidato; a versão conferida pelo operador oferece a referência. Não exigir nova conferência.
3. **Registrar exemplos antes de criar regras.** Um par como `sobrina → Sabrina` é um exemplo revisado. Registrar contexto, autoria, data, evento/versão e evidências; reenvio e reimpressão não aumentam suporte. Evidências repetidas devem vir de fotos independentes. Regras contraditórias permanecem contextuais/pendentes. Nunca substituir um nome exato válido do cadastro por um alias aprendido.
4. **Versionar e medir o dicionário.** Ativar regras conservadoras após consistência entre exemplos e teste em fotos separadas das usadas para construir o dicionário. Medir palavras/nomes corrigidos corretamente, intervenções e principalmente corretor × bolinha × posição física. Uma correção posterior da folha invalida ou revisa o exemplo anterior; preservar histórico e permitir rollback do dicionário. Não usar dicionário de nomes para inverter ou completar números sorteados.

O ledger final atual conserva o resultado validado, mas não o par completo de saídas brutas Gemini/OCR.space. A rota OCR.space não tem overlay ativo nem callback de evidência hoje. Esses são os próximos trabalhos, não capacidades já entregues. Usar armazenamento técnico privado separado dos eventos finais/prospectivos, sem alterar histórico ou WEEKLY_FROZEN. Gemini permanece principal até o benchmark demonstrar que OCR.space + pós-processador pode assumir mais leituras com qualidade e menor intervenção.
