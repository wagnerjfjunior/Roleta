# Roleta — Current Handoff

## CURRENT STATE — 2026-10-04

canonical repo: `wagnerjfjunior/Roleta`
canonical production ref: `main`
last resolved main HEAD: `71f3b06425cb7cf8ccfbc82c779aefce8b389037`
active development branch: `feat/rlt-m4-01-simulation-lab-v1-20261004`

## Canonical data
- 81 logical events;
- 80 complete validated permutations;
- 77 quality A / 4 quality B;
- one partial event excluded from complete-permutation tests.

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

## NEXT SAFE ACTION
Validate RLT-M5-01 prototype locally via LVR. If visually/structurally approved, implement the canonical append-only recommendation/execution/adjudication ledgers and anti-hindsight tests before generating real weekly recommendations.

## Bootstrap
`Ative o SFJM do projeto Roleta, resolva main ao vivo em wagnerjfjunior/Roleta, leia .sfjm/project.json, handoffs/CURRENT.md, docs/NEXT_SAFE_ACTION.md e docs/PROSPECTIVE_LEDGER.md, recupere a branch ativa e continue somente pela próxima ação segura canônica.`
