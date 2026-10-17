# SFJM F2-12 — Effective grants, migration gates and rollback (2026-10-10)

Status: **REVIEW ONLY — NOT APPROVED FOR PRODUCTION DDL OR WRITE TRAFFIC**.
Scope: `wagnerjfjunior/Roleta`; shared Supabase Discador-MesaCliente `uobxxgzshrmbtjfdolxd`, PostgreSQL 17.6.
Environment: LOCAL-FIRST / NO PREVIEW. Source of truth: F2-11 readiness document, PR #77 and read-only pg_catalog checks performed 2026-10-10.

## Evidence — production read-only inspection

- 10 non-system schemas inspected: auth, extensions, forensic_evidence, graphql, graphql_public, public, realtime, storage, supabase_migrations and vault.
- `public`: 44 ordinary tables with RLS, 30 with FORCE RLS, plus 8 views; `forensic_evidence`: two ordinary tables, both FORCE RLS. Count of views is **not** evidence of security_invoker: inspect view definitions separately before assuming they enforce caller RLS.
- `public` has schema USAGE for PUBLIC; this is **not** itself table-level DML. `forensic_evidence` does not grant schema USAGE to anon/authenticated/service_role.
- Existing `public` functions: 131 SECURITY DEFINER; 98 functions executable by authenticated (overlapping sets, not equivalent). Security Advisor reported 80 authenticated-executable SECURITY DEFINER findings, and seven tables with RLS and no policy; these belong to existing applications and must not be modified under the Roleta migration.
- 24 `pg_default_acl` entries. The future-objects defaults set by supabase_admin for public grant API roles broad privileges; the proposed Roleta objects must be created in their own private schema, with explicit owner and default ACL controls and no inherited application memberships.
- `roleta_audit`, `roleta_runtime`, `roleta_append_owner` do not exist as of inspection.
- Existing role inheritance: `anon` and `authenticated` have no parent memberships and do not bypass RLS; `service_role` bypasses RLS; `postgres` and `supabase_admin` have BYPASSRLS and must not be used as Roleta runtime/definer identities.
- F2-11 PR #77 is merged; **no production migration has been run**, and no writes have been authorized.

## Target effective privilege matrix (desired state, NOT current grants)

| Subject | roleta_audit schema | ledger tables | append function | other application schemas and objects | bypass RLS / memberships |
|---|---|---|---|---|---|
| Browser / anon / authenticated | no direct usage or table access | no DML | no direct execute | unchanged | no new privileges |
| Backend runtime (`roleta_runtime`) | USAGE only | no direct DML | EXECUTE for explicitly enumerated signature only | no new privileges | NOLOGIN, NOBYPASSRLS, no memberships |
| Function owner (`roleta_append_owner`) | USAGE only | narrowly scoped SELECT/INSERT as necessary for append | owns explicit hardened function only | no new privileges | NOLOGIN, NOBYPASSRLS, no memberships |
| Existing Discador/MesaCliente roles | unchanged | no newly granted access | no newly granted EXECUTE | unchanged | unchanged |
| Migration administrator | temporary deployment privileges only | migration/bootstrap | only reviewed creation | no existing-object privilege changes | never used for runtime |

The matrix is a **required post-migration test expectation**, not a verified current-state matrix for nonexistent roles. PUBLIC grants, schema ownership, role inheritance, ACLs and owner bypass must be tested using `has_schema_privilege`, `has_table_privilege`, `has_sequence_privilege`, `has_function_privilege`, `pg_has_role` and `pg_default_acl`. Schema-only checks are insufficient. For owned tables with FORCE RLS, policy conditions and the function owner's actual effective permissions must be validated against intended inserts and reads.

## Required migration design

1. Produce a dedicated, reviewed SQL migration for the shared production project, **separate** from disposable `*_ci` tests. No SQL should be executed in production during F2-12.
2. Create only new, private `roleta_audit` objects and dedicated roles; never modify existing `public`, `auth`, `storage`, `forensic_evidence` or Discador/MesaCliente grants, objects, data, policies or triggers.
3. Keep `roleta_audit` outside Supabase exposed PostgREST schemas. No privileged key, role choice or SQL access control exposed to browser code.
4. Revoke default function EXECUTE from PUBLIC **as part of the same migration transaction** before introducing callable routines. Explicitly grant a single signature to the runtime after verification. Fix definer `search_path`, schema-qualify all referenced relations/routines, forbid dynamic untrusted identifiers and parameterize inputs.
5. Use controlled, server-side verified user/session identity and authorization; do not trust a frontend-supplied user_id or unsigned app_metadata. Validate the backend role-selection path and connection-pool behaviour before claiming the NOLOGIN runtime can execute; a dedicated role is not usable without a safe execution mechanism.
6. Ensure append-only, idempotency, concurrency and revision semantics do not mutate historical evidence. A corrected event must produce an auditable superseding event rather than silent overwrite. Preserve WEEKLY_FROZEN semantics and frozen-week correction governance.
7. Explicit permissions on any sequences and any auxiliary objects must be verified; SQL must use the actual repository schema and constraints, not guessed object names.
8. Backups and restore feasibility must be established before Gate A; app read path should remain compatible with pre-migration state.

