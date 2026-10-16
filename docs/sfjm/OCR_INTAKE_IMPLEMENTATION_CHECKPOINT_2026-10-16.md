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

## Make HMAC compatibility verified — 2026-10-16
- The native **Make Functions / Hash functions** module `make-functions:CryptoFunctions` (v1) supports `operation=sha256`, `key`, `keyEncoding=utf8`, `outputEncoding=hex` and computes keyed HMAC-SHA256.
- Scenario 6660554 (webhook test) created separately and left INACTIVE; production 6549955 unchanged.
- Scenario 6660591 (on-demand deterministic test) created, temporarily activated, executed, then DEACTIVATED (active scenario quota preserved).
- Run `14863a70abc5401b98de714bb36f5fba`: HMAC for `roleta-hmac-homologacao` under test key `test-key-only-not-production` = `0462b4e1c4c7435ca122c1d260424f247db7e26c77800d786e7117f5e1122587`, matching independent Python hashlib/hmac.
- Run `cc01de92f98f465dad9f24023d83be73`: HMAC of the actual **callback canonical envelope format**, with body `{"model_id":"gemini-test","result":{"linhas":[]}}` (49 UTF-8 bytes), job UUID `550e8400-e29b-41d4-a716-446655440000`, nonce `uniqueNonce1234567890`, timestamp `1792170000000`, path `/api/ocr-callback`, produced `ddb6304743f9af134f85aa6679a11e8cd28a82ddc56b6dd6c7987b6da1424b86`; independent Python hmac matched byte-for-byte.
- These are cryptographic compatibility tests, **not** production callbacks; test timestamp is a deterministic fixture, not an accepted live timestamp. Do not reuse test secret.
- Next: construct canonical JSON and byte length deterministically in Make, supply nonce+current millisecond timestamp, use dedicated secret, POST exact signed JSON and headers to shadow backend, test callback replay and operator-scoped read, and verify Vercel/Supabase live. This requires separate inactive shadow OCR pipeline and real secrets; no production release until complete.

## Follow-on checkpoint — 2026-10-16 afternoon
- Reinspected live scenario 6549955: webhook → broker CSV HTTP 23 → Gemini upload 21 → Gemini 3.8 19 (3.6 fallback 27/Resume 29) → synchronous WebhookRespond 13. It is active and **unchanged**.
- Added a durable Make canonical-envelope golden-vector regression to `tests/ocr-callback-hmac.test.cjs` (Make execution `cc01de92f98f465dad9f24023d83be73`). The deterministic Make test key is intentionally shorter than the production 32-byte minimum, so the test confirms signature equivalence while asserting that production verification rejects the test secret.
- Attempt to create an inactive shadow with the existing Gemini connection through the connector was **blocked by tool security policy**; no shadow OCR pipeline was created. Do not bypass this restriction by reconstructing or exporting connection credentials.
- Security gate: `make-functions:CryptoFunctions` takes a key as mapped text. The test key in test scenarios is not production-grade storage. Before deployment establish an approved secret-management approach that avoids a plaintext production HMAC secret in Make scenario blueprints/logs; audit who can read scenario definitions and execution data.
- Callback JSON body must be built **once**, byte-for-byte, before HMAC and HTTP POST; compute UTF-8 byte length (not Unicode character count). Use the same body bytes in the HTTP module; nonce must be unique and timestamp milliseconds. Ensure Make does not silently reserialize JSON. Verify against the golden vector with non-ASCII names and production-length test secret.
- Quota: Make refused concurrent activation of the two test scenarios; both test scenarios 6660554 and 6660591 were deactivated after tests. Preserve live scenario 6549955 and available active slot.
- Next safe action: implement the shadow OCR pipeline only through an authorized tool/path and after securing secret storage; then E2E signed callback, durable replay rejection, operator-scoped read, manual review and rollback. PR remains draft and feature flag OFF.
