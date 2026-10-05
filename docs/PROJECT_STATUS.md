# Roleta — Project Status

## State — 2026-10-04

- canonical repository: `wagnerjfjunior/Roleta`.
- canonical production branch: `main`.
- resolved main HEAD for this work: `5dfd6fada53e6106be290419e19ded6ff1b621c9`.
- active development branch: `feat/rlt-m4-07-paired-valid-metrics-20261004`.
- branch was created from and remains based on current main; no remote preview is used.
- 83 logical canonical events.
- 82 validated complete permutations.
- 79 quality A / 4 quality B.
- 1 partial event outside complete-permutation tests.
- Workspace V3 is production-delivered on main.
- current viability state: EVIDÊNCIA INSUFICIENTE.
- no model has demonstrated robust real predictive edge.

## RLT-M4 Simulation Lab
- Monte Carlo laboratory remains isolated from canonical real data.
- RLT-M4-06 Adaptive Meta is implemented on the active branch.
- simulations validate methodology/robustness only and are not real predictive evidence.

## RLT-M5-01 Prospective Recommendation Ledger
- statistical gate: PASS_WITH_RESIDUAL_RISK.
- architecture gate: PASS_WITH_RESIDUAL_RISK.
- protocol canonicalized in `docs/PROSPECTIVE_LEDGER.md`.
- first UI/data-contract prototype implemented on the active branch.
- prototype uses `data/prospective/prototype-week.json`.
- prototype deliberately contains no invented recommendation numbers.
- Overview prototype replaces the redundant family summary card; the dedicated Family page remains unchanged.
- planned tracks: WEEKLY_FROZEN, CURRENT, EXECUTED_CHOICE, RANDOM_SHADOW, plus theoretical chance.
- primary confirmatory endpoint: 2X = Nº1 OR Último.
- 3X/4X are exploratory in V1.
- recommendation history is append-only; result never rewrites a frozen prediction.
- each new canonical roulette may recalculate all future unresolved events, including weekend.
- material model/policy changes require a new version/epoch.

## Real-event calendar
- weekdays: morning + afternoon.
- normal weekends: one integral event per day.
- 04/10/2026 election Sunday: morning + afternoon, not integral.
- 25/10/2026 uses the same exception only if there is a second round.

## Presence
Sabrina/Brenda and Laura counts for 28/09–02/10 remain contested. Original sheets/sources are authoritative; old overrides are not.

## Delivery / SFJM
- `.sfjm/project.json`: preferred port 8082, route `/`.
- policy: LOCAL-FIRST / LVR.
- `remoteIterationAllowed=false`.
- NO PREVIEW / NO REMOTE ITERATION.
- corrections remain on the active branch.
- merge requires explicit user approval.
- production requires explicit user approval.


## Nominal ledger consolidation
- `data/full_draws_reconstructed.csv` is now the GitHub-hosted consolidated nominal ledger available to this project.
- current imported nominal coverage: 48 events / 1022 participant rows, including 04/10 morning and afternoon.
- this nominal ledger is auxiliary and does NOT replace the 83-event canonical result ledger in `data/manifest.json`.
- 02/10 and 03/10 do not yet have full nominal transcription in the imported legacy source; their canonical event results remain valid in the 83-event ledger.
- no global model/statistical aggregate may be recomputed from the 48-event nominal subset as though it were complete.
- 04/10 afternoon correction: positions 12 and 13 excluded; Sabrina p11 → nº12 → Último; Wagner p14 → nº9.


## Prospective week 05–11/10 frozen
- freeze timestamp: `2026-10-04T20:04:19-03:00`;
- data cutoff: `04-10-T`;
- canonical source universe: 83 events;
- 48 WEEKLY_FROZEN recommendations written;
- 48 initial CURRENT recommendations written as DRAFT/revisable;
- 48 deterministic RANDOM_SHADOW chains written and frozen;
- period allocations, family order Wagner / Laura / Brenda / Helena:
  - morning: 14 / 3 / 5 / 4;
  - afternoon: 22 / 18 / 16 / 20;
  - integral: 21 / 4 / 8 / 12;
- scorecard remains AMOSTRA_INICIAL until real target events are adjudicated.


## RLT-M4-07
Weekly Frozen vs Current paired-week laboratory is implemented on the active branch.
It compares fixed weekly predictions, continuously recalculated Current suggestions and a random control on the same synthetic weeks.
This is simulation-only and cannot mutate the frozen real prospective week.


## RLT-M4-07-v2 decision
Monte Carlo paired-valid policy duel completed at 50,000 weeks per canonical scenario.

Operational conclusion:
- WEEKLY_FROZEN becomes the official V1 recommendation surface.
- CURRENT remains a secondary diagnostic/experimental track.
- no automatic operational replacement occurs when CURRENT diverges from WEEKLY_FROZEN.
- this does not establish real predictive edge; the next evidence phase is prospective real-event validation against theoretical chance.

Key paired-valid findings:
- NULL: no artificial Current advantage.
- Stable period 3%: essentially neutral, slight Weekly advantage.
- Regime shift 3%: Weekly remained ahead.
- Weak signal + noise 1%: Weekly remained ahead.
