# SFJM F2-12 — Gate A production deployment checkpoint

Date: 2026-10-11
Shared Supabase project: `uobxxgzshrmbtjfdolxd` (Discador-MesaCliente)
Migration name: `roleta_f2_12_private_storage_gate_a_20261011`
Source SQL: `database/production-review/20261011_roleta_audit_storage_gate_a_candidate.sql`
Scope: isolated Roleta private storage bootstrap only. **Gate B CLOSED.**

## Authorization and execution

Operator authorized connection and technical production changes, with prospective write activation reserved as a separate gate. Before deployment, repository CI on commit `916fd8988996d519f08ea2d8a66445be948b160a` reported 5/5 PASS, including isolated PostgreSQL 17 storage rehearsal. Production catalog preflight confirmed PostgreSQL 17.6, pgcrypto installed in `extensions`, and target Roleta schema/roles absent. Existing default grants were reviewed; they apply to other schemas, not the new private `roleta_audit`.

Applied through Supabase migration API; result `success: true`.

## Independent post-deployment read-only assertions

- Schema `roleta_audit`: present.
- Roles `roleta_runtime` and `roleta_append_owner`: present, NOLOGIN and NOBYPASSRLS.
- Exactly one ordinary Roleta private table `roleta_audit.prospective_evidence`.
- `prospective_evidence`: **0 rows**.
- FORCE RLS: enabled.
- `authenticated` USAGE on private schema: false.
- `service_role` USAGE on private schema: false.
- `roleta_runtime` USAGE on private schema: false.
- `roleta_runtime` INSERT on evidence table: false.
- `authenticated` EXECUTE on append-only guard function: false.
- One enabled custom trigger on the evidence table.

**Only new Roleta objects were targeted.** No shared Discador/MesaCliente tables or grants were changed as part of Gate A.

## Status / boundaries

Gate A (storage + isolation): DEPLOYED.
Gate B (live append capture): NOT AUTHORIZED FOR ACTIVATION / NOT DEPLOYED.
No live authenticated append RPC exists. No production app endpoint was enabled. Roles lack runtime schema access and writing permission. SQL is **not retry-safe** by design: preflight aborts if schema/roles already exist; do not rerun it.

## Next safe action

1. Build the separate versioned V2 authenticated append RPC and test against an isolated PostgreSQL 17 instance. Verify canonical envelope equality, SHA256, signed actor/person authorization, per-event+person predecessor linkage, collision-safe idempotency, row lock and hash-chain serialization.
2. Establish the backend's constrained credential/role transport without exposing privileged tokens to browsers.
3. Rehearse negative effective privileges (especially service_role, anon, authenticated), multi-session concurrency and crash/replay tests.
4. Apply a separately named **additive** Gate A.2 migration for the write RPC only after reviewed tests pass. Gate B remains a distinct approval.
5. If rollback of Gate A storage is needed while it is empty, audit the exact objects and dependent permissions first. Never blind DROP CASCADE; preserve all other schema objects.
