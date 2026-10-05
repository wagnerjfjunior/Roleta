# RLT-M5-01 — Prospective Recommendation Ledger

## Status
ARCHITECTURE APPROVED WITH RESIDUAL RISK / PROTOTYPE IN PROGRESS

## Purpose
Create an auditable prospective layer that can answer, without hindsight, whether frozen model recommendations outperform chance in real roulettes.

This layer is independent from the canonical real-event ledger and from Simulation Lab data.

## Primary scientific question
Do recommendations frozen before each real roulette produce persistent and reproducible performance above the event-specific chance baseline?

## Confirmatory strategies
1. `WEEKLY_FROZEN` — recommendation produced before the operational week starts. This is the **official operational recommendation** for V1.
2. `CURRENT` — latest recommendation after incorporating newly completed real roulettes, recalculated for all unresolved future events. After RLT-M4-07-v2, this remains a **secondary diagnostic track** and does not automatically replace WEEKLY_FROZEN.

## Observational/control tracks
- `EXECUTED_CHOICE` — physical position actually used.
- `RANDOM_SHADOW` — reproducible random eligible control frozen before the event.
- theoretical chance — primary null benchmark, conditioned on event N and number of selected positions.

Executed choice is never silently reclassified as random.

Allowed execution origins:
- `MODEL_WEEKLY`
- `MODEL_CURRENT`
- `MANUAL_OVERRIDE`
- `RANDOM_GENERATED`

## Primary endpoint
2X = Nº1 OR Último.

3X and 4X remain exploratory until a later protocol version.

For two distinct selected positions in an event with N occupied positions, the null chance is evaluated event by event. The system must not replace varying event-specific probabilities with a single fixed hit-rate baseline.

## Locked V1 policy before the 04/10 cutoff

The real prospective V1 policy is locked before the 04/10/2026 evening results are incorporated.

- policy version: `PROSPECTIVE-V1.0.0`;
- model family: `period_raw_global_fallback`;
- model version: `RLT-M5-WEEKLY-V1`;
- policy blob SHA: `965a06b358d504325e87076e09fb9dff12862ca3`;
- primary endpoint: 2X = Nº1 OR Último;
- weekday context: period only;
- weekend context: integral when sufficient, otherwise global fallback;
- minimum exposure: 3;
- score: observed hits minus event-specific expected hits;
- family allocation order: Wagner, Laura, Brenda, Helena;
- primaries are distinct within the same target event;
- two deterministic fallbacks are frozen with each primary;
- WEEKLY_FROZEN and CURRENT use the same policy; only their data cutoff differs;
- Adaptive Meta remains LAB ONLY and cannot be selected after seeing 04/10 results;
- Context Raw is not used for weekly freeze because future target N is unknown at weekly freeze time.

This resolves the model-selection decision before the real cutoff and prevents retrospective model shopping.

## Core invariants
- position física != ordem efetiva != número sorteado;
- recommendation != execution != outcome;
- every recommendation is generated from data available strictly before the target event;
- every material recommendation revision is append-only;
- previous revisions are never overwritten;
- freeze is explicit;
- frozen recommendations are immutable;
- outcomes only adjudicate pre-existing records;
- no result may create, alter or improve a pre-result recommendation;
- a new observed roulette may recalculate ALL still-unresolved future events, including remaining weekdays, Saturday and Sunday;
- frozen/adjudicated events are never recalculated retroactively;
- simulation results never enter the real prospective ledger.

## Recommendation states
- `DRAFT`
- `SUPERSEDED`
- `FROZEN`
- `ADJUDICATED`
- `INVALIDATED_PRE_RESULT`

There is no `CORRECTED_AFTER_RESULT` state.

Administrative corrections must preserve the original record and add a separate correction/audit record.

## Canonical data separation

```
data/events.csv + data/incoming/*.csv
        ↓
CANONICAL REAL EVENTS

data/prospective/recommendations.jsonl
        ↓
CANONICAL PROSPECTIVE RECOMMENDATIONS

data/prospective/executions.jsonl
        ↓
CANONICAL EXECUTED CHOICES

data/prospective/adjudications.jsonl
        ↓
CANONICAL PROSPECTIVE EVALUATION

data/prospective/scorecard.json
        ↓
DERIVED VIEW ONLY
```

V1 prototype may use a read-only snapshot JSON before the append-only ledgers are activated. The snapshot is not evidence and must be labelled as prototype data.

## Required recommendation fields
- recommendation_id
- person_id
- target_event_id
- target_date
- target_period
- strategy
- physical_position
- previous_position
- revision_number
- generated_at
- data_cutoff
- trigger_event_id
- model_family
- model_version
- policy_version
- config_hash
- status
- is_frozen
- frozen_at
- supersedes_recommendation_id

## Required execution fields
- execution_id
- target_event_id
- person_id
- physical_position
- origin
- recorded_at
- matches_weekly
- matches_current

## Required adjudication fields
- adjudication_id
- recommendation_id
- target_event_id
- outcome_event_id
- N
- eligible_positions
- outcome_first
- outcome_second
- outcome_courtesy
- outcome_last
- hit_2x
- hit_3x
- hit_4x
- expected_probability_2x
- adjudicated_at

## Future-event identity
Use deterministic IDs independent of the observed outcome:
- weekday: `YYYY-MM-DD-manha`, `YYYY-MM-DD-tarde`
- normal weekend: `YYYY-MM-DD-integral`
- declared operational exceptions: explicit morning/afternoon IDs.

