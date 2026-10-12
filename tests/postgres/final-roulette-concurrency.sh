#!/usr/bin/env bash
set -euo pipefail
test "${PGDATABASE:-}" = roleta_gate_a_ci
task_dir=$(mktemp -d)
trap 'rm -rf "$task_dir"' EXIT
# Fixture data is synthetic. This generator imports no secrets or credentials.
node - "$task_dir" <<'NODE'
const fs=require('fs');
const dir=process.argv[2];
const e={event_id:'2026-10-10-M',event_date:'2026-10-10',period:'manha',N:4,occupied:[1,2,3,4],first:1,second:2,courtesy:3,last:4,human_review_confirmed:true,drawn_mapping:[1,2,3,4].map(n=>({drawn_number:n,physical_position:n,broker_name:'synthetic-'+n}))};
const payload=JSON.stringify({schema:'rlt-final-roulette-v1',event:e,reviewed:{status:'VALIDADO',salao:[1,2,3,4]}});
const hash=require('crypto').createHash('sha256').update(payload).digest('hex');
fs.writeFileSync(dir+'/command.sql',"SET ROLE roleta_v2_writer; SELECT roleta_audit.save_final_roulette_v1('2026-10-10-M',$payload$"+payload+"$payload$,'"+hash+"','synthetic_actor',0,'');\n");
for(const suffix of ['a','b']){
 const corrected=JSON.stringify({schema:'rlt-final-roulette-v1',event:{...e,source:'correction-'+suffix+'.jpeg'},reviewed:{status:'VALIDADO',salao:[1,2,3,4]}});
 const digest=require('crypto').createHash('sha256').update(corrected).digest('hex');
 fs.writeFileSync(dir+'/correction-'+suffix+'.sql',"SET ROLE roleta_v2_writer; SELECT roleta_audit.save_final_roulette_v1('2026-10-10-M',$payload$"+corrected+"$payload$,'"+digest+"','synthetic_actor',1,'Correção concorrente conferida');\n");
}
NODE
psql -X -v ON_ERROR_STOP=1 -f "$task_dir/command.sql" > "$task_dir/a" &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -f "$task_dir/command.sql" > "$task_dir/b" &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
test "$(psql -X -At -c "SELECT count(*) FROM roleta_audit.final_roulette_versions WHERE event_id='2026-10-10-M'")" = 1
psql -X -v ON_ERROR_STOP=1 -f "$task_dir/correction-a.sql" > "$task_dir/ca" 2>&1 &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -f "$task_dir/correction-b.sql" > "$task_dir/cb" 2>&1 &
pid_b=$!
winners=0
if wait "$pid_a"; then winners=$((winners+1)); fi
if wait "$pid_b"; then winners=$((winners+1)); fi
test "$winners" = 1
test "$(psql -X -At -c "SELECT count(*) FROM roleta_audit.final_roulette_versions WHERE event_id='2026-10-10-M'")" = 2
psql -X -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF (SELECT count(*) FROM roleta_audit.prospective_evidence)=0 THEN NULL; END IF; IF has_schema_privilege('roleta_v2_writer','public','CREATE') THEN RAISE EXCEPTION 'writer can create public objects'; END IF; END \$\$;"
echo 'PASS simultaneous replay: one version; conflicting corrections: one winner and preserved predecessor'
