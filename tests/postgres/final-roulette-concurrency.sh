#!/usr/bin/env bash
set -euo pipefail
test "${PGDATABASE:-}" = roleta_gate_a_ci
task_dir=$(mktemp -d)
trap 'rm -rf "$task_dir"' EXIT
# Fixture data is synthetic. This generator imports no secrets or credentials.
node - "$task_dir" <<'NODE'
const fs=require('fs');
const dir=process.argv[2];
const e={event_id:'2026-10-10-M',event_date:'2026-10-10',period:'manha',N:4,human_review_confirmed:true,drawn_mapping:[1,2,3,4].map(n=>({drawn_number:n,physical_position:n,broker_name:'synthetic-'+n}))};
const payload=JSON.stringify({schema:'rlt-final-roulette-v1',event:e,reviewed:{status:'VALIDADO',salao:[1,2,3,4]}});
const hash=require('crypto').createHash('sha256').update(payload).digest('hex');
fs.writeFileSync(dir+'/command.sql',"SET ROLE roleta_v2_writer; SELECT roleta_audit.save_final_roulette_v1('2026-10-10-M',$payload$"+payload+"$payload$,'"+hash+"','synthetic_actor',0,'');\n");
NODE
psql -X -v ON_ERROR_STOP=1 -f "$task_dir/command.sql" > "$task_dir/a" &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -f "$task_dir/command.sql" > "$task_dir/b" &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
test "$(psql -X -At -c "SELECT count(*) FROM roleta_audit.final_roulette_versions WHERE event_id='2026-10-10-M'")" = 1
psql -X -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF (SELECT count(*) FROM roleta_audit.prospective_evidence)=0 THEN NULL; END IF; IF has_schema_privilege('roleta_v2_writer','public','CREATE') THEN RAISE EXCEPTION 'writer can create public objects'; END IF; END \$\$;"
echo 'PASS simultaneous final-save replay: one version'
