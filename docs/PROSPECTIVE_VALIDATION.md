# Prospective Validation Log

## 30/09/2026 — frozen against 75-event baseline

Baseline used for prediction:
- 75 usable events;
- cut-off: 29/09/2026;
- objective evaluated here: **Nº 1 ou Último**;
- physical-position model;
- predictions reconstructed from the exact Dashboard V1 logic before adding 30/09 results.

### Morning — actual N=23

Dashboard context selected:
`manhã + N 21–25` (9 historical events).

Pre-result ranking:
1. physical 3 — 2 hits / 9 exposures; O/E 2.5353
2. physical 4 — 2 / 9; O/E 2.5353
3. physical 6 — 2 / 9; O/E 2.5353
4. physical 11 — 2 / 9; O/E 2.5353
5. physical 14 — 2 / 9; O/E 2.5353

Important: positions 3, 4, 6, 11 and 14 were statistically tied under the V1 score. The UI ordering was only the deterministic position-number tie-break, not evidence that 3 was stronger than 11.

Observed:
- Nº1 = physical 11
- Último = physical 23
- Nº2 = physical 7
- Cortesia = physical 16

Validation:
- displayed Top-1: MISS
- displayed Top-2: MISS
- tied leading cluster: HIT via physical 11

### Afternoon — actual N=24

Dashboard context selected:
`tarde + N 22–26` (8 historical events).

Pre-result ranking:
1. physical 2 — 3 hits / 8 exposures; O/E 4.5737
2. physical 18 — 3 / 8; O/E 4.5737
3. physical 20 — 2 / 7; O/E 3.5397
4. physical 12 — 2 / 8; O/E 3.0491
5. physical 22 — 2 / 8; O/E 3.0491

Observed:
- Nº1 = physical 11
- Último = physical 12
- Nº2 = physical 21
- Cortesia = physical 8

Validation:
- Dashboard Top-1: MISS
- Dashboard Top-2: MISS
- Dashboard Top-4: HIT via physical 12 (Último)

### Conversational constrained choice — physical 5 vs 9

The user had only positions 5 and 9 under consideration.
Recommendation given: physical 9.

Observed afternoon:
- physical 5 drew 15
- physical 9 drew 5
- neither produced Nº1, Cortesia or Último.

Validation:
- recommended 9 vs 5 for target Nº1/Último: MISS
- counterfactual 5 would also have missed.

## Model lesson

The 30/09 prospective check does **not** support treating a single displayed rank as materially superior when several candidates have identical or near-identical evidence.

Required dashboard improvement:
- expose tied/near-tied candidate clusters;
- separate "primary display order" from statistical score;
- report Top-1 / Top-2 / candidate-cluster hit rates prospectively;
- never count retrospective re-ranking as a predictive hit.


## 01/10/2026 — morning frozen pick

Pre-result state:
- user selected physical position **14**;
- period: morning;
- target: Nº1 or Último;
- selection basis: Methodology V2 descriptive leader for morning;
- status: **FROZEN BEFORE RESULT**.

This entry must not be changed after the draw except to append the observed outcome and validation result.
