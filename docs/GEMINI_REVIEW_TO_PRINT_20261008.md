# Gemini: revisão assistida → RLT-PRINT-V2 (2026-10-08)

Mudanças aditivas: `gemini-review-bridge.js`, nova revisão editável em `gemini-draft-ui.js`. Nenhuma alteração em `roulette-intake.js`, na entrada GPT, na impressão ou na base estatística.

## Fluxo
Foto → Make / Gemini (prompt específico de leitura, módulo 19) → JSON preliminar → correção manual dos números, nomes, classes e cabeçalho → `RoletaHumanBridge.toCanonicalReview` → importador existente `rltv2Json` / `rltv2Validate` → segunda conferência humana canônica → prévia → confirmar → imprimir/salvar.

O prompt anterior do módulo Make 19 foi preservado em `docs/MAKE_GEMINI_PROMPT_PRE_REVIEW_20261008.md`; em caso de regressão, restaurar exatamente esse texto no segundo bloco de texto da mensagem User. Não modificar URI da foto nem terceiro bloco CSV.

## Invariantes e salvaguardas
- `posicao_impressa` é a localização na foto; `numero_sorteado` é a ordem efetiva e é **editável somente na conferência preliminar**.
- Não autorizar transferência se houver duplicidade ou lacuna na sequência 1..N.
- Não adicionar pessoas sem sorteio automaticamente ao SALÃO: exigir seleção STAND BY, ON-LINE, SALÃO com número ou exclusão conferida.
- Confirmar data, quantidade HELBOR, share e empreendimento independentemente do Gemini.
- Nome confirmado por correspondência nominal única em `print-brokers.json`; CRECI/gerente/diretor/status sempre do cadastro.
- Retornar ao formulário canônico somente após clique humano explícito; o segundo gate e a confirmação final de impressão seguem obrigatórios.
- `resultado.numero_exposto=false`. A coluna do número manuscrito não é incorporada à impressão.
- Contrato antigo GPT (`Colar JSON`, `Carregar .json`) preservado; base histórica não é modificada.

## Teste de aceitação
Utilizar fotografia 06/10/2026 TARDE: 27 números sorteados e duas linhas sem sorteio (posições físicas 29 e 30). Caso OCR confunda Paola 01 e Luma 10/16, a etapa humana deve exigir correção sem completar por suposição. Após correção, SALÃO deve ordenar Paola na posição 1, Monara na 2, Aurora na 3. O operador confirma qual participação cabe a cada pessoa sem número e o share TG 1-2 / HB 3; Helbor 17 após conferência. A importação ainda exige revisão final humana e não grava dados estatísticos.

## Implantação
PR isolada, testes automatizados de conversor/bridge no CI. Antes do merge, registrar baseline de produção elegível para rollback. Para rollback do Make: restaurar prompt salvo. Para rollback do app: Vercel rollback + revert do merge GitHub.
