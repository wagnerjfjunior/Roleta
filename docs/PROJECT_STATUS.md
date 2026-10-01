# Roleta — Project Status

## Estado canônico — 2026-09-30

### Dados

| Métrica | Estado |
|---|---:|
| Roletas utilizáveis |Roletas utilizáveis | 77 |
| Qualidade A |Qualidade A | 73 |
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


## Red-team estatístico V2 — 01/10/2026

- dataset lógico canônico: 77 eventos;
- metodologia V1 reavaliada por rolling-origin;
- nenhum método testado demonstrou vantagem preditiva significativa;
- contextual raw Top-2 foi o melhor entre os testados, porém p=0.130;
- manhã, alvo Nº1 ou Último: posição 14 é líder descritiva, sem significância global;
- tarde, alvo Nº1 ou Último: posição 22 é líder descritiva, sem significância global;
- metodologia V2 publicada em docs/METHODOLOGY.md.
