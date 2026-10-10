'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makeInMemoryProspectiveStore}=require('../../simulation/prospective-inmemory-store.cjs');
const {computeChainedEnvelopeHash}=require('../../simulation/prospective-integrity.cjs');
const mk=(kind,key,policy=null,event_id='2026-10-10-M')=>({event_id,kind,policy,idempotency_key:key,payload:{N:12}});
test('concurrent same-key writes append once; divergent replay conflicts',async()=>{
 const s=makeInMemoryProspectiveStore({clock:()=> '2026-10-10T16:00:00.000Z'});
 const x=mk('prediction','20261010Mkey123456','WEEKLY_FROZEN');
 const result=await Promise.all(Array.from({length:32},()=>s.append(x)));
 assert.equal(s.read().length,1);
 assert.equal(result.filter(x=>x.replay===false).length,1);
 assert.equal(result.filter(x=>x.replay===true).length,31);
 await assert.rejects(s.append({...x,payload:{N:13}}),/idempotency key conflict/);
});
test('parallel distinct predictions preserve chain and one outcome closes event',async()=>{
 const s=makeInMemoryProspectiveStore({clock:()=> '2026-10-10T16:00:00.000Z'});
 await Promise.all([s.append(mk('prediction','20261010Mkey123457','WEEKLY_FROZEN')),s.append(mk('prediction','20261010Mkey123458','CURRENT_SHADOW'))]);
 const outcome=mk('outcome','20261010Mkey123459');
 const results=await Promise.allSettled([s.append(outcome),s.append({...outcome,idempotency_key:'20261010Mkey123460'})]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(s.read().length,3);
 const rows=s.read();
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  assert.equal(r.previous_record_sha256,i?rows[i-1].record_sha256:null);
  assert.equal(r.record_sha256,computeChainedEnvelopeHash({previousHash:r.previous_record_sha256,requestSha256:r.request_sha256,receivedAt:r.received_at,actorSubject:r.actor_subject}));
 }
 await assert.rejects(s.append(mk('prediction','20261010Mkey123461','CURRENT_SHADOW')),/event closed/);
});
test('failed operation does not poison queue or append partial record',async()=>{
 const s=makeInMemoryProspectiveStore({clock:()=> '2026-10-10T16:00:00.000Z'});
 await assert.rejects(s.append(mk('outcome','20261010Mkey123462')),/without prediction/);
 assert.equal(s.read().length,0);
 await s.append(mk('prediction','20261010Mkey123463','WEEKLY_FROZEN'));
 assert.equal(s.read().length,1);
});
