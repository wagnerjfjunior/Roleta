# RLT F2-04 — Matriz de cenários e critérios de decisão

## Objetivo
Avaliar WEEKLY_FROZEN versus CURRENT em três cenários com sinal sintético controlado, separando eficácia pareada de disponibilidade operacional. O experimento NULL anterior permanece como controle negativo.

## Matriz de execução
Para cada cenário abaixo, executar **Multiseed · 5 seeds**, **10.000 semanas por seed**, seed base `weekly-duel-2026`, 12 eventos/semana, quatro pessoas/evento. Exportar JSON individual para cada cenário. Isso gera 600.000 eventos sintéticos por cenário e 1.800.000 eventos nos três cenários combinados.

| Cenário UI | Chave | Força inicial |
|---|---|---|
| Sinal estável por período | `stable_period` | 5% |
| Mudança de regime no meio da semana | `regime_shift` | 5% |
| Sinal fraco + ruído | `weak_noise` | 1% |

**Importante:** o mecanismo de injeção de sinal está definido em `simulation/weekly-duel.js`; sua construção usa recomendações do plano WEEKLY no início da semana. Logo, **o gerador pode favorecer estruturalmente WEEKLY_FROZEN**. Não interpretar diferenças como teste neutro de capacidade preditiva nem como evidência real de superioridade de qualquer política. Auditar esse viés antes de uma decisão de produto.

## Verificações em cada export
1. `test.input_provenance.real_events_count` e `ordered_engine_input_sha256` idênticos entre os três exports; se mudarem, bloquear comparação.
2. `test.workload.weeks=10000`, `result.seed_count=5`, `result.total_synthetic_events=600000`, cenário e intensidade corretos.
3. Por seed: `paired_valid.weekly.opportunities===paired_valid.current.opportunities`, expected iguais (tolerância 1e-9), vitórias+derrotas+empates = 10.000.
4. Por seed: bootstrap pareado 95% por semana; registrar limites e se incluem zero.
5. Reportar `mean_delta_hits_across_seeds`, dispersão entre seeds, e `operational.delta_valid_opportunities` **separadamente**.
6. Não decidir promoção da política com base apenas no sinal injetado; primeiro auditar mecanismo gerador e realizar avaliação prospectiva com dados reais.

## Segurança
Não modificar dados canônicos, política semanal congelada, main ou produção. PR #43 continua Draft até autorização explícita.
