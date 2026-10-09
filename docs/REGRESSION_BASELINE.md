# Regression baseline — Simulation Lab and Weekly Policy Duel

Status: initial executable guardrail; **not** full scientific homologation.
Reference commit: `2ca0165992c97a7e5db601863236788fe1f18729`.
Canonical manifest at reference: `2026-10-06-86` (86 events, 82 A / 4 B).

## Immutable expectations

- Same structural input, configuration, seed, and engine version produce identical outputs.
- Simulated permutations contain every effective position exactly once and preserve occupied physical positions.
- Weekly and Current comparisons must use matched opportunities; paired-valid expected values must agree.
- Synthetic runs must not be written into the canonical historical event ledger.
- Historical simulation outputs are evidence, not proof of predictive advantage.
- Any changed baseline requires a documented decision and an explicit review; never silently rewrite an expected result.

## Automated initial checks

Run `node --test tests/regression/simulation-guardrails.test.cjs` from repository root. Tests cover engine self-tests, deterministic reruns, paired-valid invariants, and manifest source-count consistency. These use small synthetic fixtures for fast execution; they do **not** reproduce historical million-event runs or independently verify statistical calibration.

## Evidence inventory

- `simulation/results/null-baseline-500x20-roleta-2026.json`: 500 × 20 × 624 = 6,240,000 synthetic events, partial summary.
- `docs/NEXT_SAFE_ACTION.md`: paired-valid weekly duel scenarios; four 50,000-week runs = 2,400,000 synthetic events.
- `docs/SIMULATION_LAB.md`: experiment families M4-01 through M4-07.
- Browser-only run histories: `roleta.simulation.runs.v1` (up to 25) and `roleta.weekly-duel.runs.v2` (up to 50). Not assumed recoverable from GitHub.

**At least 8,640,000 documented events** across the distinct committed summary and four weekly scenarios; not a complete count of all historical executions.

## Outstanding safeguards

- Independent walk-forward / no-future-information verification.
- Full canonical CSV parser, unique event identity, and quality checks.
- Historical fixed-seed golden files with tolerances and provenance.
- Versioned archive/export of browser-only experiment history.
- CI required check and branch protection (not enabled by this branch).
- Audit of hardcoded historical structural-source descriptions in UI.

Policy: LOCAL-FIRST / NO PREVIEW. No change to production or `main` without authorization.
