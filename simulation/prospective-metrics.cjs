'use strict';
const {verifyChain}=require('./prospective-ledger.cjs');
function summarize(records){
 if(!verifyChain(records))throw new Error('Invalid prospective evidence chain');
 const predictions=new Map(),outcomes=new Map();
 for(const record of records){
  if(record.type==='prediction')predictions.set(record.record_sha256,record);
  else if(record.type==='outcome'){
   if(outcomes.has(record.event_id))throw new Error('Duplicate outcome');
   outcomes.set(record.event_id,record);
  }
 }
 const byPolicy={};
 for(const o of outcomes.values()){
  for(const h of o.prediction_hashes){
   const p=predictions.get(h);
   if(!p)throw new Error('Missing prediction');
   const k=p.policy;
   const v=byPolicy[k]??={events:0,hits:0,expected:0,eligible:0};
   v.events++;
   const choice=p.candidates[0];
   const eligible=o.occupied.includes(choice);
   if(eligible){v.eligible++;v.expected+=2/o.occupied.length;if(choice===o.first||choice===o.last)v.hits++}
  }
 }
 const paired=[];
 for(const o of outcomes.values()){
  const p=o.prediction_hashes.map(h=>predictions.get(h));
  const w=p.find(x=>x.policy==='WEEKLY_FROZEN'),c=p.find(x=>x.policy==='CURRENT_SHADOW');
  if(!w||!c)continue;
  if(!o.occupied.includes(w.candidates[0])||!o.occupied.includes(c.candidates[0]))continue;
  const hit=x=>Number(x.candidates[0]===o.first||x.candidates[0]===o.last);
  paired.push({event_id:o.event_id,delta:hit(c)-hit(w),expected:2/o.occupied.length});
 }
 return {schema:'rlt-prospective-summary-v1',mode:'prospective_only_if_capture_proven_ex_ante',by_policy:byPolicy,paired_count:paired.length,paired_delta_hits:paired.reduce((s,x)=>s+x.delta,0),paired_events:paired};
}
module.exports={summarize};
