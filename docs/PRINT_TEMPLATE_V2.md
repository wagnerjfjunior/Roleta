# RLT-PRINT-V2 — Gerador determinístico com conferência humana

Status: CANÔNICO  
Version: RLT-PRINT-V2  
Última revisão material: 07/10/2026

## 1. Objetivo

RLT-PRINT-V2 é o fluxo operacional canônico para transformar uma transcrição inicial da roleta Tegra em uma folha final imprimível ou salvável em PDF.

A Skill não gera PDF e não é autoridade final de impressão. Ela produz a transcrição inicial estruturada.

Fluxo obrigatório:

```
FOTO/FONTE
  -> SKILL / TRANSCRIÇÃO INICIAL
  -> JSON RLT-PRINT-V2
  -> VALIDAÇÃO ESTRUTURAL
  -> CONFERÊNCIA HUMANA OBRIGATÓRIA
       - cabeçalho operacional
       - SALÃO
       - STAND BY
       - ON-LINE
  -> PAYLOAD REVISADO
  -> PRÉVIA FINAL
  -> CONFIRMAÇÃO HUMANA
  -> IMPRIMIR ou SALVAR EM PDF
```

Princípio: **JSON importado != autorização de impressão**.

## 2. Fontes de verdade

### 2.1 Cadastro oficial de corretores

Fonte canônica:
`data/brokers-official.csv`

O frontend não interpreta o CSV diretamente. A UI de conferência usa o DTO derivado:
`data/print-brokers.json`

Ao corrigir o nome de um corretor na etapa humana, o app deve atualizar em conjunto:
- nome canônico;
- CRECI;
- gerente;
- diretor;
- status CRECI.

Nunca corrigir apenas o nome mantendo metadados de outro corretor.

### 2.2 Folha manuscrita / oficial

A folha física/foto do período é a autoridade para:
- posição;
- nome observado;
- classe de participação;
- quantidade HELBOR;
- share;
- posição de empresa;
- presença de STAND BY;
- presença de ON-LINE.

Se a transcrição automática divergir da folha, a revisão humana prevalece.

## 3. Contratos de entrada aceitos

### 3.1 Contrato atual plano

Exemplo estrutural:

```json
{
  "schema": "rlt-print-v2",
  "empreendimento": "CAMINHOS DA LAPA",
  "data": "2026-10-07",
  "periodo": "TARDE",
  "empresa": "TEGRA",
  "tegra_qtd": 25,
  "helbor_qtd": 0,
  "resultado": {
    "empresa": "TEGRA",
    "numero": null,
    "numero_exposto": false
  },
  "salao": []
}
```

O normalizador:
- converte data ISO `YYYY-MM-DD` para `DD/MM/YYYY`;
- deriva `dia_semana`;
- converte para o modelo interno;
- mantém `numero_exposto=false` como regra de proteção.

### 3.2 Contrato legado

O app mantém compatibilidade com o formato:
- `status=VALIDADO`;
- `evento.*`;
- `evento.sorteio_empresa.tg`;
- `evento.sorteio_empresa.hb`;
- `salao[]`, `standby[]`, `online[]`.

Compatibilidade legada não pode reintroduzir regras antigas que contrariem a revisão humana atual.

## 4. Proteção do número sorteado

Se:
`resultado.numero_exposto=false`

então:
- o número sorteado não aparece na UI;
- não aparece na prévia;
- não aparece na impressão/PDF;
- o app pode mostrar apenas a empresa / composição de share validada.

Essa proteção é aplicada antes da renderização final.

## 5. Validação estrutural antes da revisão humana

A importação é bloqueada se:
- payload inválido;
- empreendimento diferente de CAMINHOS DA LAPA;
- data inválida;
- período fora de MANHÃ / TARDE / INTEGRAL;
- `helbor_qtd` não numérico;
- SALÃO vazio;
- `tegra_qtd != salao.length`;
- `ordem_final` do SALÃO não formar sequência completa 1..N;
- nome/CRECI/gerente/diretor/status ausente nos registros importados;
- houver pendências estruturais abertas.

