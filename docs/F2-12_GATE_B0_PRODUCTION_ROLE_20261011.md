# SFJM F2-12 Gate B.0 — credentialless runtime role deployed (2026-10-11)

## Evidence
Production shared Supabase project `uobxxgzshrmbtjfdolxd`; additive migration `roleta_f2_12_gate_b0_credentialless_function_writer_20261011`, source `database/production-review/20261011_roleta_v2_runtime_role_gate_b_candidate.sql`.
PG17 rehearsal and 4 other workflows 5/5 passed on commit `7494399b1e2bb4077489216aebb5de0fece8ead8`.

The dedicated role `roleta_v2_writer` is `LOGIN PASSWORD NULL NOINHERIT NOBYPASSRLS`, no superuser/create-role/create-db/replication rights, connection limit 3. No password was set. Role has USAGE only for private `roleta_audit` schema and EXECUTE only for the versioned V2 append function. No table SELECT, INSERT, UPDATE, DELETE, schema CREATE, or direct browser access were granted by this migration. There was no password material to leak into migration history.

Read-only independent production verification:
- `can_login: true`, `restricted: true`.
- `schema_usage: true`, `schema_create: false`.
- `function_execute: true`.
- `table_select: false`, `table_insert: false`.
- `browser_execute: false`.
- `evidence_count: 0`.

## Still closed
**Gate B writes are NOT active.** The role has no login password. Vercel has no `ROLETA_V2_DATABASE_URL` and no `ROLETA_V2_PERSON_ACL_JSON` (Google verified sub to canonical person IDs). `ROLETA_V2_WRITES_ENABLED` is absent/false by default in the new endpoint. The code remains only in Draft PR #80, not promoted to `main`.

## Remaining one-time activation
1. Provision a high-entropy role password **outside GitHub migrations and transcript**, preferably through a secret manager/rotatable connection credential. Store full TLS-verified restricted Postgres pooler connection string in a sensitive *server-only* Vercel environment variable.
2. Configure exact subject-to-person ACL based on actual verified OAuth `sub` claims and canonical broker IDs, not just email strings or untrusted client fields.
3. Confirm trusted event cutoff, chronology and person-bound authorization in synthetic and real pre-draw canary; backdated/outcome-leaking submissions must be rejected.
4. Set `ROLETA_V2_WRITES_ENABLED=true` only after server transport and adversarial write/retry tests pass, and promote PR under SFJM local-first authorization.

Neither operational Roleta Simples PDF/JPG/WhatsApp nor historical event ingestion depend on this Gate B role; they remain homologated and untouched.
