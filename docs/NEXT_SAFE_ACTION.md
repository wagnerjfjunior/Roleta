# Roleta — Next Safe Action

## RLT-M5-01 — Prospective Recommendation Ledger

### Current gate
- statistical review: PASS_WITH_RESIDUAL_RISK;
- software systems architecture review: PASS_WITH_RESIDUAL_RISK;
- canonical protocol: `docs/PROSPECTIVE_LEDGER.md`;
- prototype branch: `feat/rlt-m4-01-simulation-lab-v1-20261004`;
- no merge / no production until explicit approval.

### Next safe action
1. Validate the first RLT-M5-01 prototype locally via SFJM/LVR.
2. Confirm that Overview replaces only the redundant "Minha família / Resumo histórico" card with "Pré-cravados da semana".
3. Confirm Monday-Friday dates and both weekday periods are visible, plus Saturday/Sunday.
4. Confirm all four people are visible: Wagner, Laura, Brenda, Helena.
5. Confirm prototype placeholders remain `—` until a recommendation is genuinely generated and frozen; do not invent numbers.
6. Confirm the visual states for:
   - Pré-cravado / WEEKLY_FROZEN;
   - Atual / CURRENT;
   - Histórico de revisions;
   - Usado / EXECUTED_CHOICE;
   - pending / green HIT / red MISS.
7. Confirm prospective scorecard remains explicitly non-conclusive with zero evidence in prototype mode.
8. After visual approval, implement the append-only ledgers:
   - recommendations.jsonl;
   - executions.jsonl;
   - adjudications.jsonl;
   - derived scorecard.json.
9. Only after ledgers and anti-hindsight tests pass, generate real weekly frozen/current recommendations.
10. Continue to receive 04/10/2026 morning and afternoon as distinct canonical real events when supplied; do not create an integral event for the election Sunday.

### Prospective invariants
- recommendation != execution != outcome;
- WEEKLY_FROZEN and CURRENT are separate prospective strategies;
- each new real roulette may recalculate ALL future unresolved events, including weekend;
- frozen/adjudicated recommendations are immutable;
- no hindsight credit;
- manual override is not random;
- Random Shadow is a control, not the definition of theoretical chance;
- primary endpoint = 2X (Nº1 OR Último);
- 3X/4X remain exploratory in V1;
- materially changed algorithm/policy starts a new version/epoch;
- the system must be able to conclude COMPATÍVEL COM ACASO.

### Calendar
- Monday-Friday: morning + afternoon;
- normal Saturday/Sunday: one integral roulette/day;
- 04/10/2026: morning + afternoon;
- 25/10/2026: morning + afternoon only if there is a second round.

### SFJM delivery
- LOCAL-FIRST / LVR;
- preferred port 8082;
- route `/`;
- same branch for corrections;
- NO PREVIEW;
- NO REMOTE ITERATION;
- merge only after explicit authorization;
- production only after explicit authorization.

### Blocks
NO NAME INFERENCE; NO COMPLEMENT INFERENCE; NO POSITION COLLAPSE; NO PREDICTIVE CLAIM; NO HINDSIGHT CREDIT; NO PREVIEW; NO REMOTE ITERATION; NO IMPLICIT MERGE; NO IMPLICIT DEPLOY; NO INVENTED PROSPECTIVE NUMBERS; NO TRUST IN DISPUTED PRESENCE OVERRIDES.
