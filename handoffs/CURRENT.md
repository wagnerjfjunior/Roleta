# Roleta — Current Handoff

## CURRENT STATE — 2026-09-30

```text
canonical repo = wagnerjfjunior/Roleta
canonical ref = main / RESOLVE LIVE
dataset usable = 75
quality A = 71
quality B = 4
quarantine/unavailable source records = 10
duplicates removed = 3
partial report excluded from inference = 1
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

## Current work

Construir a camada nominal por corretor sobre a base auditada para produzir ranking por:
- Nº1;
- Nº2;
- Nº3;
- cortesia;
- último de vez;
- Top-3;
- Premium = Nº1 + cortesia + último.

Não inferir nomes ilegíveis ou aliases sem evidência.
