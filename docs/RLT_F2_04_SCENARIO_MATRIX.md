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


## F2-04 — Resultados observados e encerramento da matriz (2026-10-10)

Fonte: exports JSON locais enviados pelo operador; resultados sintéticos, não observações prospectivas reais. Cada cenário A/B/C executou 5 seeds × 10.000 semanas × 12 sorteios = 600.000 sorteios sintéticos. Mesmo conjunto estrutural de 86 moldes, SHA-256 selecionado `2ec93849c9ed78fb73aafafe275d2219bd1c53e0c93f8ea8b4ea7d121ff11021`. Este hash **não** certifica a revisão do motor nem os arquivos brutos.

| Cenário | Força | Média Δ hits/semana (CURRENT−WEEKLY) | Seeds Δ>0 | ICs bootstrap 95% excluem zero |
|---|---:|---:|---:|---:|
| NULL (controle) | 0% | −0,0006 | 2/5 | 0/5 |
| A stable_period | 5% | +0,0074 | 4/5 | 0/5 |
| B regime_shift | 5% | −0,0008 | 2/5 | 0/5 |
| C weak_noise | 1% | −0,01476 | 0/5 | 1/5 |

Para C, deltas por seed: −0,0070; −0,0026; −0,0142; −0,0161; −0,0339. Apenas a seed 05 teve IC bootstrap sem zero: [−0,0552, −0,0115]. Para B, os cinco ICs incluem zero. A vantagem operacional de CURRENT mede disponibilidade, não qualidade paired-valid. **Nenhuma promoção da política real é autorizada por esses resultados.**

## F2-07 — Auditoria causal do gerador e desenho de sensibilidade (planejamento)

**Achado de código:** `runWeek()` constrói `weeklyPlan=makePlan(stats)` antes de gerar a semana; `simulateEvent(...,weeklyPlan,...)` passa esse plano a `scenarioTarget()`. Em `stable_period`, o alvo é o `primary` da primeira pessoa; em `regime_shift`, muda para o `primary` da segunda pessoa a partir do evento 6; em `weak_noise`, sorteia entre os `primary` das quatro pessoas. Quando a posição está ocupada e a injeção ocorre, o gerador permuta o resultado para torná-la primeira ou última. Assim, o alvo não é exógeno à estratégia WEEKLY. Essa dependência deve ser tratada como viés potencial, não como prova de que explica integralmente os deltas observados.

**Próxima bateria, separada da matriz histórica:**
1. **Controle exógeno**: gerar alvos independentemente dos dois planos, escolhendo entre posições ocupadas elegíveis antes da aplicação do sinal. Registrar o método de seleção e a taxa efetiva de injeção. O controle NULL permanece sem injeção.
2. **Alvo ancorado em CURRENT (diagnóstico de simetria)**: criar braço contrafactual com alvo derivado do plano CURRENT *pré-evento*, sem vazamento do resultado atual. Manter o cenário original WEEKLY-anchored como braço histórico; nunca substituir resultados anteriores.
3. **Mesmas sementes, cargas e intensidade por braço**: executar 5 seeds × 10.000 semanas nos níveis 0%, 1% e 5%, com relatório de oportunidades pareadas, Δ O/E, Δ excesso, Δ hits e oportunidades operacionais. Verificar se a escolha de alvo altera consumo de números aleatórios; para comparabilidade estrita, isolar fluxos RNG de template, alvo e permutação.
4. **Testes de invariantes**: determinismo, ausência de vazamento temporal, ausência de mutação da política, integridade de resultados, igualdade das oportunidades e expected no subconjunto paired-valid, tratamento explícito de alvos inelegíveis.
5. **Critério de conclusão**: quantificar sensibilidade ao mecanismo de geração, apresentar variação entre sementes e IC bootstrap; sem extrapolação para vantagem real. Avaliação prospectiva fora desta bateria.

**Estado:** F2-04 documentado; F2-07 planejado, não implementado nem executado. Trabalho isolado em `audit/simulation-lab-phase2-20261010`; PR #43 Draft. Sem merge, deploy, alteração de dados canônicos ou da política oficial.
