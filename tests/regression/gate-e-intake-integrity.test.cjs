'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {inspect}=require('../../scripts/gate-e/validate-intake-pr.cjs');
const crypto=require('node:crypto');
const sha=n=>n.repeat(40);
function fixture(options={}){
 const id='2026-10-12-M',physical=[10,2,3,4,5,6,7,8,9,1];
 const mapping=physical.map((p,i)=>({drawn_number:i+1,physical_position:p,broker_name:'Broker '+(i+1)}));
 const e={schema:'rlt-statistical-submission-v1',event_id:id,event_date:'2026-10-12',period:'manha',N:10,occupied:[1,2,3,4,5,6,7,8,9,10],first:10,second:2,courtesy:9,last:1,drawn_mapping:mapping,source:'IMG_1700.jpeg',quality:'A',human_review_confirmed:true};
 const digest=crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex');
 const proof={schema:'rlt-statistical-proof-v1',event_id:id,event_date:e.event_date,period:e.period,source:e.source,submitted_at:'2026-10-12T12:00:00Z',actor_hash:'a'.repeat(16),N:10,physical_positions:e.occupied,drawn_mapping:mapping,human_review_confirmed:true,payload_sha256:digest};
 const header='Fonte,Evento,Data,Período,N,Posições físicas ocupadas,Nº1 físico,Nº1 ordem efetiva,Nº2 físico,Nº2 ordem efetiva,Cortesia físico,Cortesia ordem efetiva,Último físico,Último ordem efetiva,Qualidade,Observação';
 const csv=header+'\nIMG_1700.jpeg,'+id+',12/10/2026,manha,10,"1,2,3,4,5,6,7,8,9,10",10,10,2,2,9,9,1,1,A,payload_sha256='+digest+'\n';
 const base={logical_dataset_version:'old',canonical_event_count:1,quality_A:1,quality_B:0,sources:[{path:'/data/events.csv',role:'baseline',events:1}]};
 const next={...base,logical_dataset_version:'new',canonical_event_count:2,quality_A:2,sources:[...base.sources,{path:'/'+'data/incoming/'+id+'.csv',role:'append_only_ledger',events:1}]};
 const historical=header+'\nOLD,old,11/10/2026,integral,10,"1,2,3,4,5,6,7,8,9,10",1,1,2,2,9,9,10,10,A,old\n';
 const paths=['data/incoming/'+id+'.csv','data/intake-proofs/'+id+'.json','data/manifest.json'].sort();
 const content={['base:data/manifest.json']:JSON.stringify(base),['head:data/manifest.json']:JSON.stringify(next),['head:data/incoming/'+id+'.csv']:csv,['head:data/intake-proofs/'+id+'.json']:JSON.stringify(proof),['base:data/events.csv']:historical};
 Object.assign(content,options.content||{});
 const read=(...args)=>{
  if(args[0]==='rev-parse')return args[2].startsWith('origin')?sha('a'):sha('b');
  if(args[0]==='merge-base')return options.stale?sha('c'):sha('a');
  if(args[0]==='rev-list')return '';
  if(args[0]==='diff')return (options.paths||paths).join('\n');
  if(args[0]==='show'){const k=args[1].replace(sha('a')+':','base:').replace(sha('b')+':','head:');if(!(k in content))throw Error('missing '+k);return content[k];}
  throw Error('unexpected git call '+args.join(' '));
 };
 return {read,content,base,next,proof,paths};
}
const run=x=>inspect({base:'origin/main',head:'HEAD',read:x.read});
test('valid one-event append and complete proof are accepted',()=>{assert.equal(run(fixture()).newCount,2);});
test('stale main rejects before reading dataset',()=>{assert.throws(()=>run(fixture({stale:true})),/stale base/);});
test('unexpected changed historical files rejected',()=>{const x=fixture();x.paths.push('data/events.csv');assert.throws(()=>run(x),/unexpected changed paths/);});
test('missing proposed source rejected',()=>{const x=fixture();x.next.sources.pop();x.content['head:data/manifest.json']=JSON.stringify(x.next);assert.throws(()=>run(x),/historical source definitions|unexpected new source/);});
test('lost canonical event count rejected',()=>{const x=fixture();x.next.canonical_event_count=1;x.content['head:data/manifest.json']=JSON.stringify(x.next);assert.throws(()=>run(x),/totals inconsistent/);});
test('tampered original physical mapping rejected by digest',()=>{const x=fixture();x.proof.drawn_mapping[0].physical_position=11;x.content['head:data/intake-proofs/2026-10-12-M.json']=JSON.stringify(x.proof);assert.throws(()=>run(x),/occupied lines inconsistent|digest mismatch/);});
test('collision with original date and period rejected',()=>{const x=fixture();x.content['base:data/events.csv']=x.content['base:data/events.csv'].replace('11/10/2026,integral','12/10/2026,manha');assert.throws(()=>run(x),/existing event collision/);});
test('a published correction cannot masquerade as an append',()=>{const x=fixture();x.paths.push('data/incoming/2026-10-11-I.csv');assert.throws(()=>run(x),/exactly one event CSV required|unexpected changed paths/);});
