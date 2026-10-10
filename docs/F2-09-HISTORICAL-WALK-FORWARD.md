# F2-09 — Historical walk-forward: implementação e bloqueios

## Estado
Implementação de pesquisa na branch audit/simulation-lab-phase2-20261010, PR #43 Draft. Não há autorização para merge, deploy ou mudança de WEEKLY_FROZEN. Nenhum CSV canônico foi alterado.

## Inventário confirmado
Manifest 2026-10-06-86: 86 registros em 8 CSVs, sem IDs duplicados; 86 estruturalmente consistentes (N, occupied, primeiro/último); 82 A / 4 B; 3 datas ausentes; 9 períodos desconhecidos, com sobreposição de 2; 76 registros com data e período; conflito de mesma data e período: P27/P35 em 14/09/2026 manhã. Após quarentena dos dois conflitos, há **74 candidatos estruturais/cronológicos**, não 74 previsões prospectivas verificadas. Dez registros com campos incompletos: P01 P02 P09 P10 P12 P13 P17 P24 P30 20-04.

## Implementação
- simulation/historical-walk-forward.cjs: validação estrita, quarentena de duplicados e colisões, treino CURRENT somente com datas anteriores, treino WEEKLY somente antes da segunda-feira da semana, ranking sem utilizar posições do evento avaliado; warm-up configurável.
- simulation/historical-walk-forward-cli.cjs: leitura somente de manifest e CSVs, hash SHA-256 do input derivado, relatório JSON no stdout.
- tests/regression/historical-walk-forward.test.cjs: datas, duplicados/colisões, teste de invariância a mudanças futuras, independência do ranking em relação ao occupied do evento avaliado, warm-up.

## Limitações decisivas
O dataset contém resultados finais, mas não comprova quando os resultados ficaram disponíveis, quando as posições occupied/N foram conhecidas, nem snapshots das recomendações pré-sorteio. O fallback de posições elegíveis é **posthoc**, explicitamente rotulado: não equivale a escolha operacional executável. As métricas são diagnósticas retrospectivas, não previsão prospectiva registrada nem estimativa causal de vantagem real. O bloqueio de treinamento de mesmo dia é conservador e impede uso de resultados de manhã para prever tarde, até que horários confiáveis sejam obtidos. Rankings do histórico podem conter correções feitas após os eventos, sem prova de versão as-of.

## Gate para finalizar F2-09
1. Rodar testes locais e CLI, registrar saída e SHA.
2. Auditar disponibilidade ex-ante de N/occupied, data/hora da revelação, e versão histórica dos dados antes de afirmar predição prospectiva.
3. Se não houver evidência desses campos, encerrar F2-09 como **backtest retrospectivo limitado** e abrir protocolo de captura prospectiva, sem inventar informações ausentes.
4. Não mudar política WEEKLY_FROZEN.

Comandos no Mac:
```bash
cd "/Users/WagnerFernandes/SFJM/projects/Roleta"
git pull --ff-only origin audit/simulation-lab-phase2-20261010
node --test tests/regression/historical-walk-forward.test.cjs tests/regression/simulation-guardrails.test.cjs
node simulation/historical-walk-forward-cli.cjs
```


## Homologação local executada — 2026-10-10
Operador executou `git pull --ff-only` até commit `f4b44d9`, `node --test tests/regression/historical-walk-forward.test.cjs tests/regression/simulation-guardrails.test.cjs` e `node simulation/historical-walk-forward-cli.cjs` no MacBook. **30/30 PASS, 0 falhas** (evidência fornecida no terminal pelo operador; não é CI).

Dataset `2026-10-06-86`, input SHA-256 `ba7bb7608a576128d19e1c567c953c489cec78c681e60b94d47de8c1df3f3a34`. 86 totais, 74 candidatos após 12 exclusões, 18 warm-up, 56 avaliados, 53 oportunidades pareadas. No subconjunto pareado: WEEKLY_FROZEN 3 acertos, CURRENT 4, esperado 5.0143961040024125 para ambos; diferença CURRENT−WEEKLY +1 acerto. Cobertura retrospectiva WEEKLY 55/56 e CURRENT 54/56. Esses valores não demonstram vantagem estatística e **não são avaliação prospectiva real**. `posthoc_eligible_pick` depende da ocupação observada e não comprova escolha operacional antes do sorteio.

**Decisão:** F2-09 homologada como diagnóstico retrospectivo limitado; validação prospectiva real bloqueada pela falta de snapshots de recomendações, horários de disponibilidade dos resultados e posições pré-evento. Manter WEEKLY_FROZEN. Nada autoriza merge ou deploy.
