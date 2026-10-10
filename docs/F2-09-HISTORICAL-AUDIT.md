# F2-09 — Auditoria inicial do histórico

Data: 2026-10-10. Branch audit/simulation-lab-phase2-20261010; PR #43 Draft. Nenhuma alteração em main, produção, política ou CSV canônico.

Fonte: data/manifest.json (2026-10-06-86) e seus oito CSVs declarados. União por Evento: 86 linhas, 86 IDs únicos; 86 com N>=4, posições ocupadas únicas em quantidade N, primeiro e último distintos e ocupados. 82 qualidade A; 4 qualidade B. Há 3 datas não preenchidas e 9 períodos desconhecidos, com sobreposição de 2 registros; 76 registros possuem data no formato DD/MM/AAAA e período manha/tarde/integral. Dez registros com lacunas: P01, P02, P09, P10, P12, P13, P17, P24, P30, 20-04.

Esses 76 são candidatos, NÃO backtest elegível comprovado: falta verificar disponibilidade temporal dos resultados, cronologia intradiária, campos ex-ante N/occupied e eventuais correções. Não inferir timestamps ausentes. O dataset não contém por si só previsões registradas antes do sorteio. Backtest walk-forward retrospectivo não é validação prospectiva ao vivo.

Próximo gate: auditar conflitos de mesmo dia/período, disponibilidade ex-ante de N/occupied, datas de divulgação, semana de congelamento e warm-up. Treino do evento t só pode conter resultados conhecidos antes do cutoff t. Separar paired-valid de disponibilidade operacional; não usar resultado de t ou posterior para gerar recomendação. Não alterar WEEKLY_FROZEN com esses dados.
