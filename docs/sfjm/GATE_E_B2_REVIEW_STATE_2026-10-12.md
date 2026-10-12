# Gate E — B2 review states, local-only

- `scripts/gate-e/review-state.cjs` classifies orphan branches, closed PRs, head SHA mismatch, changed PR base, unexpected files and insufficient proof without network or writes.
- Orphan recovery is **diagnostic only**. A human must reconcile PR creation/branch, preserving the existing proof. No automatic ref updates or branch deletion.
- Corrections after publication remain **disabled**; a separate versioned correction proposal, predecessor hash, reason, source, actor and independent approval are required before implementation. This package intentionally has no correction write capability.
- `pending_human_review` is **not** equivalent to authorized merge. Production enforcement still requires wiring real GitHub refs, trusted base SHA, full B1 content validation, CI required checks and merge protection.
- Do not enable `ROLETA_STAT_WRITES_ENABLED`; do not deploy/merge. Historical canonical dataset unchanged.
