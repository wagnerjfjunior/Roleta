#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == "roleta_ci" ]] || { echo "Disposable DB only" >&2; exit 1; }
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
invoke() {
 local label="$1"
 psql -X -v ON_ERROR_STOP=1 -At -c "
 SET ROLE roleta_runtime;
 SELECT roleta_audit.append_authenticated_evidence_ci(
 canonical_bytes,sha,event_id,kind,policy,idem,payload,'google:ci-race')
 FROM roleta_audit.ci_definer_vectors WHERE label='$label';"
}
for i in $(seq 1 16); do
 (invoke replay > "$dir/replay-$i.out" 2>"$dir/replay-$i.err") &
done
wait
ids="$(grep -hE '^[0-9]+$' "$dir"/replay-*.out | sort -u | wc -l | tr -d ' ')"
[[ "$ids" == 1 ]] || { echo "Replay race returned $ids distinct IDs"; exit 1; }
count="$(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='CI-DEF-RACE'")"
[[ "$count" == 1 ]] || { echo "Replay race created $count rows"; exit 1; }
invoke outcome-pred >/dev/null
for i in $(seq 1 12); do
 (if invoke "outcome-$i" > "$dir/out-$i.out" 2>"$dir/out-$i.err"; then
    echo accepted > "$dir/out-$i.status"
  else
    echo rejected > "$dir/out-$i.status"
  fi) &
done
wait
ok="$(grep -l '^accepted$' "$dir"/out-*.status | wc -l | tr -d ' ')"
no="$(grep -l '^rejected$' "$dir"/out-*.status | wc -l | tr -d ' ')"
[[ "$ok" == 1 && "$no" == 11 ]] || { echo "Competing outcomes: $ok accepted $no rejected"; exit 1; }
count="$(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='CI-DEF-OUT' AND kind='outcome'")"
[[ "$count" == 1 ]] || { echo "Unexpected outcome count: $count"; exit 1; }
echo "Restricted definer: 16 replays -> 1 row; 12 competing outcomes -> 1 row"
