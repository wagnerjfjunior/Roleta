# OCR.space como terceira opção — 13/10/2026

## Decisão e diagnóstico

Operador autorizou Gemini 3.8 → Gemini 3.6 → OCR.space, sem Gemini interpretar o terceiro retorno. Base main `34cde4ee1474be3bdcc5a98c7046210d6e17a981` (UX publicada na PR #109, deployment `dpl_EAXPYDCvZCCSy9WEZXuGfjv3eKAo` READY).

Cenário 6549955: execução `665b6c17b77f4140a84e7ebd04e6068f`, 11h38 de 13/10 (São Paulo), módulos 19/27 com 503. OCR 26 não executou. A configuração lida estava sem Resume após 27; leitura bem-sucedida do fallback também não tinha continuidade garantida para Webhook Response 13. Erro foi confirmado no Make; exportações output null não o mostravam.

## Contrato e salvaguardas

Make retorna JSON `{ "source": "ocr-space", "ocr": <resposta> }`. Serialização usa `json:TransformToJSON`; `toString(collection)` retornou `{object}` no primeiro LAB e foi corrigido antes de produção.

`server/ocr-space-draft.cjs` associa campos por coordenadas/cabeçalho e índices efetivamente lidos; tenta tabela delimitada explícita e, por último, fragmentos com posição/bolinha null. Nunca usa índice do array, cadastro ou sequência esperada para completar números. Todos os campos conservam confiança baixa; cabeçalho/share/quantidades ficam pendentes.

Limites: uma página, 50.000 caracteres, 5.000 palavras de overlay, 100 linhas. Erros, saídas parciais e texto vazio são rejeitados. HTML lido é escapado nos campos e exibido por textContent no texto original.

Relay mantém Google assinado/allowlist, CSRF, mesma origem, limite da foto e prazo 175 s. Source `make-ocr-space`, status `PENDENTE_REVISAO`; não aprova nem grava. UI identifica alternativa, não presume TARDE e permite adicionar participantes ausentes. Linhas adicionadas começam pendentes; edições invalidam checks; revisão canônica obrigatória. Nenhuma alteração de banco, segurança ou WEEKLY_FROZEN.

## Evidência isolada

LAB 6610742 recebeu folha fictícia `tests/fixtures/ocr-space-synthetic-table.png`. Dois Gemini usam arquivo inexistente apenas no LAB. Fluxo: 2 → erro/4 → erro/6 OCR → 8 JSON → 7 Resume de 4 → 5 Resume de 2 → 3 ReturnData.

Execução `098ae1e1ea99487db207fa5bebda4f75`: success em 4.726 ms, modelo `ocr-space`, JSON válido. Parser/relay recuperam 1 Arnon/03, 2 Paola/01, 3 Wagner/02. Resposta real fictícia preservada em fixture. LAB desativado após teste. 247 testes locais passaram, incluindo autorização, limites, ambiguidades, duplicidades, texto malicioso e o retorno real do LAB.

Isso não é benchmark de manuscritos; fotos reais podem exigir correções extensas. Soma de chamadas lentas pode exceder 175 s; não se aumentou o prazo nem se criou persistência assíncrona.

## Implantação

Publicar backend compatível primeiro. Depois acrescentar Resume após 27 e handler OCR do 27, com serialização JSON e Resume do OCR para 27. Preservar shadow 26. Verificar cenário ativo/referências/retorno. Não injetar erros na produção nem gravar roleta fictícia. Primeiro envio real após ativação depende da observação do operador.
