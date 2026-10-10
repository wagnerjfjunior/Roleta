'use strict';
const crypto=require('node:crypto');
function chronologicalHoldout(rows,{holdoutFraction=0.2,minTrain=20}={}){
 if(!Array.isArray(rows)||!Number.isFinite(holdoutFraction)||holdoutFraction<=0||holdoutFraction>=1||!Number.isInteger(minTrain)||minTrain<1)throw new Error('Invalid split configuration');
 const seen=new Set();
 const ordered=rows.map(x=>{
  if(!x||typeof x.id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||Number.isNaN(Date.parse(x.date+'T00:00:00Z')))throw new Error('Invalid event');
  if(seen.has(x.id))throw new Error('Duplicate event');seen.add(x.id);return x;
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const target=Math.ceil(ordered.length*holdoutFraction);
 if(ordered.length-target<minTrain)throw new Error('Insufficient training data');
 let split=ordered.length-target;
 // Never split events from the same date between train and holdout.
 while(split>0&&ordered[split-1].date===ordered[split].date)split--;
 if(split<minTrain)throw new Error('Same-day boundary violates minimum training');
 const train=ordered.slice(0,split),holdout=ordered.slice(split);
 const provenance=crypto.createHash('sha256').update(JSON.stringify(ordered.map(x=>[x.id,x.date]))).digest('hex');
 return {schema:'rlt-f2-13-chronological-holdout-v1',train,holdout,cutoff:holdout[0].date,ordered_ids_sha256:provenance};
}
module.exports={chronologicalHoldout};
