# Data

## Canonical logical dataset

The canonical dataset is append-only and resolved through:

`data/manifest.json`

Current logical state:
- 77 usable events;
- 73 quality A;
- 4 quality B;
- cut-off: 30/09/2026.

Sources:
- `data/events.csv` — immutable 75-event baseline;
- `data/incoming/2026-09-30.csv` — 2-event append ledger.

Consumers must deduplicate by `Evento` and must not silently rewrite historical rows.

## Update rule

1. validate the new source;
2. write a dated append-only ledger;
3. add it to `data/manifest.json`;
4. preserve quarantine/duplicate evidence;
5. recalculate descriptive and inferential statistics;
6. freeze prospective predictions before looking at the new outcome.

The dashboard loads the manifest rather than assuming a single CSV.
