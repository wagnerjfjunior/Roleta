'use strict';
const {prepareEvidenceIntent}=require('./prospective-intent.cjs');
const {computeChainedEnvelopeHash}=require('./prospective-integrity.cjs');
function makeInMemoryProspectiveStore({clock=()=>new Date().toISOString(),actor='test-actor'}={}){
 const rows=[],byKey=new Map();
 let tail=Promise.resolve();
 function append(input){
  const prepared=prepareEvidenceIntent(input);
  const task=tail.then(()=>{
   const {body,request_sha256}=prepared;
   const old=byKey.get(body.idempotency_key);
   if(old){
    if(old.request_sha256!==request_sha256)throw new Error('idempotency key conflict');
    return {record:old,replay:true};
   }
   if(body.kind==='correction')throw new Error('correction requires separately reviewed contract');
   if(body.kind==='prediction'){
    if(rows.some(r=>r.event_id===body.event_id&&r.kind==='outcome'))throw new Error('event closed');
    if(rows.some(r=>r.event_id===body.event_id&&r.kind==='prediction'&&r.policy===body.policy))throw new Error('duplicate policy');
   }else{
    if(rows.some(r=>r.event_id===body.event_id&&r.kind==='outcome'))throw new Error('duplicate outcome');
    if(!rows.some(r=>r.event_id===body.event_id&&r.kind==='prediction'))throw new Error('outcome without prediction');
   }
   const previousHash=rows.length?rows[rows.length-1].record_sha256:null;
   const receivedAt=clock();
   const record_sha256=computeChainedEnvelopeHash({previousHash,requestSha256:request_sha256,receivedAt,actorSubject:actor});
   const record=Object.freeze({...body,request_sha256,previous_record_sha256:previousHash,record_sha256,received_at:receivedAt,actor_subject:actor});
   rows.push(record);byKey.set(body.idempotency_key,record);
   return {record,replay:false};
  });
  tail=task.then(()=>undefined,()=>undefined);
  return task;
 }
 return {append,read:()=>rows.map(r=>({...r}))};
}
module.exports={makeInMemoryProspectiveStore};
