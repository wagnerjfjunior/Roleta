# Identity reconciliation gate

This gate is mandatory for new nominal ingestion before broker-level statistics.

Flow:

1. preserve the observed/transcribed name;
2. compare it with `data/brokers-official.csv`;
3. exact official-name match may resolve automatically;
4. an explicitly maintained alias may resolve automatically;
5. fuzzy matching may only produce candidates;
6. manager/team may only reduce an already-plausible candidate set; it must never create an identity candidate;
7. every fuzzy/ambiguous result requires explicit human confirmation;
8. only `RESOLVED_EXACT`, `RESOLVED_ALIAS` or `CANONICAL_CONFIRMED` may have `canonical_for_statistics=true`;
9. `PENDING_HUMAN`, `UNKNOWN`, conflicts and unresolved identities are excluded from broker-level statistics.

Human confirmation must record `confirmed_by` and `confirmed_at`.

## 03/10/2026 quarantine

Participation of Sabrina/Brenda is confirmed for `03-10-I`, but her physical row is not safely identified in the available transcription. Therefore the event remains valid for positional/permutation analysis, while its nominal identity mapping is quarantined from broker-level statistics until the row is human-confirmed.

## 06/10 rule

Do not promote any 06/10 nominal row into broker-level canonical statistics until this gate has been applied and all ambiguous identities have either been confirmed or explicitly quarantined.
