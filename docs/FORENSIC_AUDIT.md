# Roleta — Forensic Audit Baseline

## Baseline consolidada

Data de corte: 29/09/2026.

- 75 eventos utilizáveis;
- 71 qualidade A;
- 4 qualidade B;
- 10 registros-fonte em quarentena/indisponíveis;
- 3 duplicatas explicitamente removidas;
- 1 relato parcial sem N/lista completa fora da inferência.

## Achados principais

### Nº1
- posição física 9 lidera a contagem histórica atual;
- ordem efetiva 9 lidera a contagem atual;
- ordem efetiva 12 permanece próxima.

### Red-team
O aumento da amostra histórica reduziu a evidência de padrões inicialmente fortes. Isso é esperado em um processo forense correto e impede overfitting narrativo.

### Backtest
Estratégias de líder histórico e hot-window não demonstraram vantagem preditiva estatisticamente convincente na base consolidada.

## Política de atualização

Toda nova roleta:
1. entra como novo evento;
2. é validada estruturalmente;
3. duplicata é removida com registro;
4. quarentena não é resolvida por suposição;
5. estatísticas são recalculadas;
6. hipóteses prospectivas permanecem congeladas para evitar hindsight bias.
