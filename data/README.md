# Data

## Canonical tabular baseline

`data/events.csv` is the version-control-friendly canonical export of the audited event table.

Current baseline:
- 75 usable events;
- 71 quality A;
- 4 quality B;
- cut-off: 29/09/2026.

The CSV preserves event source, date/period, N, occupied physical positions, physical/effective locations for Nº1, Nº2, Cortesia and Último, quality class and notes.

## Derived workbook

The analytical workbook `roleta_forensic_consolidado_75_roletas_ate_29-09-2026.xlsx` is a derived analysis artifact. Its logic is documented in `docs/METHODOLOGY.md`; all canonical event inputs required to reconstruct the analysis are preserved in `data/events.csv`.

## Update rule

1. append a new validated event;
2. preserve source/provenance;
3. classify A/B/quarantine;
4. never infer missing values merely to complete a permutation;
5. recalculate rankings and tests from the canonical event table.
