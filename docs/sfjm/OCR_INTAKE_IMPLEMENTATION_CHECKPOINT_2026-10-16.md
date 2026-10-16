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

## Make 6549955 — observed configuration (read-only inspection, 2026-10-16)
- Active original flow: webhook 1 -> official CSV HTTP 23 -> Gemini file upload 21 -> Gemini 3.8 Flash 19; error handler Gemini 3.6 Flash 27 -> Resume 29; synchronous WebhookRespond 13 returns `{{19.result}}`.
- Upload mapping `{{1.file.data}}` and `{{1.file.name}}`; async submit draft sends multipart `file` and `job_id`, so input compatibility is plausible but **not tested**.
- A future shadow scenario must preserve fallback mapping and operator validation. Callback must include `job_id` from `{{1.job_id}}`, model id from resolved Gemini result, and result JSON. Its HMAC v1 must be calculated over the **exact UTF-8 HTTP body bytes** and the canonical method/path/timestamp/nonce/job-id tuple. No claim that Make natively computes this signature has been established.
- Existing Make scenario has **no callback HTTP module** and its synchronous webhook response cannot be treated as durable persistence.
- Do not modify scenario 6549955 until an inactive shadow copy, signing capability, end-to-end test and rollback are proven.

## CI regression fix and progress
- `0ce2031`: lazy PostgreSQL driver loading; `9467131`: install Node dependencies in CI.
- Workflow `OCR intake F1-F4 disposable PostgreSQL` succeeded on `9467131`; PostgreSQL F1-F4 and Node tests passed.
- Later draft improvements: parse Make Gemini result when supplied as JSON text, validate dispatch target before PROCESSING; added callback regression test. Await newest CI before release gate.
- **Open risk**: a Make dispatch failure or uncertain ACK after marking PROCESSING can strand a job. Need recovery policy (deadline, retry, callback race) before activation.

## CI checkpoint 98de2b2
Six workflows completed successfully, including OCR intake F1–F4 PostgreSQL 17 and Node callback/submit tests.
- `api/ocr-callback.js` and `api/ocr-job-submit.js`: Vercel body parser disabled so signature verification and image digest operate on original request bytes.
- Submit: allowlisted Make host, CSRF and Google session, duplicate suppression, bounded failed-dispatch RPC; tests cover failure/SSRF/CSRF.
- Callback: JSON string or object result, `linhas` array required, HMAC, durable nonce via SQL.
- Production remains OFF; tests are isolated and do not establish real Make signed-callback capability or mobile recovery.

## Unresolved release blocker — signing architecture
Current active Make scenario 6549955 returns `{{19.result}}` synchronously; no signed HTTP callback step exists. The v1 HMAC signature requires exact byte-level canonicalization over the final callback body, timestamp, nonce and job id. No Make module with proven correct HMAC support has been established. An untrusted public signer would defeat the authentication. Next implementation must prove either (a) a trusted Make signer module with secret storage and deterministic bytes, or (b) an authenticated server-side relay/queue architecture that does not expose callback secrets. **Do not switch on the flag or merge until this is demonstrated and reviewed.**
