# F2-11 — Dedicated runtime role in disposable PostgreSQL

This is a **disposable privilege proof**, not a final production append migration. A NOLOGIN `roleta_append_owner` with NOBYPASSRLS owns a SECURITY DEFINER function, receives only SELECT/INSERT on the private evidence table, and is permitted by explicit RLS policies even though FORCE ROW LEVEL SECURITY is enabled. `roleta_runtime` receives only private schema USAGE and EXECUTE on the specific function, no direct table grants. Browser roles have no function execution.

The CI uses SET ROLE to prove a valid canonical digest and typed binding can be inserted, and forged digests/fields or direct SELECT/DELETE are rejected. The SQL checks it is running against `roleta_ci`. The example function **intentionally lacks** lifecycle constraints, chain semantics, idempotency, lock sequencing, trusted actor derivation and full resource protections; its digest is not the final envelope hash. It is never to be deployed to shared Supabase.

**Next critical gate:** combine this privilege model with the transactional append implementation, prove replay and concurrent outcomes, and audit existing grants and PostgREST exposed schemas. No database production DDL or runtime capture is authorized.
