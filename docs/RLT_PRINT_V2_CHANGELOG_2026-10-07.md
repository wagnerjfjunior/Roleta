# RLT-PRINT-V2 — Registro de implementação 07/10/2026

## Objetivo

Registrar as mudanças operacionais feitas no fluxo Nova Roleta em 07/10/2026, incluindo falhas encontradas, correções, testes e decisões.

## Incidente 1 — contrato da Skill incompatível com o intake

Sintoma:
o app bloqueava um JSON válido com mensagens como:
- status precisa ser VALIDADO;
- empreendimento ausente;
- data inválida;
- dia_semana ausente;
- TG/HB ausente;
- tegra_qtd undefined.

Causa:
`roulette-intake.js` ainda esperava o contrato legado `evento.*`, enquanto a Skill já emitia o contrato plano `rlt-print-v2`.

### Correção

PR #17  
Merge main: `5cbe4b92587d934ea1a8baa958b55c76a729ea59`

Implementado:
- aceitação do contrato plano;
- conversão ISO -> DD/MM/YYYY;
- derivação de dia da semana;
- `helbor_qtd=0` válido;
- proteção de `numero_exposto=false`;
- compatibilidade legada preservada.

Teste:
- 25 corretores;
- 07/10/2026 tarde;
- zero erros;
- contrato legado também sem regressão.

## Incidente 2 — JSON ia direto para impressão

Risco:
erros de leitura da foto/manuscrito poderiam se tornar documento final sem revisão.

### Decisão

JSON passou a ser tratado como **transcrição inicial**, não como documento validado.

Novo fluxo:
JSON -> conferência humana -> prévia final -> impressão/PDF.

### Implementação

PR #18  
Merge main: `3336af73799140910eee2ed7bd86e3257020cfe9`

Incluído:
- grade editável;
- posição + nome revisáveis;
- atualização automática de CRECI/gerente/diretor/status;
- bloqueio de impressão após qualquer edição;
- revisão SALÃO;
- revisão STAND BY;
- revisão ON-LINE;
- adicionar/remover linhas em blocos inferiores;
- `data/print-brokers.json` derivado do cadastro oficial.

## Caso real — nomes do salão

A transcrição inicial do teste apresentou:
- p3 Aline;
- p5 Neuma;
- p8 Alexandre.

A conferência humana permitiu corrigir para o que constava na folha oficial:
- p3 Nair;
- p5 Nina;
- p8 Turmalina.

A prévia final passou a refletir os nomes corrigidos e seus dados oficiais.

Conclusão:
a camada humana entre OCR/transcrição e impressão é obrigatória.

## Caso real — STAND BY omitido

A folha oficial continha STAND BY que o JSON inicial não trouxe.

O fluxo foi expandido para permitir adição manual de STAND BY/ON-LINE.

Teste automatizado realizado com:
- 25 SALÃO;
- 3 STAND BY;
- 0 ON-LINE;
- Lobo;
- Maranata;
- Aurora;
- zero erros de validação.

Posteriormente, o usuário testou visualmente um cenário com 4 STAND BY, incluindo Gelasio.

## Incidente 3 — cabeçalho operacional incompleto

Faltavam controles humanos para:
- quantidade de participantes Helbor;
- regra de share;
- posição de empresa.

### Regra aprovada

Share Tegra:
- HB 1 -> TG 2-3;
- HB 2 -> TG 1-3;
- HB 3 -> TG 1-2.

Share Helbor:
- TG 1 -> HB 2-3;
- TG 2 -> HB 1-3;
- TG 3 -> HB 1-2.

Sem share:
- uma posição Tegra;
- uma posição Helbor;
- posições distintas.

Quantidade HELBOR é independente do share e deve ser editável.

Exemplo da folha oficial de 07/10:
- HELBOR 14;
- TG 2-3;
- HB 1.

## PR #19 — fechamento do cabeçalho e impressão

Branch:
`feature/rlt-print-company-draw-review-20261007`

Mudanças:
- quantidade HELBOR editável;
- Share Tegra / Sem share / Share Helbor;
- derivação automática de posições;
- campos condicionais conforme modo;
- correção do segundo label/field HELBOR indevidamente visível;
- impressão com zebra real;
- aumento de fonte;
- tentativa de 1 página A4;
- botão Imprimir;
- botão Salvar em PDF;
- redistribuição das colunas.

## Bug visual — segundo campo HELBOR aparecia em Share Tegra

Causa:
CSS `display:grid` sobrescrevia o atributo HTML `hidden`.

Correção:
`label[hidden]{display:none!important}`

Commit:
`1148273bec0b5fea03990731d11bc270f44c2c94`

## Impressão — legibilidade

Problemas:
- fonte pequena;
- zebra pouco evidente;
- duas páginas.

Correção:
- A4 portrait;
- margens menores;
- linhas mais compactas;
- zebra branco/cinza claro;
- print-color-adjust;
- break-inside evitado;
- fonte ampliada.

Commit inicial:
`2f5a8200f6326b5dd1c0dd2ef8e2ba4b61a8c56a`

## Impressão — distribuição de largura

Problema:
Nº + Nome / empreendimento consumiam largura excessiva e SORTEIO DE EMPRESA ficava comprimido.

Nova grade:
- Nº 7%;
- Nome 21%;
- CRECI 17%;
- Gerente 19%;
- Diretor 12%;
- Status/Sorteio 24%.

Fonte das linhas:
~13 pt.

Commit:
`aea4a8594f9ea44f49fcaed9dc2bf8048ddb23a3`

## Saída em PDF

Ação explícita adicionada:
**Salvar em PDF**.

A saída usa o mesmo renderer da impressão e abre o diálogo nativo do navegador para selecionar “Salvar como PDF”.

Objetivo:
não manter dois templates capazes de divergir.

## Invariantes finais

1. Skill/transcrição nunca autoriza impressão diretamente.
2. Revisão humana é obrigatória.
3. Nomes precisam resolver contra cadastro oficial.
4. Alterar nome atualiza todos os metadados.
5. SALÃO, STAND BY e ON-LINE são classes separadas.
6. Quantidade HELBOR é revisável.
7. Share é revisável.
8. Posições de empresa são validadas.
9. Número sorteado protegido não é exposto.
10. Qualquer edição invalida a impressão até nova validação.
11. Preview final e PDF/impressão derivam do mesmo payload revisado.
12. A4 deve privilegiar uma página e legibilidade.
13. Zebra é obrigatória.
14. Fonte operacional deve permanecer grande o suficiente para leitura confortável.
