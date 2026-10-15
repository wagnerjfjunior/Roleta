'use strict';
// Pure, side-effect-free retention planner. Storage deletion is handled separately,
// ONLY by an authenticated server-side worker after policy approval.
const MAX_PATHS=10000;
function parseTime(value){const n=Date.parse(String(value||''));return Number.isFinite(n)?n:null;}
function cleanPath(p){return typeof p==='string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[MTI]\/\d+\/[a-f0-9]{64}\.(jpg|png|webp)$/.test(p);}
function planCleanup({jobs,objects,now=Date.now(),retentionDays=30,orphanHours=24}={}){
 if(!Array.isArray(jobs)||!Array.isArray(objects)||jobs.length>MAX_PATHS||objects.length>MAX_PATHS)throw Error('Inventory invalid');
 if(!Number.isFinite(now)||!Number.isInteger(retentionDays)||retentionDays<7||retentionDays>365||!Number.isInteger(orphanHours)||orphanHours<24||orphanHours>168)throw Error('Retention policy invalid');
 const referenced=new Map();
 for(const job of jobs){
  if(!job||!cleanPath(job.image_storage_path))continue;
  const current=referenced.get(job.image_storage_path)||[];
  current.push(job);
  referenced.set(job.image_storage_path,current);
 }
 const deletions=[],ambiguous=[];
 const threshold=now-retentionDays*86400000,orphanThreshold=now-orphanHours*3600000;
 const seen=new Set();
 for(const object of objects){
  const path=object?.path,created=parseTime(object?.created_at);
  if(!cleanPath(path)||seen.has(path)||created===null||created>now){ambiguous.push(path??null);continue;}
  seen.add(path);
  const linked=referenced.get(path)||[];
  if(linked.some(j=>j.state==='processing'))continue;
  if(linked.length===0){
   if(created<=orphanThreshold)deletions.push({path,reason:'orphan'});
   continue;
  }
  if(linked.some(j=>j.state==='queued'||j.state==='needs_review'))continue;
  if(linked.some(j=>!['confirmed','rejected','failed'].includes(j.state))){ambiguous.push(path);continue;}
  const latest=Math.max(created,...linked.map(j=>parseTime(j.updated_at)||now));
  if(latest<=threshold)deletions.push({path,reason:'expired'});
 }
 return Object.freeze({deletions,ambiguous,inventory:{jobs:jobs.length,objects:objects.length},retentionDays,orphanHours});
}
module.exports={planCleanup,cleanPath};
