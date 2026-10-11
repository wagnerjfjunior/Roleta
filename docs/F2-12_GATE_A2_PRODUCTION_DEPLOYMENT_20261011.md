# SFJM F2-12 — Gate A.2 production deployment (2026-10-11)

## Verified implementation
Shared Supabase: `uobxxgzshrmbtjfdolxd`, PostgreSQL 17.6.
Migration `roleta_f2_12_gate_a2_private_append_v2_20261011`.
Source SQL `database/production-review/20261011_roleta_v2_private_append_gate_a2_candidate.sql`.
Last rehearsal: commit `84ac9c16c8f62ad88e3dbcd064992e33f08948da`, CI 5/5 success (including isolated PG17 owner transfer and role SET restoration).

First production migration attempt failed atomically with PostgreSQL 42501 `must be able to SET ROLE "roleta_append_owner"` and left no function/policies. Read-only audit found `postgres` admin membership but `set_option=false`. The revised SQL temporarily enables the role's SET option within the migration transaction, transfers ownership and restores SET=false before COMMIT. Subsequent Supabase migration API response `success:true`.

## Independent post-deployment SELECT assertions
- Function `roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)` exists.
- Function owner `roleta_append_owner`, SECURITY DEFINER.
- Evidence table FORCE RLS true, with exactly two dedicated owner policies.
- Table rows 0; Gate B **NOT** activated.
- PostgreSQL migration role `postgres` cannot SET `roleta_append_owner` after deployment; temporary membership privilege restored.
- `authenticated`, `service_role`, `roleta_runtime` have no schema USAGE or direct table INSERT; none has EXECUTE on V2 function.
- Shared Discador and MesaCliente schemas/tables/grants were not targeted.

## Operational caveats
The function is physically installed, but NOT callable by the Roleta backend. No Vercel DB secret is provisioned. No validated principal-to-broker mapping has been installed. Privileged SQL editor should not be used as runtime writer; a restricted DB principal must be separately provisioned, then its role transport and verified server ACL must be tested before any function EXECUTE rights are granted.

No future runner should rerun Gate A or A.2 migrations: both are unique one-time deployments. Any correction must be a new additive versioned migration with testing and postflight. No blanket DROP CASCADE against shared Supabase.
