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
I/O and composition.

- `services/dashboard-service.js`: loads canonical sources and composes a dashboard model by calling `core/*`.

### ui/
Presentation only.

- `ui/dashboard-renderers.js`: renders already-derived values.
- `ui/workspace.js`: page composition/navigation and display-only components.

UI files may not parse canonical CSV, calculate rankings, infer identities, resolve managers, count presence, decide eligibility, or read canonical source files directly.

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
