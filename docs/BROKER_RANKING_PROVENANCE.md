# Broker ranking provenance

## Active statistical universe

The active broker ranking is derived exclusively from reproducible nominal data.

Current state:
- canonical positional events: 86;
- auditable nominal events: 50;
- auditable nominal rows: 1023;
- identity-blocked events: 03-10-I.

The active broker TOP 5 and family statistics use only this auditable nominal universe.

## Legacy snapshot

`data/legacy/broker-stats-v3-2026-10-06.json` preserves the previous dashboard snapshot:
- declared validated events: 83;
- declared validated rows: 1755.

This snapshot is marked `LEGACY_NON_REPRODUCIBLE`.

Reason: repository history at the same revisions contains `data/full_draws_reconstructed.csv` with approximately 1022 nominal data rows, while the legacy aggregate declares 1692 rows on 04/10 and 1755 rows on 06/10. The declared source `full_draws_reconstructed_v9.csv` was not versioned in the repository. Therefore the aggregate does not currently have a reproducible row-level lineage.

## Policy

1. Never use the legacy snapshot as active canonical input.
2. Preserve it only as historical evidence for comparison and backfill.
3. Reconstruct missing nominal events only from row-level evidence.
4. Apply the identity-reconciliation gate before statistical promotion.
5. Do not silently merge legacy aggregate counts into auditable row-level statistics.
6. UI must display the active nominal coverage denominator.

## Recovery objective

Backfill the missing nominal event coverage until the auditable nominal universe converges with the canonical positional universe where row-level evidence exists. Each recovered event must preserve source, observed name, reconciliation status and canonical identity state.