Passar esse gate permite apenas entrar na **conferência humana**. Ainda não libera impressão.

## 6. Conferência humana obrigatória

A etapa 2 é mandatória.

### 6.1 SALÃO

Para cada linha:
- posição editável;
- nome editável;
- CRECI exibido;
- gerente exibido;
- diretor exibido;
- status CRECI exibido.

Regras:
- posições devem formar sequência única 1..N;
- nome precisa existir no cadastro oficial;
- mudança de nome recarrega os metadados oficiais;
- qualquer edição invalida uma validação anterior.

### 6.2 STAND BY

Bloco independente do SALÃO.

A revisão humana pode:
- corrigir nomes;
- corrigir ordem interna;
- adicionar linha omitida pela transcrição;
- remover linha indevida.

STAND BY:
- não entra no N do SALÃO;
- não entra na permutação do sorteio;
- permanece classe operacional própria;
- pode contar para presença/fim de semana conforme regra operacional.

### 6.3 ON-LINE

Mesmo comportamento de revisão do STAND BY:
- adicionar;
- remover;
- corrigir;
- validar contra cadastro oficial.

ON-LINE não entra automaticamente no N do SALÃO.

### 6.4 Invalidação obrigatória

Qualquer alteração após validação humana:
- oculta/invalida a prévia final;
- desabilita Imprimir;
- desabilita Salvar em PDF;
- exige nova execução de “Aplicar correções e validar”.

## 7. Cabeçalho operacional revisável

A etapa humana também valida:

### 7.1 Quantidade HELBOR

Campo numérico editável.

Representa a quantidade de participantes da Helbor no período.

Exemplo real de 07/10/2026:
`HELBOR 14`

Não confundir quantidade HELBOR com posição no sorteio de empresa.

### 7.2 Sorteio de empresa / share

Três modos:

#### Share Tegra

Tegra recebe duas posições.  
Helbor recebe uma.

O usuário escolhe apenas a posição da Helbor:

| Posição Helbor | Posições Tegra |
|---|---|
| 1 | 2 - 3 |
| 2 | 1 - 3 |
| 3 | 1 - 2 |

Exemplo real:
`HB 1 -> TG 2 - 3`

#### Sem share

Cada empresa recebe uma posição.

O usuário escolhe:
- posição Tegra;
- posição Helbor.

As posições precisam ser diferentes.

#### Share Helbor

Helbor recebe duas posições.  
Tegra recebe uma.

O usuário escolhe apenas a posição da Tegra:

| Posição Tegra | Posições Helbor |
|---|---|
| 1 | 2 - 3 |
| 2 | 1 - 3 |
| 3 | 1 - 2 |

### 7.3 Comportamento da UI

- Share Tegra: mostrar apenas **Posição HELBOR**;
- Share Helbor: mostrar apenas **Posição TEGRA**;
- Sem share: mostrar **Posição TEGRA** e **Posição HELBOR**.

Campos não aplicáveis devem permanecer realmente ocultos; CSS não pode sobrescrever `hidden`.

## 8. Prévia final

A prévia final só existe após:
1. estrutura válida;
2. revisão humana aplicada;
3. nomes resolvidos;
4. classes resolvidas;
5. quantidade Helbor válida;
6. regra de share válida;
7. posições de empresa válidas.

Resumo deve mostrar:
- SALÃO N;
- STAND-BY N;
- ON-LINE N;
- HELBOR quantidade;
- sorteio de empresa validado.

## 9. Confirmação final e ações

Antes de liberar saída, o usuário marca:
“Conferi a folha final após as correções humanas.”

Somente então ficam habilitados:
- **Imprimir roleta**
- **Salvar em PDF**

### 9.1 Salvar em PDF

O navegador utiliza o mesmo layout de impressão.
O botão abre o diálogo de impressão; o usuário seleciona **Salvar como PDF** como destino.

Não existe um segundo renderer de PDF. Isso evita divergência entre impresso e PDF.

## 10. Layout canônico

Formato:
- A4 portrait;
- uma página quando o volume normal do período permitir;
- sem editorialização;
- sem hash;
- sem rodapé técnico;
- sem coluna de número sorteado;
- sem VALIDADE CRECI.