Known 2026 election exception:
- 04/10/2026: morning + afternoon.
- 25/10/2026: morning + afternoon only if a second round actually applies.

## Recalculation contract
After a new real event is incorporated and adjudicated:

1. preserve all existing frozen/adjudicated records;
2. update model state using only data up to the new canonical cutoff;
3. enumerate all future unresolved events;
4. calculate a new CURRENT recommendation for every eligible person/event;
5. append a revision only when a recommendation is generated;
6. link the new record using `supersedes_recommendation_id`;
7. preserve WEEKLY_FROZEN unchanged;
8. never use the target event's own result.

## Freeze contract
The operational freeze must happen before information specific to the target draw can influence the recommendation. V1 uses an explicit freeze action/state, not browser render time.

A freeze record must preserve:
- recommendation ID;
- timestamp;
- data cutoff;
- last incorporated event;
- model family/version;
- policy version;
- config hash;
- physical position.

## Model versioning / epochs
UI-only changes do not start a new experimental epoch.

Material changes to score, weights, thresholds, contexts, candidate models, fallback logic or eligibility rules require a new model/policy version. Evidence from materially different epochs must not be silently pooled.

## Statistical interpretation
Primary real-world comparison:
`WEEKLY_FROZEN 2X vs event-specific theoretical chance`.

Secondary diagnostic comparison:
`CURRENT 2X vs event-specific theoretical chance`.

RLT-M4-07-v2 showed no consistent simulated advantage from intra-week CURRENT recalculation across NULL, stable-signal, regime-shift and weak-signal/noise scenarios. Therefore CURRENT remains measured for scientific comparison, but V1 operational execution should not auto-switch away from the frozen weekly recommendation solely because CURRENT changed.

Random Shadow is an operational control, not the definition of chance.

Manual overrides are observational. They can be scored, but a better manual hit-rate does not by itself establish causal superiority because override decisions are selected rather than randomized.

Multiple people in the same roulette share one permutation; their outcomes are clustered by event and cannot automatically be counted as independent roulette trials.

## Evidence states
The application must support:
- `AMOSTRA_INICIAL`
- `EVIDENCIA_MUITO_LIMITADA`
- `INCONCLUSIVO`
- `EVIDENCIA_FAVORAVEL`
- `COMPATIVEL_COM_ACASO`

Raw green checks alone never promote a model.

The system must be allowed to conclude that there is no demonstrable advantage over chance.

## UI contract — Overview prototype
The redundant Overview card "Minha família / Resumo histórico" is replaced by "Pré-cravados da semana".

For each person and future event, show:
- official WEEKLY_FROZEN recommendation;
- CURRENT diagnostic recommendation;
- compact trajectory, e.g. `14 → 22 → 9`;
- executed position after choice;
- outcome status after adjudication.

Visual status:
- pending = unresolved;
- green check = hit;
- red X = miss.

The Family page remains unchanged and continues to provide historical family information.

A separate prospective scorecard compares:
- Weekly Frozen;
- Current;
- Executed;
- Random Shadow;
- theoretical expectation.

## Prototype boundary
RLT-M5-01 prototype is UI/data-contract validation only.

It MUST NOT:
- invent weekday recommendation numbers;
- treat placeholder data as frozen evidence;
- adjudicate unobserved events;
- mutate the canonical real-event dataset;
- claim predictive edge;
- deploy to production without explicit authorization.

## SFJM delivery
- canonical repository: `wagnerjfjunior/Roleta`;
- default branch: `main`;
- preferred local port: `8082`;
- local route: `/`;
- policy: LOCAL-FIRST / LVR;
- NO PREVIEW;
- NO REMOTE ITERATION;
- validate on the dedicated branch;
- corrections stay on the same branch;
- merge only after explicit approval;
- production only after explicit approval.

## Architecture gate
Statistical review: `PASS_WITH_RESIDUAL_RISK`.
Software Systems Architecture review: `PASS_WITH_RESIDUAL_RISK`.

Implementation is authorized only within the invariants above.

## Dry-run anti-hindsight verification

The prospective ledger core was executed in a synthetic dry-run before the 04/10 real cutoff.

Result: `PASS`.

Verified invariants:
- distinct family primary allocation;
- frozen recommendation immutability;
- target/outcome event identity guard;
- adjudication only from a frozen recommendation;
- deterministic Random Shadow generation.

Core blob SHA: `6650d9bdc4b6cbf43890c94ff0b4c271ac8ca2b0`.
Batch generator blob SHA: `3b7aac2b076e2e26c400f490a2ab3bfd819f5c93`.

At the 20:00+ cutoff, no statistical or model-selection decision remains open. The remaining operation is data ingestion, validation, batch generation and freeze.


## RLT-M4-07-v2 operational decision

The paired-valid Monte Carlo policy duel is closed for the V1 operational decision.

Observed behavior:
- NULL: Weekly and Current remained compatible with chance; Current did not manufacture artificial edge.
- stable signal: recalculation added no material advantage.
- regime shift: Current still did not outperform Weekly.
- weak signal + noise: Current was slightly worse than Weekly.

Decision for V1:
- `WEEKLY_FROZEN` is the official operational recommendation.
- `CURRENT` remains visible and scored as a diagnostic/experimental track.
- CURRENT does not automatically overwrite or supersede the weekly operational choice.
- the frozen real week 05–11/10/2026 is unchanged.
- this simulation decision does not establish real predictive edge; real-world validation against event-specific chance remains required.
