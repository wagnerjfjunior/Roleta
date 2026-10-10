# F2-11 — HTTP authentication adapter (offline only)

The private module `server/prospective-evidence-http.cjs` connects the existing server-side Google session, same-origin and CSRF checks to the server canonical evidence boundary. It rejects methods other than POST, non-JSON content, invalid lengths, raw JSON over 80 KiB, unauthenticated sessions and forged identity fields. The browser never receives database credentials.

**No public endpoint is registered.** The module does not make database calls and does not activate prospective capture. Before exposing any endpoint, implement fail-closed bounded streaming and request limits, per-actor rate limiting, trusted server authentication, narrowly scoped DB runtime role and reviewed transaction, as well as negative security tests. The present adapter assumes the Vercel runtime supplies a bounded parsed body; this assumption must be enforced at the eventual route boundary.

Historical GitHub records remain authoritative. No change to WEEKLY_FROZEN or production Supabase.
