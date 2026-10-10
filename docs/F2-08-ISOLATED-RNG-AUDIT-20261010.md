# F2-08 — auditoria RNG isolado (2026-10-10)

PR #43 Draft; pesquisa LOCAL-FIRST. Não promover main, produção, base canônica ou política WEEKLY_FROZEN.

## Falha e regressão
UI enviava randomStreamMode=isolated ao worker mas omitia o parâmetro na buildTestDefinition, que assumia legacy; resultado isolated-v1 era bloqueado. Corrigido em 9a40c78. Teste preventivo incluído em 7234bc1 (pendente execução local). Modo legacy continua padrão; isolated é opt-in.

## Protocolo
Três exports do usuário: roleta-weekly-duel-1791640989166.json (exogenous), roleta-weekly-duel-1791641118105.json (weekly), roleta-weekly-duel-1791641323187.json (current). Cenário stable_period, sinal 5%, isolated-v1, seed weekly-duel-2026, 5 replicates de 10.000 semanas por âncora, 12 eventos/semana, 4 pessoas/evento. 86 moldes; hash dos campos selecionados ordenados: 2ec93849c9ed78fb73aafafe275d2219bd1c53e0c93f8ea8b4ea7d121ff11021. Hash não certifica arquivos brutos, engine nem origem histórica.

| Âncora | Δ paired-valid hits/semana (replicates 01–05) | Média | Positivas | IC bootstrap 95% exclui 0 |
|---|---|---:|---:|---:|
| Exógena | -0.0096; +0.0082; +0.0120; -0.0037; -0.0020 | +0.00098 | 2/5 | 0/5 |
| WEEKLY | -0.0103; +0.0096; +0.0067; -0.0094; +0.0011 | -0.00046 | 3/5 | 0/5 |
| CURRENT | -0.0009; +0.0176; +0.0152; +0.0003; +0.0111 | +0.00866 | 4/5 | 0/5 |

Total: 150.000 semanas, 1.800.000 eventos sintéticos, 7.200.000 oportunidades planejadas. Deltas paired-valid acumulados: +49, -23 e +433 respectivamente. Deltas de oportunidades válidas operacionais CURRENT−WEEKLY: +36.082, +35.969, +35.969.

## Parecer
Disponibilidade operacional CURRENT consistentemente superior; sem superioridade preditiva paired-valid estatisticamente demonstrada. A âncora do sinal altera o mecanismo gerador dos resultados; streams isolados não provam causalidade nem validade em dados reais. Não mudar WEEKLY_FROZEN. Variação entre seeds não é IC de vantagem real.

## Pendências
Executar localmente `git pull --ff-only origin audit/simulation-lab-phase2-20261010` e `node --test tests/regression/simulation-guardrails.test.cjs` (esperados 25 testes). Inspecionar PR #43 antes de qualquer promoção; não efetuar merge sem autorização.