## Verification checklist — must PASS in isolated staging first

- Positive: authorized authenticated backend append; transactional idempotency and concurrency; only dedicated ledger rows readable as required.
- Negative: anon/authenticated direct table/function API access; cross-schema SELECT/INSERT/UPDATE/DELETE; restricted function-owner access to other private schema; owner and runtime access to pre-existing private evidence schema; PUBLIC implicit EXECUTE; function `search_path` injection; unauthorized or forged identity; replay; concurrent duplicate inserts.
- Inspect `pg_roles`, `pg_auth_members`, `pg_namespace`, `pg_class`, `pg_proc`, `pg_default_acl`, and explicit and inherited privilege checks.
- Confirm RLS and FORCE RLS, exact policy target, function ownership, prohibited table UPDATE/DELETE, no newly exposed schema, no modification to Discador/MesaCliente effective grants.
- Check PostgreSQL 17.6 version assumptions; test transaction timeouts, server-side connection pooling, and rollback after failure.
- Run repository CI, PostgreSQL integration tests, and repeat read-only baseline diff before Gate A.

## Deployment, disable and reversal

- **Gate A (separate explicit approval):** reviewed production migration plus backup/restore evidence and isolated-stage results. Create schema/roles/functions only; no prospective traffic.
- Validate production catalog and noninterference after Gate A; stop on privilege drift.
- **Gate B (separate explicit approval):** activate backend append traffic after identity, concurrency, and read-path verification.
- Emergency disable: turn off Roleta write feature flag and revoke the **new** runtime's dedicated function EXECUTE/connection path by a reviewed controlled operation. Do not revoke shared existing roles or modify Discador/MesaCliente grants.
- Roll back app deployment to compatible version; preserve `roleta_audit` ledger and freeze evidence. No automatic DROP schema, DROP data or deletion of audit records.
- Restore write service only after separate reauthorization and explicit reconnection tests. Keep audit log of all steps and snapshots.

## F2-12 open blockers / decision points

1. Inspect the precise Roleta data access implementation and currently committed migration/test scripts; GitHub connector code search was incomplete in this session. The main branch latest observed commit at the start of the session was `6e4d5b03dc9ad695c5073cda61abecd14732d550`. Do not presume workflow status.
2. Verify views' `security_invoker`, grants on individual objects and functions, role-setting and pooling mechanism, policy ownership, sequences and effective function owner access.
3. Draft and run an isolated staging rehearsal of the production-specific migration. It is **not** yet an executable production-ready SQL artifact.
4. Gate A / Gate B remain closed.

No DDL, DML or secrets were used to collect the production evidence above.


## Backup checkpoint and operator authorization — 2026-10-10

Operator reported completed local exports from shared Supabase PostgreSQL 17.6 using the IPv4 session pooler and PostgreSQL 18 client. Local directory (operator machine only): `~/Backups-Supabase/Discador-MesaCliente/20261010_201200_pre_F2-12/`.

- `database.dump`: custom-format database export, 2.8 MiB reported; archive read with pg_restore and SHA-256 verification reported OK. Export was generated with `--no-owner --no-acl`.
- `database-globals.sql`: `pg_dumpall --globals-only --no-role-passwords` completed; SHA-256 verification reported OK.
- `database-schema-acl.dump`: separate schema-only custom archive preserving ownership/ACL declarations; archive read and SHA-256 verification reported OK.
- Object inventories `backup-objects.txt` and `schema-objects.txt` generated.

This is operator-reported terminal evidence, not independently inspected backup bytes. Archives are stored on the operator's MacBook, not in GitHub. These operations did NOT test a working restore, backup of physical Supabase Storage objects, or a point-in-time-consistent snapshot across the three sequential exports. Existing shared application writes after export would not be covered by a whole-database restore; favor a non-destructive, Roleta-scoped disable/rollback plan.

The operator explicitly authorized necessary production changes during the F2-12 rollout in chat. **This is authorization in principle, not evidence that an executable migration is approved or tested.** Gate A execution remains conditional on a reviewed production-specific SQL migration, tested isolation/negative cases, verified runtime identity and connection mechanism, catalog baseline and targeted rollback. Gate B (prospective capture/write activation) remains distinct and closed until separately reviewed and authorized. No schema, role, function, or production data was modified as part of this checkpoint.

Read-only recheck on 2026-10-10: PostgreSQL 17.6; `roleta_audit`, `roleta_runtime`, and `roleta_append_owner` remain absent. `main` observed at `eb2dd08fd5b5115ae2f3f583da2a4717c7c5b299`.
