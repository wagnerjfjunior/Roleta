'use strict';
// Private worker core; NO scheduled invocation and NO implicit deletes.
// Inventory providers must deliver complete snapshots, not a paginated subset.
const {planCleanup,cleanPath}=require('./ocr-shadow-retention.cjs');
function assertInventory(x){
 if(!x||x.complete!==true||!Array.isArray(x.jobs)||!Array.isArray(x.objects))throw Error('Complete inventory required');
 if(x.objects.length>10000||x.jobs.length>10000)throw Error('Inventory overflow; refuse deletion');
}
async function runCleanup({inventory,fetchFresh,remove,logger=async()=>{},mode='dry-run',now=Date.now()}={}){
 if(!['dry-run','delete'].includes(mode))throw Error('Unsupported cleanup mode');
 if(typeof inventory!=='function'||typeof fetchFresh!=='function'||typeof remove!=='function')throw Error('Missing secured cleanup dependencies');
 const snapshot=await inventory();
 assertInventory(snapshot);
 const plan=planCleanup({jobs:snapshot.jobs,objects:snapshot.objects,now});
 const results=[];
 for(const candidate of plan.deletions){
  const evidence=await fetchFresh(candidate.path);
  assertInventory(evidence);
  const recheck=planCleanup({jobs:evidence.jobs,objects:evidence.objects,now});
  const same=recheck.deletions.some(d=>d.path===candidate.path&&d.reason===candidate.reason);
  if(!same){results.push({path:candidate.path,status:'skipped_changed'});continue;}
  if(!cleanPath(candidate.path))throw Error('Unsafe storage path');
  if(mode==='dry-run'){results.push({path:candidate.path,status:'would_delete',reason:candidate.reason});continue;}
  // No delete unless inventory verified twice AND caller supplied an approved
  // explicitly scoped Storage deletion capability.
  const result=await remove(candidate.path);
  const entry={path:candidate.path,status:result?.removed===true?'deleted':'failed',reason:candidate.reason};
  await logger(entry);
  results.push(entry);
 }
 return {mode,checked:plan.inventory,ambiguous:plan.ambiguous.length,results};
}
module.exports={runCleanup,assertInventory};
