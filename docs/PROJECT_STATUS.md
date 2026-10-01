# Roleta — Project Status

## Estado canônico — 2026-10-01

### Dados

| Métrica | Estado |
|---|---:|
| Roletas utilizáveis | 77 |
| Qualidade A | 73 |
| Qualidade B | 4 |
| Quarentena/indisponíveis | 10 |
| Duplicatas removidas | 3 |
| Relato parcial fora da inferência | 1 |

### Resultados estatísticos atuais

- nenhum método testado demonstrou vantagem preditiva estatisticamente convincente;
- `context_raw` permanece champion operacional de benchmark;
- benchmark champion Top-2 OOS: 13/48, esperado 9.4348, p=0.13018;
- modelos mais sofisticados testados até aqui não superaram o champion;
- Bayes hierárquico e logístico hierárquico estão cadastrados como challengers em laboratório;
- frequência, O/E e excesso observado permanecem descritivos até confirmação prospectiva;
- o projeto continua como experimento controlado para responder se existe edge real sobre o acaso.

### RLT-M2 — Broker Identity Layer

STATUS: ACTIVE / PARALLEL

Objetivo:
normalizar nomes/aliases e calcular ranking de corretores sem contaminar a base numérica auditada.

### RLT-M3 — Prospective Statistical Monitoring

STATUS: ACTIVE

#### RLT-M3-01 — Dashboard V2 + Model Lab

STATUS: COMPLETE / RELEASED / PRODUCTION

Funções publicadas:
- objetivo fixo Nº1 ou Último;
- ranking histórico;
- momentum;
- zerados;
- manhã/tarde;
- recência;
- qualificação 5/10;
- sábado separado de domingo;
- Model Lab Champion vs Challengers;
- ranking de acertos OOS;
- viabilidade versus acaso.

#### RLT-M3-02 — Champion vs Challengers

STATUS: NEXT_SAFE_ACTION

Champion:
- `context_raw` = índice 100.

Challengers com OOS existente:
- Global raw = 67.82;
- EB + kernel N = 61.54;
- EB + N + recência = 53.85.

Challengers ainda sem benchmark:
- Bayes hierárquico;
- Logístico hierárquico.

Regra de promoção:
um challenger só substitui o champion após superar 100% no backtest cronológico e também em previsões prospectivas congeladas, com vantagem sustentada e amostra suficiente.

#### RLT-M3-03 — Weekend Forecast Cycle

STATUS: ACTIVE

Regra:
- base principal = todas as 77 roletas;
- sábado/domingo = contexto secundário;
- sábado fecha após a última roleta de sexta-feira;
- domingo fecha após incorporar foto/resultado de sábado.

Prévia atual de sábado:
- Wagner 9;
- Sabrina 3;
- Laura 22, fallback 13;
- Helena (Lívia) 14.

### Viabilidade

Estado atual: **EVIDÊNCIA INSUFICIENTE**.

O melhor modelo atual apresenta lift descritivo sobre o acaso no backtest, mas sem significância suficiente para declarar vantagem preditiva. O projeto deve continuar apenas como experimento controlado até acumular evidência prospectiva suficiente para decidir CONTINUAR / OBSERVAR / ENCERRAR.

### Delivery policy

A política canônica é:
- LOCAL-FIRST;
- NO PREVIEW;
- NO REMOTE ITERATION;
- push somente com intenção explícita;
- deploy somente com intenção explícita;
- documentação-only pode ser versionada sem gerar deploy material quando coberta pelo gate do `vercel.json`.
