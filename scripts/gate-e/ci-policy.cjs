'use strict';
// Unconditional PR gate. Zero GitHub mutations.
// For ordinary PRs: forbid all statistical ledger changes.
// For stat-intake PRs: permit only one event tuple and delegate strict
// content+SHA verification to the other existing Gate E validators.
const {execFileSync}=require('node:child_process');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const EVENT=/^stat-intake\/(\d{4}-\d{2}-\d{2}-[MTI])$/;
const STAT=/^data\/(?:manifest\.json|incoming\/|intake-proofs\/)/;
function inspect({branch,paths}){
 if(typeof branch!=='string'||!Array.isArray(paths)||
    paths.some(p=>typeof p!=='string'||p.includes('\n'))) throw Error('invalid CI inputs');
 const changed=[...new Set(paths.filter(Boolean))];
 const stat=changed.filter(p=>STAT.test(p));
 const match=EVENT.exec(branch);
 if(branch.startsWith('stat-intake/')&&!match) return {ok:false,reason:'INVALID_EVENT_BRANCH'};
 if(!match) return {ok:stat.length===0,reason:stat.length?'STAT_DATA_OUTSIDE_INTAKE':null,intake:false,changed:stat};
 const id=match[1];
 const wanted=[
   'data/manifest.json',
   'data/incoming/'+id+'.csv',
   'data/intake-proofs/'+id+'.json'
 ].sort();
 if(JSON.stringify([...changed].sort())!==JSON.stringify(wanted))
   return {ok:false,reason:'INVALID_INTAKE_PATHS',intake:true,changed};
 return {ok:true,reason:null,intake:true,eventId:id,changed};
}
if(require.main===module){
 try{
  const branch=process.env.GATE_E_PR_BRANCH;
  const base=process.env.GATE_E_BASE_SHA;
  const head=process.env.GATE_E_HEAD_SHA;
  if(!/^[a-f0-9]{40}$/.test(base||'')||!/^[a-f0-9]{40}$/.test(head||''))throw Error('invalid pinned SHAs');
  if(git('rev-parse','HEAD')!==head)throw Error('checkout not at PR SHA');
  const paths=git('diff','--name-only','--diff-filter=ACDMRTUXB',base,head).split('\n').filter(Boolean);
  const result=inspect({branch,paths});
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
  else if(result.intake){
   const {inspect:ancestry}=require('./check-stale-base.cjs');
   const a=ancestry({base,head});
   if(!a.ok)throw Error('ancestry gate rejected: '+a.reason);
   require('./validate-intake-pr.cjs').inspect({base,head});
   console.log('GATE E: ancestry and contents OK');
  }
 }catch(e){console.error('GATE E CI REJECT:',e.message);process.exitCode=1;}
}
module.exports={inspect};
