# Roleta — Architecture boundary

## Non-negotiable boundary

The browser presentation layer does not own business rules.

### core/
Pure domain logic. No DOM, no UI selectors, no HTML generation.

- `core/csv.js`: CSV parsing only.
- `core/events.js`: canonical event normalization and positional statistics.
- `core/brokers.js`: nominal broker statistics and canonical-name aggregation.
- `core/weekend.js`: presence/eligibility derivation.

### services/
Browser-facing I/O only.

- `services/dashboard-service.js`: loads only `data/dashboard-view.json`. It does not read canonical sources.

### ui/
Presentation only.

- `ui/dashboard-renderers.js`: renders already-derived values.
- `ui/workspace.js`: page composition/navigation and display-only components.

UI files may not parse canonical CSV, calculate rankings, infer identities, resolve managers, count presence, decide eligibility, or read canonical source files directly. `core/*` is build-time/domain code and is not loaded by `index.html`.

### app.js
Bootstrap only. It may:
1. request the dashboard model from the service;
2. call renderers;
3. mount the workspace;
4. publish the ready event.

It must not contain business rules or canonical data interpretation.

## Canonical identity rule

Broker-level statistics accept only rows whose identity is canonical under the identity-reconciliation gate. `PENDING_HUMAN_IDENTITY` is excluded until explicit confirmation.

## Derived statistics

`data/broker-stats-v3.json` is no longer an authority for the dashboard. Broker family totals, TOP 5 and recent-special attribution are derived from the validated nominal ledger plus canonical transcriptions through `core/brokers.js`.

## Anti-regression

`scripts/architecture-guard.js` is executed by GitHub Actions. It fails when business/data-source logic returns to `app.js` or `ui/*`, or when `core/*` starts depending on the DOM.

## Frontend data contract

`scripts/build-dashboard-view.js` is the only dashboard derivation entry point. It reads canonical data, applies identity quarantine and domain rules, and materializes `data/dashboard-view.json`.

The browser receives only this derived DTO. Canonical source files are not loaded by `app.js`, `ui/*`, or `services/dashboard-service.js`.

Additional nominal transcriptions must be explicitly registered in `data/dashboard-transcription-sources.json`; directory scanning is forbidden.
