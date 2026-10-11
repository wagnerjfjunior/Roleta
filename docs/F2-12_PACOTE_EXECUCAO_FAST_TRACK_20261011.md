# Pacote de execução F2-12 — Fast track (SEM ZIP)
Data: 2026-10-11 · Repositório: `wagnerjfjunior/Roleta`
PR #80 (`fix/f2-12-current-shadow-revisions-20261010`).
Objetivo: função auditável funcionando com segurança, sem alterar Discador/MesaCliente.

## Estado comprovado
- Gate A: **implantado** em Supabase `uobxxgzshrmbtjfdolxd`, schema `roleta_audit`, RLS FORCE e papéis dedicados.
- Gate A.2 SQL: **candidate tested only in disposable PostgreSQL 17**; NOT applied to production.
- Gate B: **off**. No route/automatic capture.
- Do NOT rerun Gate A; migration `roleta_f2_12_private_storage_gate_a_20261011` is already applied.
- Latest pre-package green baseline: `4f76e6c`, 5/5 CI.
- New V2 verified server boundary: `server/prospective-v2-verified-boundary.cjs`, tests added.

## EXECUTION TRACK — follow gates in order, stop on first failure

### P0 — Freeze baseline and establish running app trust boundary (REQUIRED)
1. Verify the actual Vercel auth middleware on the deployed Roleta app, its Google session verification and CSRF + origin handling. `session.verified` must be produced only by backend verification, never inferred from request/cookie text.
2. Identify the **persisted server-side actor → authorized person IDs mapping**. A client-supplied `authorizedPersonIds`, actor, Google sub, or email must never become authority.
3. Choose backend database transport (Supabase connection pooler/server process/edge runtime), with a distinct protected credential. Never put `postgres`, `service_role` keys or direct SQL access in browser bundles.
4. Do not unmask writes without all three prerequisites. Missing any item = stop at dry-run.

### P1 — Dry-run and code CI (NO production writes)
- Confirm CI checks on PR #80 (regression guardrails, audit regression, Gemini intake, F2-11 PG security, F2-12 PG17 rehearsal) all pass on SAME head commit.
- Run tests for `server/prospective-v2-verified-boundary.cjs`, `server/prospective-person-envelope-v2.cjs` and their tests.
- Validate request budget, verified session, origin+CSRF, ACL denial, digest tampering, cross-person predecessor, outcome closure and idempotency conflict.
- Run two true simultaneous DB sessions competing for same event/person revision and replay. Existing serial lock is global and conservative; verify lock ordering and timeout.

### P2 — Production preflight (SELECT only)
Run `database/production-review/F2_12_GATE_A2_PREFLIGHT_READONLY.sql` through Supabase. Expected `READY_FOR_A2_REVIEW_ONLY` with `row_count=0`.
Confirm `postgres` migration role can transfer function owner to `roleta_append_owner` in shared Supabase; disposable PG superuser success does not prove production transfer.
Take schema/grant snapshots + validate backup restoration capability before permission changes.

### P3 — Gate A.2 *function-only* migration (REQUIRES P0/P1/P2 PASS)
Source: `database/production-review/20261011_roleta_v2_private_append_gate_a2_candidate.sql`.
Apply ONCE via Supabase migration API with a unique descriptive name.
This migration creates a private function owned by a restricted NOLOGIN NOBYPASSRLS role, RLS policies, and narrow table SELECT/INSERT + identity-sequence rights for that role. It provides **no EXECUTE grants** to app users, `service_role`, `authenticated` or `roleta_runtime`.
Immediately verify pg_proc.proowner, pg_proc.prosecdef, pg_policies, RLS FORCE, function ACL, schema USAGE denial to client roles, zero rows. If any postcheck fails, stop and disable; do not go to Gate B.

### P4 — Backend integration and controlled canary (Gate B separate approval)
- Deploy backend with **verified** Google identity, origin and CSRF validation, server-side ACL lookup, validated business event cutoff and known prediction policy.
- Use `prepareVerifiedV2Append` then bound parameters from `buildPersonAppendCommand`, but route execution through a tightly controlled backend credential with rights to EXECUTE only the dedicated function. This credential/role binding **does not yet exist**; do not invent or reuse a privileged account.
- Observability: log event ID, request SHA256 and non-sensitive correlation ID; never log access token/session secret.
- Canary: one synthetic test case in a segregated/test database first, then one controlled live event only after explicit Gate B opening; double submit must return same ID with one row.
- Monitor row count, outcome closure, authorization failures, exact attribution, request/record hash integrity and rejection of unauthorized inserts.

## Stop / rollback
- Gate A.2 is a separate additive migration, NOT a request to drop Gate A. The immediate rollback for unexposed function is **withhold/revoke EXECUTE + disable backend writer**. No live writes exist while Gate B is off.
- If removing Gate A.2 objects becomes necessary, create and rehearse a narrowly scoped migration targeting only function `roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)` and the two `roleta_append_owner_*` policies; review dependent objects and permissions. **Never `DROP SCHEMA ... CASCADE`**.
- Stop on unexpected Supabase migration permission denial, existing function, preflight mismatch, RLS leakage, hash mismatch, timestamp anomaly or any CI failure.
- Preserve all Discador/MesaCliente objects, roles and grants.

## Exit criteria to call it "functioning"
- Gate A.2 applied + verified in shared Supabase;
- verified backend session/ACL connection and least-privileged EXECUTE transport;
- concurrent retry + cross-person + post-outcome tests green;
- dashboard/inspector reflects persisted rows and verifiable hashes;
- Gate B canary authorized and successful, with rollback/disable proven.

The package is **execution-ready as a gated runbook, NOT a claim that all deployment prerequisites have been satisfied**.
