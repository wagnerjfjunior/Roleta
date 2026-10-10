'use strict';
const fs=require('node:fs'),path=require('node:path');
const {canonical,prepareEvidenceIntent}=require('../../simulation/prospective-intent.cjs');
const inputs=[
 {event_id:'20261010M',kind:'prediction',policy:'WEEKLY_FROZEN',idempotency_key:'ci-binding-key-0001',payload:{N:12,corretores:['São','Paulo']}},
 {event_id:'20261010M',kind:'prediction',policy:'CURRENT_SHADOW',idempotency_key:'ci-binding-key-0002',payload:{N:12,score:0.125}},
 {event_id:'20261010M',kind:'outcome',policy:null,idempotency_key:'ci-binding-key-0003',payload:{positions:[3,1,2],closed:true}}
];
const lines=inputs.map((input,i)=>{
 const prepared=prepareEvidenceIntent(input);
 const bytes=canonical(prepared.body);
 const values=[String(i+1),bytes,prepared.request_sha256,input.event_id,input.kind,input.policy===null?'\\N':input.policy,input.idempotency_key,JSON.stringify(input.payload)];
 if(values.some(v=>/[\t\r\n\b]/.test(v)))throw new Error('invalid TSV control character');
 return values.join('\t');
});
fs.writeFileSync(path.join(__dirname,'intent-binding-vectors.tsv'),lines.join('\n')+'\n');
