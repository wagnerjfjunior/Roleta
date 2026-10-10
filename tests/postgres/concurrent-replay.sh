#!/usr/bin/env bash
set -euo pipefail
if [[ "${PGDATABASE:-}" != "roleta_ci" ]]; then echo "Refusing non-disposable database" >&2; exit 1; fi
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
for i in $(seq 1 16); do
 (
  psql -X -v ON_ERROR_STOP=1 -At -c "SELECT evidence_id::text || ':' || replay::text FROM roleta_audit.append_prospective_evidence_review('PG-CONCURRENT-01','prediction','WEEKLY_FROZEN','pg-concurrent-key-00001',repeat('a',64),'{}'::jsonb,'ci-actor')" > "$dir/$i"
 ) &
done
wait
ids="$(cut -d: -f1 "$dir"/* | sort -u | wc -l | tr -d ' ')"
[[ "$ids" == 1 ]] || { echo "Idempotent concurrency produced $ids distinct IDs"; exit 1; }
first="$(grep -l ':false$' "$dir"/* | wc -l | tr -d ' ')"
[[ "$first" == 1 ]] || { echo "Expected one first write, got $first"; exit 1; }
count="$(psql -X -v ON_ERROR_STOP=1 -At -c "SELECT count(*) FROM roleta_audit.prospective_evidence WHERE event_id='PG-CONCURRENT-01'")"
[[ "$count" == 1 ]] || { echo "Expected one row, got $count"; exit 1; }
echo "16 concurrent sessions: 1 append, 15 replays"
