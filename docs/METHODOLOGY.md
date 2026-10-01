# Roleta — Metodologia Forense e Estatística V2

## 1. Objetivo

A metodologia separa rigorosamente três perguntas diferentes:

1. **Descrição:** quais posições apareceram mais vezes em resultados de interesse?
2. **Inferência:** existe evidência de que alguma posição se comporta de forma incompatível com sorteio uniforme?
3. **Decisão operacional:** dado período e tamanho provável da roleta, quais posições históricas merecem acompanhamento?

A camada 3 não pode ser apresentada como probabilidade futura superior se as camadas 1/2 e o backtest não sustentarem vantagem preditiva.

## 2. Unidade de análise

Um evento é uma roleta fechada.

Variáveis fundamentais:
- posição física escolhida;
- ordem efetiva entre posições físicas ocupadas;
- número sorteado;
- N de participantes válidos;
- período;
- data;
- qualidade da evidência.

### Distinção obrigatória

```text
posição física != ordem efetiva != número sorteado
```

Quando existem lacunas na primeira coluna, a ordem efetiva é o rank da posição física entre as posições ocupadas.

## 3. Integridade do dado

### Qualidade A
Evidência visual/PDF verificável, com participantes válidos e permutação reconciliada.

### Qualidade B
Registro estruturado reconciliado matematicamente, mas sem evidência visual equivalente.

### Quarentena
Qualquer evento com ambiguidade material, número ausente/ilegível, duplicidade incompatível ou vínculo insuficiente.

### Pós-barra
Linhas abaixo da linha de corte não entram em N nem na permutação principal.

## 4. Dataset canônico lógico

A partir de 01/10/2026 o dataset é append-only.

`data/manifest.json` define as fontes que compõem a base lógica canônica.

Baseline:
- `data/events.csv` — 75 eventos.

Ledger:
- `data/incoming/2026-09-30.csv` — 2 eventos.

Dataset lógico atual:
- **77 eventos utilizáveis**;
- **73 qualidade A**;
- **4 qualidade B**.

A união é deduplicada por `Evento`.

## 5. Hipótese nula

Para uma posição elegível em roleta com N participantes:

### Nº1
`P = 1/N`

### Último
`P = 1/N`

### Nº1 OU Último
`P = 2/N`

### Premium = Nº1 + Cortesia + Último
`P = 3/N`

A expectativa acumulada de uma posição é a soma das probabilidades dos eventos em que a posição estava efetivamente disponível.

## 6. Testes inferenciais

### 6.1 Poisson-binomial
Usado para contagens com probabilidades diferentes entre eventos por causa do N variável.

### 6.2 Observado / Esperado
`O/E = observações / expectativa nula`.

É descritivo. O/E alto não basta para declarar sinal.

### 6.3 BH-FDR
Corrige a multiplicidade quando várias posições são examinadas simultaneamente.

### 6.4 Max-stat Monte Carlo
Simula o sorteio uniforme completo e pergunta:

> qual a chance de encontrar **alguma** posição tão extrema quanto a melhor encontrada?

Este teste global tem precedência sobre p-values individuais para alegações de descoberta.

### 6.5 Backtest cronológico
Toda recomendação histórica é avaliada somente com dados anteriores ao evento testado.

Não é permitido recalibrar a regra usando o próprio resultado futuro.

### 6.6 Validação prospectiva congelada
Sugestões feitas antes de novas roletas são registradas em `docs/PROSPECTIVE_VALIDATION.md`.

Acerto retrospectivo após reordenar candidatos não conta como acerto prospectivo.

## 7. Red-team da metodologia V1 — 01/10/2026

Foram comparadas quatro famílias de ranking para o alvo **Nº1 ou Último**, usando rolling-origin após 25 eventos datados iniciais.

| Método | Testes | Top-1 | Esperado Top-1 | p Top-1 | Top-2 | Esperado Top-2 | p Top-2 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Global raw | 49 | 6 | 4.97 | 0.378 | 9 | 9.63 | 0.649 |
| Contextual raw (período + N adaptativo) | 48 | 5 | 4.87 | 0.546 | 13 | 9.43 | 0.130 |
| Empirical-Bayes kernel | 48 | 3 | 4.91 | 0.883 | 8 | 9.52 | 0.766 |
| EB kernel + recência | 48 | 3 | 4.91 | 0.883 | 7 | 9.52 | 0.869 |

### Conclusão do red-team

Nenhum método demonstrou vantagem preditiva estatisticamente convincente.

O método contextual raw teve o melhor resultado Top-2 entre os testados, porém `p = 0.130`, ainda insuficiente para evidência de vantagem.

Métodos mais sofisticados de shrinkage/recência **não melhoraram** o backtest. Portanto, complexidade adicional não deve ser vendida como inteligência preditiva.

## 8. Testes por período após 77 eventos

### Manhã — alvo Nº1 ou Último
- posição 14: 6 acertos / 23 exposições;
- esperado 2.296;
- O/E 2.614;
- p individual 0.0221;
- q-BH 0.574;
- teste global max-count: `p ≈ 0.399`.

### Tarde — alvo Nº1 ou Último
- posição 22: 5 acertos / 18 exposições;
- esperado 1.337;
- O/E 3.739;
- p individual 0.00849;
- q-BH 0.272;
- teste global max-count: `p ≈ 0.915`.

Os p-values individuais parecem fortes, mas desaparecem após correção/globalização. Logo, 14 e 22 são **líderes descritivos**, não posições com vantagem causal/preditiva comprovada.

## 9. Metodologia operacional V2 do painel

O painel deve apresentar:

1. campeão descritivo;
2. perseguidores;
3. exposição;
4. esperado sob aleatoriedade;
5. O/E;
6. contexto por período/N;
7. grupo de empate ou quase-empate;
8. nível de evidência;
9. histórico de validação prospectiva.

### Regra de recomendação

Quando o usuário exige um único número:
- usar líder descritivo do contexto solicitado;
- aplicar exposição mínima;
- preferir sinal persistente em vez de hot-window;
- não desempatar diferenças estatisticamente indistinguíveis como se fossem vantagens reais;
- declarar que a seleção é heurística quando o backtest não comprova edge.

Quando o usuário pede dois números:
- fornecer dois candidatos distintos;
- prioridade ao líder e ao perseguidor mais robusto por exposição + excesso observado sobre esperado;
- registrar a escolha prospectivamente quando houver resultado futuro.

## 10. Regra de linguagem

Evitar:
- “mais provável de sair”;
- “chance maior”;
- “deve sair”;
- “está atrasado”.

Usar:
- “líder histórico”;
- “candidato descritivo”;
- “melhor suporte histórico no recorte”;
- “sem vantagem futura comprovada”.

## 11. Critério de promoção de um sinal

Uma posição só pode ser chamada de sinal preditivo se houver, cumulativamente:

1. hipótese pré-especificada;
2. resultado prospectivo;
3. correção por múltiplos testes quando aplicável;
4. backtest fora da amostra;
5. replicação em novos eventos;
6. ausência de dependência de um único recorte arbitrário.

Até lá, o painel é um sistema de **apoio descritivo à decisão**, não um preditor.
