# Roleta — Current Handoff

## CURRENT STATE — 2026-10-04

canonical repo: `wagnerjfjunior/Roleta`
canonical production ref: `main`
last resolved main HEAD: `5dfd6fada53e6106be290419e19ded6ff1b621c9`
active development branch: `feat/rlt-m4-07-paired-valid-metrics-20261004`

## Canonical data
- 83 logical events;
- 82 complete validated permutations;
- 79 quality A / 4 quality B;
- one partial event excluded from complete-permutation tests.

## Nominal ledger
- GitHub consolidated nominal file: `data/full_draws_reconstructed.csv`.
- imported coverage: 48 events / 1022 participant rows.
- canonical result ledger remains 83 events and is authoritative for model generation.
- 02/10 and 03/10 nominal full-sheet backfill remains a data-quality follow-up, not a blocker for the prospective weekly freeze.
- 04/10-T corrected: p12/p13 crossed out; Sabrina p11 drew 12 = Último; Wagner p14 drew 9.

## Production
PR #3 is merged into main. RLT-M4/RLT-M5 simulation/prospective work is now canonical in repository main. No production deploy was performed as part of the merge.

## Active branch
The active branch contains:
- Simulation Lab through RLT-M4-06 Adaptive Meta;
- canonical Simulation Lab documentation;
- RLT-M5-01 prospective statistical/architecture protocol;
- first RLT-M5-01 weekly Overview prototype.

## RLT-M5-01 decision
Two review gates completed:
- Statistical Modeling / Experimentation: PASS_WITH_RESIDUAL_RISK.
- Software Systems Architecture: PASS_WITH_RESIDUAL_RISK.

Canonical protocol:
`docs/PROSPECTIVE_LEDGER.md`

Core contract:
- WEEKLY_FROZEN = pre-cravado before the week;
- CURRENT = recommendation revised after newly completed real roulettes;
- EXECUTED_CHOICE = position actually used;
- RANDOM_SHADOW = frozen random operational control;
- theoretical chance = primary null benchmark;
- primary endpoint = 2X;
- all revisions append-only;
- each new real roulette can recalculate every still-unresolved future event;
- frozen/adjudicated records never change;
- no hindsight;
- model may ultimately be classified COMPATÍVEL COM ACASO.

## Prototype
Files:
- `data/prospective/prototype-week.json`
- `prospective/ui.js`
- `docs/PROSPECTIVE_LEDGER.md`
- supporting styles in `styles.css`
- script registration in `index.html`

Prototype behavior:
- replaces only the redundant Overview family-summary card;
- dedicated Family page remains intact;
- shows week 05–11/10/2026;
- weekdays expose morning/afternoon events;
- Saturday/Sunday expose integral events;
- Wagner, Laura, Brenda and Helena appear in every event;
- displays Pré / Atual / Histórico / Usado / result status;
- no predictive number is invented: placeholders remain `—` until real generation/freeze exists;
- prospective scorecard starts at zero and is explicitly non-conclusive;
- historical morning/afternoon ranking cards were removed from Overview and moved to Modelos & estatística with explicit NÃO PROSPECTIVO labeling.

## Election exception
04/10/2026 remains two separate events: morning and afternoon.
Do not create an integral event for 04/10.
25/10 follows the same dual-event rule only if a second round occurs.

## Presence
Sabrina/Brenda and Laura 28/09–02/10 remain contested. Reconcile from original sources only.

## SFJM
- LOCAL-FIRST / LVR;
- preferred port 8082;
- route `/`;
- NO PREVIEW;
- NO REMOTE ITERATION;
- same branch for corrections;
- merge only after explicit approval;
- production only after explicit approval.

## PROSPECTIVE WEEK 05–11/10 — FROZEN
Freeze timestamp: `2026-10-04T20:04:19-03:00`.
Cutoff: `04-10-T`.

Generated from 83 canonical events:
- 48 WEEKLY_FROZEN — immutable;
- 48 CURRENT initial — DRAFT/revisable;
- 48 RANDOM_SHADOW deterministic chains — frozen.

Initial allocations in order Wagner / Laura / Brenda / Helena:
- morning: 14 / 3 / 5 / 4;
- afternoon: 22 / 18 / 16 / 20;
- integral: 21 / 4 / 8 / 12.

Important correction:
CURRENT is not frozen for the entire week. It remains revisable and is frozen only before the operational choice for its own target event.

## NEXT SAFE ACTION
Validate the frozen RLT-M5-01 weekly panel locally via SFJM/LVR. Then continue event-by-event adjudication/recalculation with no hindsight.

## Bootstrap
`Ative o SFJM do projeto Roleta, resolva main ao vivo em wagnerjfjunior/Roleta, leia .sfjm/project.json, handoffs/CURRENT.md, docs/NEXT_SAFE_ACTION.md e docs/PROSPECTIVE_LEDGER.md, recupere a branch ativa e continue somente pela próxima ação segura canônica.`


## RLT-M4-07 Weekly Frozen vs Current
Implemented on the active branch:
- `simulation/weekly-duel.js`;
- `simulation/weekly-duel-worker.js`;
- `simulation/weekly-duel-ui.js`.

Purpose:
test whether intra-week Current recalculation adds value over Weekly Frozen using paired complete synthetic weeks while keeping the real V1 policy fixed.

First required control: 10,000 weeks / NULL / seed `weekly-duel-2026`.
No simulation result may rewrite the live frozen week 05–11/10.


## RLT-M4-07-v2 paired-valid correction
The first 10,000-week NULL run returned Weekly O/E 0.993, Current O/E 0.996 and Random O/E 1.004, which is compatible with chance.

However, Weekly and Current had different valid-opportunity counts due to primary/fallback eligibility. Therefore raw hit delta is not a fair quality comparison.

New branch:
`feat/rlt-m4-07-paired-valid-metrics-20261004`

RLT-M4-07-v2 now reports:
- operational eligibility/coverage separately;
- paired-valid quality only where both strategies have valid positions for the same person/event;
- paired-valid Δ hits;
- paired-valid Δ O/E;
- paired-valid Δ excess over chance;
- paired-valid win rates and quantiles.

Next gate: rerun 10,000-week NULL with seed `weekly-duel-2026`. Do not proceed to signal scenarios until paired-valid NULL passes.
