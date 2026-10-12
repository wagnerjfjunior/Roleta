# Gate E — CI candidate (LOCAL-FIRST)
- Workflow `gate-e-intake-integrity.yml` runs on `pull_request` to main affecting Gate E data paths; job is only for `stat-intake/*`.
- Explicitly checks out `pull_request.head.sha` rather than synthetic merge ref.
- Validates against `pull_request.base.sha` and runs Gate E Git ancestry + complete proposal contents + existing regression suite.
- Read-only GitHub Actions job; never creates PR, changes refs, pushes or deploys.
- IMPORTANT: The CI result reflects the SHA at job execution time, **not** necessarily main at merge time.
- To prevent concurrent stale merges, repository administrators MUST enable *Require branches to be up to date before merging* or an equivalent merge queue, and require the guard check where appropriate. Without this, Gate E is NOT protected.
- Since this workflow is path-triggered and intake-only, DO NOT make it a globally required check for all PRs without redesigning triggers/skip semantics.
- GitHub branch protections, real disposable-repository integration, post-publication correction and branch orphan repair are STILL PENDING. Feature flags remain OFF.
