# RLT-M5-02 - Measurement Protocol and V2 Plan

Status: PLANNED. V1 data correction in progress.

## Why
The 05/10/2026 afternoon review exposed ambiguity between model-position performance, person execution, and person attribution.

Observed 05-10-T:
- WEEKLY_FROZEN afternoon: Wagner=22, Laura=18, Brenda=16, Helena=20.
- Physical 22 (Lutela) drew 8.
- Physical 18 (Wagner) drew 23 and was Last.
- Wagner used 18 instead of his assigned 22 because Laura was absent and final N was uncertain.
- Model position 22 = MISS. Model position 18 = HIT. Wagner executed 18 = HIT. Wagner weekly 22 = MISS.
- Position 18 remains a model-position hit originally allocated to Laura, but is not an execution hit by Laura.

## Mandatory layers

### MODEL_POSITION_RESULT
Evaluate every eligible model position regardless of who occupied it.
HIT_2X = N1 or Last.
MISS_2X = participated and neither N1 nor Last.
INELIGIBLE = recommended physical position did not participate.
Both hits and misses are mandatory.

### PERSON_EXECUTION_RESULT
For Wagner, Laura, Brenda and Helena record actual physical position and origin:
MODEL_WEEKLY, MODEL_CURRENT, MANUAL_OVERRIDE, BORROWED_FAMILY_PICK, RANDOM_GENERATED.
For BORROWED_FAMILY_PICK also record source_person_id.
Record matches_weekly, matches_current and result HIT_2X, MISS_2X, NOT_PRESENT or UNKNOWN.

### DECISION_COMPARISON
When execution differs from assigned model position and both positions are eligible, score both sides:
MODEL_HIT/HUMAN_HIT; MODEL_HIT/HUMAN_MISS; MODEL_MISS/HUMAN_HIT; MODEL_MISS/HUMAN_MISS.
No side may be omitted because it lost.

## Counting rules
Every eligible recommendation is a model opportunity and must become HIT or MISS.
Person absence or an override does not erase the model opportunity.
Execution is scored separately.
One outcome may feed distinct analytical views but cannot be double-counted inside one metric.
NOT_EXECUTED belongs only to execution analysis.
INELIGIBLE is only for a recommended position absent from the roulette.
WEEKLY_FROZEN stays immutable. CURRENT stays diagnostic. No hindsight edits.

## Required V2 scorecards
Model: attempts, hits, misses, hit rate, event-specific expected hits, O/E, excess.
Strategy: WEEKLY_FROZEN, CURRENT, RANDOM_SHADOW.
Family execution: attempts, hits, misses, hit rate.
Overrides: model vs human head-to-head.
Per person: followed model, manual override, borrowed family pick, and results by origin.
Daily cumulative trajectory, weekly total, ranking after each cutoff, and WEEKLY maintained/contested by CURRENT.

## 05/10 regression fixture
05-10-T:
pos22 -> Lutela -> drawn8 -> Wagner WEEKLY position = MISS.
pos18 -> Wagner -> drawn23 -> Last -> Laura WEEKLY position = HIT.
Wagner execution pos18 -> BORROWED_FAMILY_PICK from Laura -> HIT.
Laura must not receive an execution hit.
Wagner weekly 22 must not be labelled untested.

## Errors found
1. Attribution error: position 18 was initially described as a Laura execution hit.
2. Scoring error: Wagner position 22 was temporarily treated as untested.
3. Survivorship risk: hits without mandatory misses inflate apparent performance.
4. Layer conflation: recommendation, execution and outcome were insufficiently separated.
5. Counterfactual omission: overrides were not systematically compared with the assigned model position.

## V2 plan
Gate 1 schema: append-only model-position evaluation plus richer execution origin; preserve V1.
Gate 2 adjudicator: score physical model positions first, family execution second; add 05-10-T invariant tests.
Gate 3 scorecard: attempts/hits/misses and model-vs-human comparison with event-specific expectation.
Gate 4 Dashboard: model score, family/manual score, override head-to-head, per-person origin, daily reaffirmation.
Gate 5 regression: assert pos22 MISS, pos18 HIT, Wagner execution18 HIT, Laura no execution hit, frozen allocation immutable.
Gate 6 rollout: SFJM/LVR validation, explicit merge authorization, explicit production authorization.

## Scientific boundary
Manual performance is observational because overrides are selected rather than randomized. Report it transparently without claiming causal superiority from raw hit rate alone. The operational comparison remains: when the family chose differently from the model, which observed choice did better?
