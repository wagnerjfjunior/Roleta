# Normalização única de datas e recomposição conservadora de nomes

## Auditoria anterior à alteração

Em main `7ab86d4`, confirmado em produção, somente `gemini-review-bridge.js` normalizava ano de dois dígitos. O conversor inicial Gemini rejeitava a data e a importação canônica mantinha `12/10/26`, bloqueando acesso à conferência. O operador precisou completar o ano manualmente.

A reconciliação JavaScript existia em `reconciliation/identity.js`, mas não era carregada no fluxo de OCR. Seu método fuzzy mantinha candidatos pendentes de confirmação humana; essa política canônica anterior continua preservada. O conversor OCR resolvia somente nome exato e prefixo único, eventualmente com desempate por gerente. “sobrina” não era prefixo e ficava pendente.

## Implementação

`intake-normalization.js` usa o cálculo de distância já existente na reconciliação. Não adiciona serviço nem worker. Scripts compartilhados são carregados antes dos conversores em index.html; Node usa os mesmos módulos via require.

Datas: `DD/MM/AA`, `DD/MM/AAAA` e ISO `AAAA-MM-DD` usam uma função única, com calendário validado. Ano abreviado usa o século 2000; faixa operacional 2000–2099. Datas impossíveis, formatos incompletos e ano de um dígito ficam pendentes. A regra é usada pelo conversor OCR, cabeçalho da correção humana, bridge canônico, JSON colado e arquivo importado, incluindo formatos com `evento.data`. O dia da semana é calculado da data validada. O backend continua exigindo o payload canônico, sem mudar ledger ou SQL.

Nomes no rascunho OCR seguem nome exato → alias confirmado → prefixo único/desempate de gerente → grafia próxima. O app carrega os aliases já aprovados de `data/broker-name-aliases.json`, sem criar aliases novos por suposição. Nome exato prevalece sobre aproximações; duplicações no cadastro ou no rascunho continuam bloqueadas.

A nova recomposição por grafia exige nome observado de uma palavra, só letras, com 6–40 caracteres; exatamente uma edição; candidato com pelo menos seis caracteres; e nenhum outro cadastro a até duas edições. Se houver gerente lido de ao menos três caracteres e ele for incompatível, não recompõe. “sobrina” encontra exclusivamente “Sabrina” no cadastro atual. Nomes curtos, erros maiores, alternativas próximas e ambiguidades continuam manuais. Distância/similaridade não é probabilidade de acerto.

O texto original permanece em `nome_lido`, junto com `cadastro_resolucao`; a tabela de correção mostra “OCR: sobrina → Sabrina · conferir”. Metadados de CRECI, gerente e diretor vêm do registro escolhido. A identidade recomposta é somente rascunho: impressão e gravação continuam bloqueadas até a conferência humana existente. Nenhum número sorteado ou posição é alterado por esta normalização.

## Verificação e próxima ação

Validação local: 229 testes Node aprovados; sintaxe e diff verificados.

Testes cobrem as três formas de data em OCR/JSON/bridge, calendário/leap year, alias confirmado, precedência de nome exato, “sobrina”, cadastro duplicado, concorrente próximo, nomes curtos, gerente incompatível, erro maior, duplicação de identidade e scripts de navegador sem Node require. Os testes anteriores de prefixo/gerente, conferência, impressão e gravação continuam aplicados.

O operador confirmou o retorno OCR no telefone da Sabrina após o ajuste anterior de timeout. Próximo teste: reprocessar o JSON ou foto com ano 26 e “sobrina”, conferir ano 2026 e o nome preenchido antes de transferir ao passo 2. Depois retomar a primeira gravação real Supabase, que ainda não foi confirmada nesta alteração. Não modificar histórico ou WEEKLY_FROZEN.
