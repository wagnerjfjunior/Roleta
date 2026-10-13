## Complemento — OCR com coordenadas só nos cabeçalhos

Na execução `b156fbb40e0143d0a97c0708d80c33d9` (13:16 de São Paulo), o OCR.space retornou apenas oito entradas de overlay, todas no cabeçalho. O texto continha a coluna Corretor com posições explícitas 1–31, seguida pela coluna de bolinhas incompleta e pelas colunas Gerente/Diretor. O parser v3 recupera exclusivamente a coluna de corretores delimitada pelos cabeçalhos, exigindo posições explícitas, únicas e crescentes. Mantém linhas impressas sem nome para revisão e todas as bolinhas vazias; não associa números por sequência. A interface explica a recuperação parcial. Regressão com estrutura real anonimizada adicionada; os testes de geometria anteriores continuam obrigatórios.

## Correção da leitura OCR.space — 13/10/2026

A execução real `2b9a48b0f2fa41f0a1d38ec342f595f6` acionou OCR.space, mas a revisão ficou inutilizável. O cabeçalho Corretor começava sobre a coluna dos índices; o parser comparava o centro do índice com a borda esquerda do cabeçalho e descartava todas as âncoras. O fallback de texto livre criou linhas para gerentes e diretor.

A correção usa coordenadas para separar colunas, mantém a ordem física na revisão e permite linha com bolinha lida e posição ilegível sem completar a sequência. Texto sem estrutura abre uma linha vazia para preenchimento humano, preservando a foto e o texto bruto. Cores claras e rótulos explícitos substituem os estados escuros na tela Simples. Nenhuma linha é aprovada automaticamente.

Validação: geometria real reduzida e anonimizada como regressão, resposta sintética anterior e todas as verificações Node do workflow Gemini. Isso não comprova a exatidão da caligrafia nem substitui uma nova conferência da folha pelo operador. Make não foi alterado nesta correção.

# OCR.space como terceira opção — 13/10/2026

**Estado atual: backend publicado e terceiro fallback ativo.** PR #110, main funcional `83004c8729968f86002a48d5dbcb0e3eedee004a`, deployment `dpl_DwmFiumd1R4yQAqtDqTCYR6TeJJD` READY. Make 6549955 ativo, lastEdit `2026-10-13T15:47:52.174Z`. A seção de implantação abaixo registra a ordem utilizada; não é uma pendência de ativação.

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

## Estado final verificado

- Código: 247 testes locais e 6 checks GitHub de segurança/regressão aprovados; parser incluído no CI Gemini intake safety.
- Make: 19 → erro/27 → erro/30 OCR.space com overlay → 31 TransformToJSON → 32 Resume de 27 → 29 Resume de 19 → 13 Webhook Response. Resumo direto do 3.6: 27 → 29 → 13. Rota shadow 26 preservada, sem integração à base final.
- Módulos 30/31/32 verificados após salvamento, reaproveitando a conexão OCR.space existente. O destino do upload e a chave permanecem no Make; nada foi exposto ao navegador.
- Produção: UI publicada idêntica à main; endpoint OCR carregou o novo parser e recusou POST anônimo com 401. Nenhuma foto foi enviada ao Make por essa verificação de autenticação.
- LAB 6610742 desativado após o teste para liberar vaga.
- Próxima ação operacional: operador enviar uma fotografia real, conferir identificação da alternativa quando os Gemini falharem e revisar campos/participantes. Não se induziram falhas nos Gemini de produção nem se gravou evento fictício.

Rollback: reverter a PR #110 exige antes desconectar o handler OCR do 27 (30/31/32), pois o backend antigo não aceita o envelope. Manter Resume 29 para preservar retorno do 3.6. Só depois reverter o código. Remover/alterar a rota shadow não faz parte desta entrega.
