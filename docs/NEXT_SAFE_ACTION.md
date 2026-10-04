# Roleta — Next Safe Action

## RLT-M5-01 — 20:00 Cutoff Readiness

### READY STATE
The prospective system is prepared before the 04/10/2026 results cutoff.

Locked before results:
- policy: `PROSPECTIVE-V1.0.0`;
- model: `period_raw_global_fallback`;
- model version: `RLT-M5-WEEKLY-V1`;
- primary endpoint: 2X = Nº1 OR Último;
- WEEKLY_FROZEN and CURRENT use the same algorithm and differ only by data cutoff;
- Adaptive Meta remains laboratory-only;
- no model may be switched after seeing today's results.

Implemented:
- canonical policy file;
- append-only recommendation ledger;
- append-only execution ledger;
- append-only adjudication ledger;
- derived scorecard;
- weekly batch generator;
- deterministic Random Shadow;
- Overview reads the canonical ledgers;
- anti-hindsight dry-run: PASS.

### Next safe action after 20:00 America/Sao_Paulo
1. Receive the two real 04/10/2026 roulettes separately:
   - morning;
   - afternoon.
2. Validate each sheet and preserve physical positions/gaps.
3. Incorporate both as distinct canonical real events.
4. Confirm the final real-data cutoff after the afternoon event.
5. Run the already-locked V1 batch generator against the canonical dataset.
6. Generate for 05–11/10/2026:
   - 48 WEEKLY_FROZEN recommendations;
   - 48 initial CURRENT recommendations;
   - 48 deterministic RANDOM_SHADOW chains.
7. Freeze records with:
   - data cutoff;
   - policy/model version;
   - policy blob SHA as config hash;
   - generated/frozen timestamp;
   - primary and two fallbacks.
8. Rebuild the derived scorecard.
9. Validate the Overview.
10. Do not alter model policy based on the 04/10 outcomes.

### Calendar
- Monday-Friday: morning + afternoon;
- normal Saturday/Sunday: integral;
- 04/10/2026: morning + afternoon;
- 25/10/2026: morning + afternoon only if a second round occurs.

### SFJM delivery
- branch: `feat/rlt-m4-01-simulation-lab-v1-20261004`;
- PR: #3 draft;
- LOCAL-FIRST / LVR;
- preferred port 8082;
- route `/`;
- NO PREVIEW;
- NO REMOTE ITERATION;
- no merge without explicit approval;
- no production without explicit approval.

### Blocks
NO MODEL SHOPPING AFTER CUTOFF; NO NAME INFERENCE; NO COMPLEMENT INFERENCE; NO POSITION COLLAPSE; NO PREDICTIVE CLAIM; NO HINDSIGHT CREDIT; NO INVENTED NUMBERS; NO IMPLICIT MERGE; NO IMPLICIT DEPLOY.
