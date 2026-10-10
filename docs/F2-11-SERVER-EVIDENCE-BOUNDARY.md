# F2-11 — Server-only evidence boundary

`server/prospective-evidence-boundary.cjs` is an **offline backend module**. It does not register an HTTP route, connect to Supabase, persist records, or enable prospective capture. It requires the calling HTTP adapter to authenticate the session with the existing Google SSO, verify the configured same-origin policy and CSRF token **before** calling it. It then rejects client-supplied actor, digest, timestamps and unknown fields, validates the canonical intent and computes its SHA-256 server-side. The actor is derived only from the authenticated session subject.

**Security gates still open:** build and test the HTTP adapter with explicit method, content type, body size and rate limits; implement a dedicated least-privilege database role and a narrowly scoped SECURITY DEFINER transaction; verify authenticated actor and DB timestamp integrity, replay/closure under concurrency, effective grants, PostgREST isolation and resource limits. A caller must never pass arbitrary client session/boolean flags as trusted facts.

The current prototype database function is **not** wired to this module. No production migrations or runtime writes are authorized. Historical GitHub CSV/JSON remains official, and WEEKLY_FROZEN is unchanged.
