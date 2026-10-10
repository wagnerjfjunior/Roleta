'use strict';
const {canonical}=require('../../simulation/prospective-intent.cjs');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const rows=[];
function add(label,event_id,kind,policy,idempotency_key,payload){
 const body={event_id,kind,policy,idempotency_key,payload};
 const bytes=canonical(body);
 const sha=createHash('sha256').update(bytes,'utf8').digest('hex');
 if([label,bytes,sha].some(s=>/[\t\r\n]/.test(s)))throw Error('invalid fixture');
 rows.push([label,bytes,sha,event_id,kind,policy===null?'\\N':policy,idempotency_key,canonical(payload)].join('\t'));
}
add('replay','CI-DEF-RACE','prediction','WEEKLY_FROZEN','ci-def-race-pred-0001',{N:12});
add('outcome-pred','CI-DEF-OUT','prediction','WEEKLY_FROZEN','ci-def-out-pred-0001',{N:12});
for(let i=1;i<=12;i++)add('outcome-'+i,'CI-DEF-OUT','outcome',null,'ci-def-out-key-'+String(i).padStart(4,'0'),{position:i});
fs.writeFileSync(path.join(__dirname,'definer-concurrency-vectors.tsv'),rows.join('\n')+'\n');
