'use strict';
const {makePrediction,makeOutcome,verifyChain}=require('./prospective-ledger.cjs');
function assert(x,m){if(!x)throw new Error(m)}
function isoFromServer(clock){const value=clock();assert(value instanceof Date&&!Number.isNaN(value.getTime()),'server clock unavailable');return value.toISOString()}
function validateNewPrediction(existing,input,{clock=()=>new Date()}={}){
 assert(Array.isArray(existing)&&verifyChain(existing),'invalid prior evidence chain');
 assert(input&&typeof input==='object','prediction required');
 assert(!existing.some(r=>r.event_id===input.event_id&&r.type==='outcome'),'outcome already committed');
 assert(!existing.some(r=>r.event_id===input.event_id&&r.type==='prediction'&&r.policy===input.policy),'prediction already committed');
 const prevHash=existing.length?existing.at(-1).record_sha256:null;
 return makePrediction({...input,captured_at:isoFromServer(clock)},{prevHash});
}
function validateNewOutcome(existing,input,{clock=()=>new Date()}={}){
 assert(Array.isArray(existing)&&verifyChain(existing),'invalid prior evidence chain');
 assert(input&&typeof input==='object','outcome required');
 assert(!existing.some(r=>r.event_id===input.event_id&&r.type==='outcome'),'outcome already committed');
 const predictions=existing.filter(r=>r.event_id===input.event_id&&r.type==='prediction');
 assert(predictions.length>0,'no prior prediction');
 const prevHash=existing.at(-1).record_sha256;
 return makeOutcome({...input,captured_at:isoFromServer(clock)},{prevHash,predictions});
}
module.exports={validateNewPrediction,validateNewOutcome};
