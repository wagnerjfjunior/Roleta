#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == "roleta_ci" ]] || { echo "Disposable DB required" >&2; exit 1; }
psql -X -v ON_ERROR_STOP=1 -q -c "SELECT * FROM roleta_audit.append_prospective_evidence_review('PG-RACE-OUTCOME','prediction','WEEKLY_FROZEN','pg-race-pred-00000001',repeat('a',64),'{}'::jsonb,'ci-actor')" >/dev/null
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
for i in $(seq 1 12); do
 (
  if psql -X -v ON_ERROR_STOP=1 -At -c "SELECT evidence_id FROM roleta_audit.append_prospective_evidence_review('PG-RACE-OUTCOME','outcome',NULL,'pg-race-outcome-key-$(printf '%04d' "$i")',repeat('b',64),'{\"position\":$i}'::jsonb,'ci-actor')" > "$dir/$i.out" 2>"$dir/$i.err"; then
    echo ok > "$dir/$i.status"
  else
    echo rejected > "$dir/$i.status"
  fi
 ) &
done
wait
ok="$(grep -l '^ok$' "$dir"/*.status | wc -l | tr -d ' ')"
rejected="$(grep -l '^rejected$' "$dir"/*.status | wc -l | tr -d ' ')"
[[ "$ok" == 1 && "$rejected" == 11 ]] || { echo "Unexpected competing outcome results: $ok successful, $rejected rejected"; exit 1; }
count="$(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='PG-RACE-OUTCOME' AND kind='outcome'")"
[[ "$count" == 1 ]] || { echo "Expected one outcome, got $count"; exit 1; }
echo "12 competing outcomes: 1 accepted, 11 rejected"
