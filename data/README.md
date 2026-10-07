# Data

## Canonical logical dataset

The canonical dataset is append-only and resolved through:

`data/manifest.json`

Current logical state:
- 85 canonical events;
- 81 quality A;
- 4 quality B;
- cut-off: 05/10/2026.

Sources are defined exclusively by `data/manifest.json`. The immutable 75-event baseline is extended by dated append-only ledgers through `data/incoming/2026-10-05.csv`.

Consumers must deduplicate by `Evento` and must not silently rewrite historical rows.

## Update rule

1. validate the new source;
2. write a dated append-only ledger;
3. add it to `data/manifest.json`;
4. preserve quarantine/duplicate evidence;
5. recalculate descriptive and inferential statistics;
6. freeze prospective predictions before looking at the new outcome.

The dashboard loads the manifest rather than assuming a single CSV.


## Full-sheet transcription rule

New roulette sheets are ingested in two layers:

1. **Primary transcription layer** — every visible roulette row is transcribed from the source sheet, preserving:
   - physical position;
   - broker name as written;
   - drawn number;
      - empty/crossed rows;
   - divider/bar;
   - annotations below the bar, explicitly excluded from N/permutation.
2. **Derived event layer** — `data/incoming/YYYY-MM-DD.csv` stores N, occupied physical positions, Nº1, Nº2, Cortesia and Último derived from the full transcription.

Manager is not part of the canonical roulette transcription and is intentionally excluded.

The derived event row must never replace the full-sheet transcription. Full transcription is the source for broker participation, drawn-number history, presence and broker-level statistics.

For 04/10/2026 the primary source is:
`data/transcriptions/2026-10-04.csv`.


## Consolidated nominal ledger

`data/full_draws_reconstructed.csv` is the repository-local nominal history currently available for broker-level audit. It preserves the established schema:
`event_id,date,period,N,physical_position,effective_order,drawn_number,broker_name_raw,broker_name_normalized,is_family,transcription_confidence,source,row_status,event_status`.

Current imported coverage is 51 events / 1093 participant rows. It is auxiliary. The canonical event universe for model generation is the de-duplicated 85-event result ledger defined by `data/manifest.json`.

03/10 is transcribed but its nominal identity mapping is quarantined as `PENDING_HUMAN_IDENTITY`: participation of Sabrina is confirmed while her physical row is unresolved. These rows must not feed broker-level statistics until the reconciliation case is human-confirmed.

For all new nominal ingestion, apply `docs/IDENTITY_RECONCILIATION.md` and `reconciliation/identity.js`. Team/manager is a tie-break only; fuzzy/ambiguous identity never becomes statistical canon without human confirmation.

Do not derive global model conclusions from the nominal subset until nominal coverage reaches the canonical event set.
