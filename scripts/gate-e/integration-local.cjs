'use strict';
// Disposable local Git integration test; no GitHub requests, no writes to the original repo.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),cp=require('node:child_process');
const {inspect:validate}=require('./validate-intake-pr.cjs');
const {inspect:ancestry}=require('./check-stale-base.cjs');
const {inspect:policy}=require('./ci-policy.cjs');
function run(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roleta-gate-c-'));
 const git=(...a)=>cp.execFileSync('git',a,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const put=(p,s)=>{const f=path.join(dir,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s)};
 const A='2026-10-12-M', pp=[10,2,3,4,5,6,7,8,9,1];
 try {
  git('init','-q','-b','main');git('config','user.name','Gate C Isolation');git('config','user.email','gate-c@example.invalid');
  const hdr='Fonte,Evento,Data,Período,N,Posições físicas ocupadas,Nº1 físico,Nº1 ordem efetiva,Nº2 físico,Nº2 ordem efetiva,Cortesia físico,Cortesia ordem efetiva,Último físico,Último ordem efetiva,Qualidade,Observação';
  const baseCsv=hdr+'\nOLD,old,11/10/2026,integral,10,"1,2,3,4,5,6,7,8,9,10",1,1,2,2,9,9,10,10,A,old\n';
  const manifest={logical_dataset_version:'old',canonical_event_count:1,quality_A:1,quality_B:0,sources:[{path:'/data/events.csv',role:'baseline',events:1}]};
  put('data/events.csv',baseCsv);put('data/manifest.json',JSON.stringify(manifest,null,2)+'\n');
  git('add','.');git('commit','-qm','baseline');const base=git('rev-parse','HEAD');
  git('switch','-qc','stat-intake/'+A);
  const mapping=pp.map((p,i)=>({drawn_number:i+1,physical_position:p,broker_name:'Broker '+(i+1)}));
  const e={schema:'rlt-statistical-submission-v1',event_id:A,event_date:'2026-10-12',period:'manha',N:10,occupied:[1,2,3,4,5,6,7,8,9,10],first:10,second:2,courtesy:9,last:1,drawn_mapping:mapping,source:'IMG_1700.jpeg',quality:'A',human_review_confirmed:true};
  const digest=crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex');
  const proof={schema:'rlt-statistical-proof-v1',event_id:A,event_date:e.event_date,period:e.period,source:e.source,submitted_at:'2026-10-12T12:00:00Z',actor_hash:'a'.repeat(16),N:10,physical_positions:e.occupied,drawn_mapping:mapping,human_review_confirmed:true,payload_sha256:digest};
  const csv=hdr+'\nIMG_1700.jpeg,'+A+',12/10/2026,manha,10,"1,2,3,4,5,6,7,8,9,10",10,10,2,2,9,9,1,1,A,payload_sha256='+digest+'\n';
  const updated={...manifest,logical_dataset_version:'gate-e-'+A,canonical_event_count:2,quality_A:2,sources:[...manifest.sources,{path:'/data/incoming/'+A+'.csv',role:'append_only_ledger',events:1}]};
  put('data/incoming/'+A+'.csv',csv);put('data/intake-proofs/'+A+'.json',JSON.stringify(proof,null,2)+'\n');put('data/manifest.json',JSON.stringify(updated,null,2)+'\n');
  git('add','.');git('commit','-qm','event submission');const head=git('rev-parse','HEAD');
  const p=policy({branch:'stat-intake/'+A,paths:git('diff','--name-only',base,head).split('\n').filter(Boolean)});
  if(!p.ok)throw Error('policy rejected valid event: '+p.reason);
  const a=ancestry({base,head,gitCall:(...v)=>git(...v)});
  if(!a.ok)throw Error('ancestry rejected valid event: '+a.reason);
  const proofResult=validate({base,head,read:(...v)=>git(...v)});
  if(!proofResult.ok)throw Error('intake manifest validation failed');
  console.log('PASS: real isolated Git repository, 3-file event commit, physical proof and manifest');
  git('switch','-q','main');put('irrelevant.txt','main advanced\n');git('add','.');git('commit','-qm','main advanced');const newBase=git('rev-parse','HEAD');
  const s=ancestry({base:newBase,head,gitCall:(...v)=>git(...v)});
  if(s.ok||s.reason!=='STALE_BASE')throw Error('stale proposal not rejected');
  console.log('PASS: a competing main commit makes old proposal stale');
  const neg=policy({branch:'fix/other',paths:['data/manifest.json']});
  if(neg.ok)throw Error('regular PR unexpectedly permitted to modify manifest');
  console.log('PASS: non-intake modification of statistical manifest rejected');
  return {ok:true,checks:3};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
if(require.main===module){try{console.log(JSON.stringify(run()));}catch(e){console.error('FAIL Gate C local integration:',e.message);process.exitCode=1;}}
module.exports={run};
