# RLT F2-03 — Golden files e homologação (2026-10-10)

## Escopo
Branch `audit/simulation-lab-phase2-20261010`, PR #43 (Draft). Somente laboratório Simulação; sem mudança na política semanal congelada, dados canônicos, `main` ou produção.

## Evidência verificada
- Export do usuário `roleta-weekly-duel-1791635229242.json`, `exported_at=2026-10-10T12:27:09.240Z`.
- `RLT-M4-07-multiseed-v1`; cenário `null`, `seed_prefix=weekly-duel-2026`; 5 seeds × 10.000 semanas × 12 eventos = 600.000 eventos sintéticos.
- Golden **observacional**: `tests/golden/weekly-duel-multiseed-null-20261010.json`. Contém métricas selecionadas de cada seed e totais; não contém os 86 eventos canônicos nem a sequência completa das 50.000 semanas.
- Teste `tests/regression/simulation-guardrails.test.cjs` valida invariantes do golden, independência de seeds, bootstrap e determinismo sobre uma fixture sintética de nove eventos.
- Teste local relatado pelo usuário em `a8d88bf`: 10/10 aprovados, 0 falhas. Esta é evidência local, não CI.

## Limite de reprodutibilidade
**Não afirmar** que o golden observacional reproduz exatamente o export real. A mesma seed não basta: o motor usa `realEvents` recebidos da UI. Para replay exato, fixar (1) revisão do motor, (2) versão e conteúdo do dataset, (3) regras de normalização e ordem de `realEvents`, (4) configuração completa, (5) formato dos resultados. O manifest atualmente declara `2026-10-06-86`, 86 eventos (82 A/4 B), mas o export do usuário não contém hash nem snapshot ordenado de `realEvents`.

## Critérios antes de promover
1. Rodar `node --test tests/regression/simulation-guardrails.test.cjs` no HEAD da branch.
2. Confirmar checks de CI no HEAD.
3. Fixar um fixture canônico **derivado** com proveniência e hash, sem alterar fontes originais.
4. Reexecutar o motor contra o fixture e comparar valores/estrutura com o golden; divergência exige investigação, não atualização silenciosa do golden.
5. Testar Web Workers em browser (incluindo `RoletaDomainCore`), export JSON e cancelamento.
6. Solicitar autorização explícita para merge/deploy.

## Comandos locais
```sh
cd "/Users/WagnerFernandes/SFJM/projects/Roleta"
git switch audit/simulation-lab-phase2-20261010
git pull --ff-only origin audit/simulation-lab-phase2-20261010
node --test tests/regression/simulation-guardrails.test.cjs
```
