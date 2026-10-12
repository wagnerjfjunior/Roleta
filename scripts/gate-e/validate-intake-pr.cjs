'use strict';
// Read-only, fail-closed validator for single-event Gate E submissions.
// This validator does not update main, repair orphan refs or alter historical files.
const {execFileSync}=require('node:child_process');
const {csvRows}=require('../../server/statistical-github-stage.cjs');
const crypto=require('node:crypto');
function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trimEnd();}
function fail(message){throw Error('GATE_E_REJECTED: '+message);}
const parse=(text,name)=>{try{return JSON.parse(text);}catch{fail('invalid JSON: '+name);}};
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function inspect({base='origin/main',head='HEAD',read=git}={}){
 const baseSha=read('rev-parse','--verify',base+'^{commit}').trim();
 const headSha=read('rev-parse','--verify',head+'^{commit}').trim();
 if(baseSha===headSha)fail('no proposal');
 if(read('merge-base',baseSha,headSha).trim()!==baseSha)fail('stale base: revalidate and reconstruct from current main');
 if(read('rev-list','--min-parents=2',baseSha+'..'+headSha).trim())fail('merge commits disallowed');
 const paths=read('diff','--name-only',baseSha,headSha).split('\n').filter(Boolean).sort();
 const incoming=paths.filter(x=>/^data\/incoming\/\d{4}-\d{2}-\d{2}-[MTI]\.csv$/.test(x));
 if(incoming.length!==1)fail('exactly one event CSV required');
 const eventId=incoming[0].slice('data/incoming/'.length,-4);
 const proofPath='data/intake-proofs/'+eventId+'.json';
 const expected=[incoming[0],proofPath,'data/manifest.json'].sort();
 if(!same(paths,expected))fail('unexpected changed paths');
 const baseManifest=parse(read('show',baseSha+':data/manifest.json'),'base manifest');
 const proposed=parse(read('show',headSha+':data/manifest.json'),'proposed manifest');
 if(!Array.isArray(baseManifest.sources)||!Array.isArray(proposed.sources))fail('invalid sources');
 if(!same(proposed.sources.slice(0,-1),baseManifest.sources))fail('historical source definitions changed');
 if(!same(proposed.sources[proposed.sources.length-1],{path:'/'+incoming[0],role:'append_only_ledger',events:1}))fail('unexpected new source');
 if(proposed.canonical_event_count!==baseManifest.canonical_event_count+1||proposed.quality_A!==baseManifest.quality_A+1||proposed.quality_B!==baseManifest.quality_B)fail('manifest totals inconsistent');
 for(const [key,value] of Object.entries(baseManifest)){
  if(['sources','canonical_event_count','quality_A','quality_B','logical_dataset_version'].includes(key))continue;
  if(!same(proposed[key],value))fail('historical manifest metadata changed: '+key);
 }
 for(const key of Object.keys(proposed))if(!(key in baseManifest))fail('unexpected manifest property: '+key);
 const proof=parse(read('show',headSha+':'+proofPath),'proof');
 const csv=csvRows(read('show',headSha+':'+incoming[0]));
 if(csv.length!==1)fail('must add exactly one CSV row');
 const row=csv[0];
 if(proof.schema!=='rlt-statistical-proof-v1'||proof.event_id!==eventId||row.Evento!==eventId||proof.human_review_confirmed!==true)fail('invalid event proof or identity');
 if(!/^\d{4}-\d\d-\d\d-[MTI]$/.test(eventId)||proof.event_date!==eventId.slice(0,10))fail('event date mismatch');
 const parts=eventId.split('-'),suffix=parts.pop();
 const expectedPeriod={M:'manha',T:'tarde',I:'integral'}[suffix];
 const expectedDate=parts[2]+'/'+parts[1]+'/'+parts[0];
 if(proof.period!==expectedPeriod||row['Período']!==expectedPeriod||row.Data!==expectedDate)fail('date/period inconsistent');
 const mapping=proof.drawn_mapping;
 if(!Number.isSafeInteger(proof.N)||proof.N<4||proof.N>200||!Array.isArray(mapping)||mapping.length!==proof.N)fail('invalid N or mapping');
 const drawn=new Set(),physical=new Set(),names=new Set();
 for(const x of mapping){
  if(!x||!Number.isSafeInteger(x.drawn_number)||x.drawn_number<1||x.drawn_number>proof.N||drawn.has(x.drawn_number))fail('drawn permutation invalid');
  if(!Number.isSafeInteger(x.physical_position)||x.physical_position<1||x.physical_position>999||physical.has(x.physical_position))fail('physical positions invalid');
  if(typeof x.broker_name!=='string'||!x.broker_name.trim()||names.has(x.broker_name))fail('duplicate or invalid broker');
  drawn.add(x.drawn_number);physical.add(x.physical_position);names.add(x.broker_name);
 }
 const occupied=[...physical].sort((a,b)=>a-b);
 if(!same(occupied,proof.physical_positions)||Number(row.N)!==proof.N||row['Posições físicas ocupadas']!==occupied.join(','))fail('occupied lines inconsistent');
 const byDraw=new Map(mapping.map(x=>[x.drawn_number,x.physical_position]));
 for(const [num,key] of [[1,'Nº1 físico'],[2,'Nº2 físico'],[proof.N-1,'Cortesia físico'],[proof.N,'Último físico']])if(Number(row[key])!==byDraw.get(num))fail('special physical position mismatch');
 for(const [num,key] of [[1,'Nº1 ordem efetiva'],[2,'Nº2 ordem efetiva'],[proof.N-1,'Cortesia ordem efetiva'],[proof.N,'Último ordem efetiva']])if(Number(row[key])!==occupied.indexOf(byDraw.get(num))+1)fail('effective position mismatch');
 if(row.Qualidade!=='A'||proof.source!==row.Fonte||!proof.source||!/^\d{4}-\d\d-\d\dT/.test(proof.submitted_at||'')||!/^[a-f0-9]{16}$/.test(proof.actor_hash||'')||!/^[a-f0-9]{64}$/.test(proof.payload_sha256||''))fail('invalid audit metadata');
 // Cross-check the digest against the canonical preparation object, including all rows.
 const prepared={schema:'rlt-statistical-submission-v1',event_id:eventId,event_date:proof.event_date,period:proof.period,N:proof.N,occupied,first:byDraw.get(1),second:byDraw.get(2),courtesy:byDraw.get(proof.N-1),last:byDraw.get(proof.N),drawn_mapping:mapping,source:proof.source,quality:'A',human_review_confirmed:true};
 if(hash(prepared)!==proof.payload_sha256)fail('proof digest mismatch');
 if(row['Observação']&&!row['Observação'].includes('payload_sha256='+proof.payload_sha256))fail('CSV digest mismatch');
 // Preserve unique date+period against historical manifest sources.
 for(const source of baseManifest.sources){
  const records=csvRows(read('show',baseSha+':'+source.path.slice(1)));
  if(records.length!==source.events)fail('base source record count differs');
  for(const previous of records){
   const period=String(previous['Período']||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   if(previous.Evento===eventId||(previous.Data===expectedDate&&(period===expectedPeriod||period==='desconhecido')))fail('existing event collision');
  }
 }
 return {ok:true,eventId,baseSha,headSha,source:incoming[0],proof:proofPath,baseCount:baseManifest.canonical_event_count,newCount:proposed.canonical_event_count};
}
if(require.main===module){try{console.log(JSON.stringify(inspect({base:process.argv[2]||'origin/main',head:process.argv[3]||'HEAD'}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={inspect};
