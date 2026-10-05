# Roleta — Next Safe Action

## RLT-M5-01 — Week 05–11/10 Frozen

### Canonical state
- 83 logical canonical events;
- 82 validated complete permutations;
- 79 quality A / 4 quality B;
- 04/10/2026 incorporated as two distinct events: morning + afternoon;
- policy locked before cutoff: `PROSPECTIVE-V1.0.0`;
- model: `period_raw_global_fallback`;
- model version: `RLT-M5-WEEKLY-V1`;
- primary endpoint: 2X = Nº1 OR Último.

### Frozen at 2026-10-04T20:04:19-03:00
Generated from the 83-event canonical result ledger with `data_cutoff=04-10-T`:
- 48 `WEEKLY_FROZEN` recommendations — immutable;
- 48 initial `CURRENT` recommendations — DRAFT/revisable until each target event freeze;
- 48 `RANDOM_SHADOW` deterministic chains — frozen.

Initial period allocations, in family order Wagner / Laura / Brenda / Helena:
- morning: `14 / 3 / 5 / 4`;
- afternoon: `22 / 18 / 16 / 20`;
- integral: `21 / 4 / 8 / 12`.

### Current invariants
- WEEKLY_FROZEN never changes;
- CURRENT recalculates after every newly incorporated real roulette for all unresolved future events;
- CURRENT is frozen only before the operational choice for its target event;
- RANDOM_SHADOW chain is frozen before outcomes;
- recommendation != execution != outcome;
- no hindsight credit;
- no model shopping after cutoff;
- 3X/4X remain exploratory;
- the system may conclude COMPATÍVEL COM ACASO.

### Next safe action
1. Validate the RLT-M5-01 Overview locally via SFJM/LVR.
2. Confirm the weekly panel labels WEEKLY_FROZEN as **Oficial**.
3. Confirm CURRENT is shown only as **Diagnóstico** and never as an automatic replacement for the official number.
4. Confirm the status mark on each row adjudicates the official WEEKLY_FROZEN recommendation.
5. Confirm the weekly frozen numbers still come unchanged from `data/prospective/recommendations.jsonl`.
6. Confirm scorecard remains `AMOSTRA_INICIAL` until real target events are adjudicated.
7. On the next real roulette:
   - transcribe/ingest using the established canonical workflow;
   - adjudicate WEEKLY_FROZEN as the official recommendation;
   - retain CURRENT as a separately scored diagnostic track;
   - record EXECUTED_CHOICE independently;
   - never rewrite prior recommendations.
8. Backfill missing nominal full-sheet coverage for 02/10 and 03/10 as a data-quality follow-up; this does not alter the already frozen V1 week.

### SFJM
- branch: `feat/rlt-m4-01-simulation-lab-v1-20261004`;
- PR #3 remains Draft;
- LOCAL-FIRST / LVR;
- preferred port 8082;
- NO PREVIEW;
- NO REMOTE ITERATION;
- no merge without explicit approval;
- no production without explicit approval.


## RLT-M4-07 — Weekly Frozen vs Current

Implemented on the active branch without changing the frozen real-week policy.

### Next simulation gate
Run the first paired control:
- weeks: 10,000;
- scenario: NULL;
- signal strength: 0;
- seed: `weekly-duel-2026`.

First NULL v1 observation:
- Weekly O/E 0.993;
- Current O/E 0.996;
- Random O/E 1.004;
- NULL behavior passed, but valid-opportunity counts differed, so raw hit delta was not a fair strategy-quality comparison.

RLT-M4-07-v2 gate:
- rerun 10,000 weeks / NULL / same seed after paired-valid correction;
- operational block may show different valid-opportunity counts;
- paired-valid Weekly and Current must have exactly the same opportunity count and theoretical expected total;
- paired-valid Δ O/E must remain approximately 0;
- paired-valid Δ excess must remain approximately 0;
- Current must not show persistent artificial advantage merely because it recalculates after each event;
- churn may be non-zero, but helpful and harmful revisions should balance under NULL.

If NULL passes, run in order:
1. Stable period signal · 3%;
2. Regime shift · 3%;
3. Weak signal + noise · 1%.

Do not change `PROSPECTIVE-V1.0.0` or the already frozen real week based on these simulations. RLT-M4-07 evaluates the update mechanism only.


### 50,000-week paired-valid evidence

Accepted:
- NULL / 50,000 weeks / seed weekly-duel-2026:
  - Weekly paired-valid O/E 0.99906;
  - Current paired-valid O/E 0.99740;
  - mean Δ O/E -0.00191;
  - mean Δ hits/week -0.00746;
  - verdict: NULL PASS; no artificial Current advantage.
- Stable period / 3% / 50,000 weeks:
  - Weekly paired-valid O/E 1.04710;
  - Current paired-valid O/E 1.04653;
  - mean Δ O/E -0.00054;
  - verdict: both capture stable signal similarly; recalculation adds no material value in this scenario.

Rejected / rerun required:
- regime_shift export: test metadata says regime_shift but result payload says stable_period; invalid audit pair and must be rerun after export-binding fix.
- weak_noise was run at 3%; canonical planned gate remains 1%.

Audit fixes added:
- explicit zero signal strength is preserved;
- export disabled while a run is active;
- result scenario/strength must match the initiating test definition before save/export.

Final RLT-M4-07-v2 gate:
- regime_shift · 3% · 50,000 weeks: Weekly paired-valid O/E 1.061997 vs Current 1.057276; mean Δ O/E -0.004720.
- weak_noise · 1% · 50,000 weeks: Weekly paired-valid O/E 1.017500 vs Current 1.013143; mean Δ O/E -0.004238.

Decision: RLT-M4-07-v2 is CLOSED for the V1 operational question. WEEKLY_FROZEN is the official recommendation; CURRENT remains diagnostic only.
