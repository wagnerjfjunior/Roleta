# SFJM — OCR intake implementation checkpoint — 2026-10-16

## Status
**NO-GO / NOT DEPLOYED.** User pre-authorized Ready, merge and post-merge **after** security and functional acceptance. This is not an authorization to bypass missing proof.

## Current branch changes
- F1 trigger validates INSERT initial state and UPDATE transitions.
- F2 validates SHA-256 of PostgreSQL jsonb::text UTF-8, not original HTTP response bytes.
- F3 draft: scoped `roleta_intake_executor` without BYPASSRLS, `roleta_intake_api` login, FORCE RLS, grants/policies and durable nonce table; atomic signed callback function.
- F4 draft: server-only create/start/read functions; owner binding via verified Google sub in API.
- New server-only PostgreSQL transport rejects admin/service_role and requires project-scoped login and verified TLS.
- New routes `/api/ocr-callback`, `/api/ocr-job-submit`, `/api/ocr-job-status`; all fail closed while `ROLETA_INTAKE_ENABLED` is not `true`.
- Callback verifies HMAC over raw request body, timestamp, nonce, job id and path. Database persists nonce and result atomically.
- Unit tests added for HMAC and callback rejection; SQL smoke tests added for invalid INSERT and digest mismatch.

## Outstanding blockers (do not mark PASS without evidence)
1. PostgreSQL 17 disposable test must apply F1→F4 and verify role grants, RLS, SECURITY DEFINER ownership, nonce concurrency and operator A/B isolation; existing CI does not automatically test these new F3/F4 drafts.
2. Make scenario **6549955** is currently active and has modules 1→23→21→19 (fallback 27/29)→13. It does not currently issue a signed callback or propagate the job_id. Prepare clone/shadow scenario first; do not patch active Make without E2E rollback plan.
3. Image dispatch semantics need outbox/retry/FAILED reconciliation: currently the draft marks PROCESSING before Make ACK; a failed dispatch can leave a pending job. Resolve before activation.
4. API must be exercised with raw-body handling on Vercel runtime, negative auth/CSRF tests, 180+ second callback, mobile reload and user confirmation.
5. Dedicated login credentials and CA must be provisioned and verified in the target environment; no secrets in Make/browser.
6. Retention/cleanup, storage, idempotency window, and callback key rotation need operational decisions.
7. Independent SES/AppSec retest on the exact final commit; update PR description, then Ready, merge, and post-merge smoke only if gates PASS.
8. Separate remediation for existing `roleta_ocr` service_role bypass / FORCE RLS after worker inventory. Do not blindly change production.
9. Existing synchronous `/api/roleta-ocr` and manual JSON fallback must remain available throughout rollout.

## Release contract
- Default `ROLETA_INTAKE_ENABLED` unset/false, with no migration applied and no Make modifications.
- Migration is **not** automatic on merge; never infer deploy success from GitHub CI.
- Before production: verify backup, additive migrations, credential setup, endpoint HMAC, real job lifecycle, A/B isolation, rollback, post-merge checks.
- If any security gate fails, retain draft PR and NO-GO.