### 10.1 Seis colunas

Proporção atual:

| Coluna | Largura |
|---|---:|
| Nº | 7% |
| NOME | 21% |
| CRECI | 17% |
| GERENTE | 19% |
| DIRETOR | 12% |
| STATUS CRECI | 24% |

No cabeçalho:
- EMPREENDIMENTO ocupa Nº + NOME = 28%;
- SORTEIO DE EMPRESA usa a última faixa larga de 24%.

### 10.2 Tipografia de impressão

Alvo atual:
- linhas de corretores: ~13 pt;
- cabeçalhos: ~12–12,5 pt;
- share TG/HB: ~11,5 pt.

Objetivo:
- legibilidade para usuários com dificuldade visual;
- preservação de uma página A4.

### 10.3 Zebra

Obrigatória:
- primeira linha branca;
- segunda cinza muito claro;
- alternar branco / cinza claro;
- reiniciar quando apropriado por bloco.

Impressão força:
- `print-color-adjust: exact`;
- `-webkit-print-color-adjust: exact`.

### 10.4 Blocos condicionais

Ordem:
1. SALÃO;
2. STAND-BY, se houver;
3. ON-LINE, se houver.

Cada bloco inferior:
- título próprio;
- mesma grade;
- numeração interna;
- zebra.

## 11. Exemplo de aceitação — 07/10/2026 tarde

Folha oficial utilizada para validação do fluxo.

SALÃO:
- 25 participantes;
- p3 Nair;
- p5 Nina;
- p8 Turmalina.

STAND BY confirmado/adicionado manualmente:
- Aurora;
- Lobo;
- Maranata;
- Gelasio no teste visual subsequente quando presente na folha/transcrição usada pelo usuário.

Cabeçalho:
- Caminhos da Lapa;
- 07/10/2026;
- quarta-feira;
- tarde;
- quantidade Helbor revisável;
- exemplo de regra Share Tegra validada: TG 2-3 / HB 1.

Esse caso comprovou que a revisão humana deve existir entre transcrição e impressão.

## 12. Arquivos de implementação

- `roulette-intake.js` — normalização, gates, revisão humana e renderer;
- `styles.css` — preview, conferência e CSS de impressão;
- `data/brokers-official.csv` — cadastro oficial;
- `data/print-brokers.json` — DTO derivado para UI;
- `docs/PRINT_TEMPLATE_V2.md` — esta especificação.

## 13. Testes mínimos de regressão

Antes de merge futuro envolvendo este fluxo, testar:

1. contrato plano atual;
2. contrato legado;
3. `numero_exposto=false`;
4. correção nominal com atualização de metadados;
5. adição e remoção de STAND BY;
6. adição e remoção de ON-LINE;
7. sequência de posições do SALÃO;
8. Share Tegra HB=1 -> TG=2-3;
9. Share Tegra HB=2 -> TG=1-3;
10. Share Tegra HB=3 -> TG=1-2;
11. Share Helbor inverso;
12. Sem share com posições distintas;
13. Sem share com posição repetida deve falhar;
14. alteração posterior deve invalidar impressão;
15. zebra na impressão;
16. fonte legível;
17. tentativa de manter uma página A4;
18. Imprimir e Salvar em PDF usam o mesmo renderer.

## 14. Anti-regressão

É proibido:
- pular a conferência humana;
- imprimir diretamente do JSON importado;
- inferir nomes ambíguos;
- corrigir nome sem atualizar metadados;
- misturar STAND BY/ON-LINE no N do SALÃO;
- expor número sorteado quando `numero_exposto=false`;
- manter dois renderers divergentes para impressão e PDF;
- esconder share/quantidade Helbor da revisão humana;
- reintroduzir fonte pequena por conveniência de paginação;
- remover zebra;
- alterar proporções sem validar SORTEIO DE EMPRESA e legibilidade.

Princípio final:

**transcrever -> validar estrutura -> revisar humanamente -> validar regras -> prévia final -> confirmar -> imprimir/salvar.**
