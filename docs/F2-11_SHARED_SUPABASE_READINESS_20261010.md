# F2-11: shared Supabase production readiness

**REVIEW ONLY. No production DDL or prospective write authorization.**

Read-only catalog audit: 2026-10-10, Discador-MesaCliente project `uobxxgzshrmbtjfdolxd`. PostgreSQL 17.6. No `roleta_audit` schema, `roleta_runtime` or `roleta_append_owner` roles. `pgcrypto` installed in `extensions`. Existing `public`: 44 tables, all RLS enabled, 30 FORCE RLS. Existing `forensic_evidence` schema.

Ten non-internal schemas were inspected. `public` grants schema USAGE to every role via PUBLIC; it does not grant table SELECT/INSERT/UPDATE/DELETE or function EXECUTE directly to PUBLIC. The catalog has 24 default-privilege records, including broad grants to existing API roles for future objects created by `supabase_admin` in `public`. This is not evidence that a new Roleta role is safe by default.

## Blocking requirements before migration

1. Review the complete effective privilege matrix for the future dedicated role, including inherited memberships, PUBLIC, existing tables/functions/sequences, default ACLs, and non-system schemas.
2. Explicitly avoid membership in `anon`, `authenticated`, `service_role` or any other application role. Do not use `postgres` or service role for runtime access.
3. Restrict the function owner to `NOLOGIN NOBYPASSRLS`, with SELECT/INSERT only in the new private ledger. The runtime gets only schema USAGE and function EXECUTE. Fixed function `search_path`, qualified objects, FORCE RLS, and negative tests are required.
4. Keep `roleta_audit` outside exposed PostgREST schemas. Do not change Discador schemas, grants, RLS, triggers, or data.
5. Produce a reviewed production migration separately from the disposable `*_ci` SQL, and test it in isolated staging with representative grants. Verify server-side authenticated identity, transaction timeout, pooling and concurrent append.
6. Confirm backups and prepare a reversible disable path using revoke of new runtime access. Do not delete prospective audit evidence as a rollback.

## Authorization

Gate A: separate explicit authorization for reviewed production schema migration. Gate B: separate explicit authorization to activate prospective write traffic. Generic instructions to continue do not authorize either gate.

**Current status: Gate A blocked pending production migration review and complete effective-grants analysis.** All database inspection was read-only.
