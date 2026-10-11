# F2-12 backend Gate B — implementation checkpoint 2026-10-11

## Existing, preserved workflows
Roleta Simples print, PDF, JPEG, WhatsApp sharing, and historical ingestion/statistical base are operational/homologated. These are NOT part of Gate B, were not rewritten or retested as needing re-homologation.

## Implemented on PR #80
- `api/prospective-v2-append.js`: Vercel POST route; deny by default unless `ROLETA_V2_WRITES_ENABLED=true`; no cookie/session data reflected in the response.
- `server/prospective-v2-google-http.cjs`: existing verified Google OAuth session, same-origin, CSRF; existing two OAuth identities remain in the original authentication system.
- `server/prospective-v2-person-acl-env.cjs`: server-side Google subject -> canonical broker ID ACL; rejects unauthorized person.
- `server/prospective-v2-verified-boundary.cjs`: validated append command; evidence data canonical and hashed.
- `server/prospective-v2-db-transport.cjs`: bounded SQL pool, server-only `ROLETA_V2_DATABASE_URL`, privileged-role reject, verified TLS required, *only* accepts versioned private append function command with nine bound parameters.
- `server/prospective-v2-event-gate.cjs`: real-time 2026 São Paulo business closing time guard for `YYYY-MM-DD-manha` (08:46) and `YYYY-MM-DD-tarde` (13:46), rejects backdating outside 5 minutes and post-closure requests; `integral` is fail-closed because exact closing time is not yet specified. Neither this local guard nor a broker identity alone proves that a physical row was occupied.
- `tests/regression/prospective-v2-route.test.cjs`: verifies feature gate, privileged role denial, verified TLS, restricted SQL invocation, late event rejection, and no DB writes on refusal.

## Required to turn on writes
1. Create a *dedicated login role* with EXECUTE permission on only `roleta_audit.append_authenticated_person_evidence_v2` and USAGE on only schema `roleta_audit`; absolutely no grants on shared Discador/MesaCliente schemas.
2. Provision the dedicated PostgreSQL login password and full TLS-verifying pooler connection string as a Vercel **sensitive, production-only, server environment** variable `ROLETA_V2_DATABASE_URL`. Do not use `postgres`, `service_role`, `anon`, `authenticated`, `roleta_runtime` or `roleta_append_owner` as the runtime login.
3. Provide the real, verified Google `sub` claim for each authorized operator and canonical `person_id` set in `ROLETA_V2_PERSON_ACL_JSON` (sensitive production-only). Having two Google emails already in SSO config does NOT reveal their stable `sub` claims; never assume email strings can substitute for IDs.
4. Controlled dry-run against restricted database role; test actor/person rejection, multi-session idempotency/retry and dates, then a one-record canary under a verified pre-draw event. Only then set `ROLETA_V2_WRITES_ENABLED=true`.
5. Do not advertise that historical ingestion or print depends on this new route: those flows remain separate.

Current state: code implemented behind a closed feature gate; no secret or credential has been provisioned, and no live F2-12 evidence created. Full production rollout requires the missing private connection and ACL. Do not mark complete just because CI is green.

## Rollback
Set `ROLETA_V2_WRITES_ENABLED=false` (default when absent), redeploy API if necessary, REVOKE EXECUTE from the dedicated runtime role. Preserve append-only data; never delete historical rows or change shared schemas.
