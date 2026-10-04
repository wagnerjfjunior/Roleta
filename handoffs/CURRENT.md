# Roleta — Current Handoff

## CURRENT STATE — 2026-10-04

canonical repo: `wagnerjfjunior/Roleta`
canonical production ref: `main`
last resolved main HEAD: `71f3b06425cb7cf8ccfbc82c779aefce8b389037`
active development branch: `feat/rlt-m4-01-simulation-lab-v1-20261004`

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
Workspace V3 remains production-delivered from main. No RLT-M4/RLT-M5 work in this active branch is merged or deployed.

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

## 20:00 READINESS
The prospective pipeline is READY before the 04/10 results cutoff.

Locked policy:
- PROSPECTIVE-V1.0.0;
- period_raw_global_fallback;
- RLT-M5-WEEKLY-V1;
- 2X primary endpoint;
- policy blob 965a06b358d504325e87076e09fb9dff12862ca3;
- Adaptive Meta remains lab-only;
- no post-result model switching.

Infrastructure active on branch:
- recommendations.jsonl;
- executions.jsonl;
- adjudications.jsonl;
- scorecard.json;
- prospective/ledger.js;
- prospective/generator.js;
- Overview connected to canonical prospective ledgers.

Dry-run anti-hindsight: PASS.

After 20:00 the only required sequence is:
04/10 morning + afternoon ingestion -> validation -> final cutoff -> batch generation -> freeze -> scorecard/UI validation.

## NEXT SAFE ACTION
Receive and incorporate the two 04/10 real roulettes after 20:00, then execute the already-locked weekly batch. No methodology/model decision remains pending.

## Bootstrap
`Ative o SFJM do projeto Roleta, resolva main ao vivo em wagnerjfjunior/Roleta, leia .sfjm/project.json, handoffs/CURRENT.md, docs/NEXT_SAFE_ACTION.md e docs/PROSPECTIVE_LEDGER.md, recupere a branch ativa e continue somente pela próxima ação segura canônica.`
