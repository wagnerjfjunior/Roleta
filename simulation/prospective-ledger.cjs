'use strict';
const crypto=require('node:crypto');
const SCHEMA='rlt-prospective-v1';
function canonical(x){
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 if(x===null||['string','number','boolean'].includes(typeof x))return JSON.stringify(x);
 throw new Error('Unsupported canonical value');
}
const hash=x=>crypto.createHash('sha256').update(canonical(x)).digest('hex');
function assert(c,m){if(!c)throw new Error(m)}
function positions(xs){return Array.isArray(xs)&&xs.length>0&&xs.every(x=>Number.isSafeInteger(x)&&x>0)&&new Set(xs).size===xs.length}
function makePrediction(p,{prevHash=null}={}){
 assert(p&&typeof p==='object','prediction required');
 assert(typeof p.event_id==='string'&&p.event_id.length>0,'event_id required');
 assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(p.captured_at)&&!Number.isNaN(Date.parse(p.captured_at)),'UTC captured_at required');
 assert(['WEEKLY_FROZEN','CURRENT_SHADOW'].includes(p.policy),'invalid policy');
 assert(typeof p.algorithm_version==='string'&&p.algorithm_version.length>0,'algorithm version required');
 assert(/^[0-9a-f]{64}$/.test(p.input_sha256),'input hash required');
 assert(positions(p.occupied_snapshot),'ex-ante occupied snapshot required');
 assert(positions(p.candidates),'candidate ranking required');
 assert(p.candidates.every(x=>p.occupied_snapshot.includes(x)),'candidate not eligible in snapshot');
 assert(p.N===p.occupied_snapshot.length&&p.N>=4,'N mismatch');
 assert(prevHash===null||/^[0-9a-f]{64}$/.test(prevHash),'invalid prev hash');
 const payload={schema:SCHEMA,type:'prediction',event_id:p.event_id,captured_at:p.captured_at,policy:p.policy,algorithm_version:p.algorithm_version,input_sha256:p.input_sha256,N:p.N,occupied_snapshot:[...p.occupied_snapshot],candidates:[...p.candidates],prev_hash:prevHash};
 return {...payload,record_sha256:hash(payload)};
}
function makeOutcome(p,{prevHash,predictions}={}){
 assert(p&&typeof p==='object','outcome required');
 assert(typeof p.event_id==='string'&&p.event_id.length>0,'event_id required');
 assert(typeof p.captured_at==='string'&&!Number.isNaN(Date.parse(p.captured_at))&&p.captured_at.endsWith('Z'),'outcome timestamp required');
 assert(Number.isSafeInteger(p.first)&&Number.isSafeInteger(p.last)&&p.first!==p.last,'invalid endpoints');
 assert(positions(p.occupied)&&p.occupied.includes(p.first)&&p.occupied.includes(p.last),'invalid outcome positions');
 assert(typeof p.validated_by==='string'&&p.validated_by.length>0,'human validation required');
 assert(/^[0-9a-f]{64}$/.test(prevHash),'previous record hash required');
 assert(Array.isArray(predictions)&&predictions.length>0,'prediction records required');
 assert(new Set(predictions.map(x=>x.policy)).size===predictions.length,'duplicate prediction policy');
 assert(predictions.every(x=>x.N===p.occupied.length),'outcome N mismatch');
 assert(predictions.every(x=>x.occupied_snapshot.length===p.occupied.length&&x.occupied_snapshot.every(v=>p.occupied.includes(v))),'occupied snapshot mismatch');
 for(const record of predictions){
  assert(record.type==='prediction'&&record.event_id===p.event_id,'wrong prediction');
  assert(Date.parse(record.captured_at)<Date.parse(p.captured_at),'prediction not prior to outcome');
  assert(verifyRecord(record),'prediction hash invalid');
 }
 const payload={schema:SCHEMA,type:'outcome',event_id:p.event_id,captured_at:p.captured_at,first:p.first,last:p.last,occupied:[...p.occupied],validated_by:p.validated_by,prediction_hashes:predictions.map(x=>x.record_sha256),prev_hash:prevHash};
 return {...payload,record_sha256:hash(payload)};
}
function verifyRecord(r){
 if(!r||r.schema!==SCHEMA||!/^[0-9a-f]{64}$/.test(r.record_sha256||''))return false;
 const {record_sha256,...payload}=r;
 return hash(payload)===record_sha256;
}
function verifyChain(records){
 let previous=null;const seen=new Set();
 for(const r of records){
  if(!verifyRecord(r)||r.prev_hash!==previous)return false;
  if(r.type==='prediction'){
   if(outcomes.has(r.event_id))return false;
   const key=r.event_id+'|'+r.policy;
   if(seen.has(key))return false;
   seen.add(key);
  }else if(r.type==='outcome'){
   if(outcomes.has(r.event_id))return false;
   outcomes.add(r.event_id);
   if(!Array.isArray(r.prediction_hashes)||!r.prediction_hashes.length||new Set(r.prediction_hashes).size!==r.prediction_hashes.length)return false;
   const preds=records.filter(x=>x.type==='prediction'&&r.prediction_hashes.includes(x.record_sha256));
   if(preds.length!==r.prediction_hashes.length||preds.some(x=>x.event_id!==r.event_id||Date.parse(x.captured_at)>=Date.parse(r.captured_at)||x.N!==r.occupied.length||x.occupied_snapshot.some(v=>!r.occupied.includes(v)))||new Set(preds.map(x=>x.policy)).size!==preds.length)return false;
  }else return false;
  history.set(r.record_sha256,r);
  previous=r.record_sha256;
 }
 return true;
}
module.exports={SCHEMA,canonical,hash,makePrediction,makeOutcome,verifyRecord,verifyChain};
