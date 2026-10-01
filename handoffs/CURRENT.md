# Roleta — Current Handoff

## CURRENT STATE — 2026-09-30

```text
canonical repo = wagnerjfjunior/Roleta
canonical ref = main / RESOLVE LIVE
dataset usable = 77
quality A = 73
quality B = 4
quarantine/unavailable source records = 10
duplicates removed = 3
partial report excluded from inference = 1

dashboard V1 = RELEASED / PRODUCTION
vercel project = roleta
production alias = roleta-six-lime.vercel.app
dashboard source = index.html + app.js + styles.css
dataset source = data/events.csv
```

## Modelo operacional confirmado

```text
posição física escolhida
!= ordem efetiva entre posições ocupadas
!= número sorteado / ordem final de atendimento
```

No Caminhos da Lapa a primeira coluna é livre: o corretor pode escolher qualquer posição física vaga. No fechamento, conta-se N participantes; o sorteador contém 1..N; os resultados são atribuídos sequencialmente aos participantes conforme a ordem das posições físicas ocupadas.

## Estado estatístico

- posição física 9: maior contagem observada de Nº1 na base atual;
- ordem efetiva 9: maior contagem observada de Nº1;
- ordem efetiva 12: segundo sinal relevante;
- após múltiplos testes e backtest, nenhum padrão demonstra vantagem preditiva robusta;
- dados novos devem ser avaliados prospectivamente, sem recalibrar hipótese depois do resultado.

## Dashboard V1

Entregue em produção com:
- objetivo selecionável: Nº1, Nº1+Último, Premium, Nº2, Cortesia, Último;
- campeão absoluto e perseguidores;
- momentum recente;
- posições que nunca apareceram, ajustadas por exposição;
- mapa-chave da última roleta;
- sugestões por manhã, tarde e fim de semana/integral;
- sugestões por faixas de participantes;
- sugestão contextual por período + N estimado;
- coringa histórico multi-contexto.

## Current work

RLT-M2 continua ativo:
normalizar nomes/aliases e produzir ranking auditável de corretores.

RLT-M3A — Decision Dashboard V1:
RELEASED / PRODUCTION / ACCEPTANCE_PENDING.
