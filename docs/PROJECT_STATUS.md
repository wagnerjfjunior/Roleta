# Roleta — Project Status

## Estado canônico — 2026-09-30

### Dados

| Métrica | Estado |
|---|---:|
| Roletas utilizáveis | 75 |
| Qualidade A | 71 |
| Qualidade B | 4 |
| Quarentena/indisponíveis | 10 |
| Duplicatas removidas | 3 |
| Relato parcial fora da inferência | 1 |

### Resultados estatísticos atuais

- posição física 9 lidera Nº1 historicamente;
- ordem efetiva 9 lidera Nº1;
- ordem efetiva 12 permanece relevante, mas perdeu significância após backfill histórico;
- testes globais atuais não sustentam vantagem preditiva robusta;
- backtest cronológico não demonstrou estratégia preditiva superior ao acaso de forma estatisticamente convincente.

### RLT-M2 — Broker Identity Layer

STATUS: ACTIVE

Objetivo:
normalizar nomes/aliases e calcular ranking de corretores sem contaminar a base numérica auditada.

### RLT-M3A — Decision Dashboard V1

STATUS: RELEASED / PRODUCTION / ACCEPTANCE_PENDING

Vercel project: `roleta`

Production alias:
`https://roleta-six-lime.vercel.app`

Funções publicadas:
- ranking geral;
- perseguidores;
- momentum;
- nunca apareceu;
- última roleta;
- recomendações por período;
- recomendações por faixa de participantes;
- cenário por N estimado;
- coringa histórico.

O dashboard lê `data/events.csv` diretamente e não substitui a metodologia forense canônica.
