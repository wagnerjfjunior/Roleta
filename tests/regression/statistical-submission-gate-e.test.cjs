'use strict';
// Gate E: no external IO, no live GitHub writes, no database mutations.
const test=require('node:test'),assert=require('node:assert/strict');
const {prepare}=require('../../statistical/submission.js');
const {assertUniqueEvent,buildCsv,stageStatisticalSubmission}=require('../../server/statistical-github-stage.cjs');
const {createHandler}=require('../../api/statistical-submit.js');
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../..');
const brokers=require('../../data/print-brokers.json').brokers.filter(b=>b.nome&&b.creci&&b.cargo.includes('salão')).slice(0,10);
assert.equal(brokers.length,10);
const rows=brokers.map((b,i)=>({ordem_final:i+1,nome:b.nome,creci:b.creci,
 gerente:b.gerente,diretor:b.diretor,status_creci:b.status_creci}));
const reviewed={evento:{data:'11/10/2026',periodo:'INTEGRAL',empreendimento:'CAMINHOS DA LAPA',tegra_qtd:10},salao:rows};
const physical=[10,2,3,4,5,6,7,8,9,1]; // physical row 1 draws ball 10; physical row 10 draws ball 1
const input={reviewed,physicalByDraw:physical,source:'IMG_1700.jpeg',acknowledged:true};
const good=()=>prepare(input.reviewed,input.physicalByDraw,{source:input.source,acknowledged:input.acknowledged});
test('explicit physical lines are not drawn balls; original date and event id persist',()=>{
 const e=good();
 assert.equal(e.event_id,'2026-10-11-I');
 assert.equal(e.event_date,'2026-10-11');
 assert.equal(e.period,'integral');
 assert.equal(e.N,10);
 assert.equal(e.first,10);
 assert.equal(e.last,1);
 assert.equal(e.drawn_mapping[0].physical_position,10);
 assert.equal(e.drawn_mapping[9].physical_position,1);
 assert.deepEqual(e.occupied,[1,2,3,4,5,6,7,8,9,10]);
});
test('missing physical row, duplicate, identity and source do not pass human gate',()=>{
 const bad=(patch,config={})=>prepare(patch.reviewed??reviewed,patch.physicalByDraw??physical,
  {source:patch.source??'IMG_1700.jpeg',acknowledged:config.acknowledged??true});
 assert.throws(()=>bad({physicalByDraw:[0,...physical.slice(1)]}),/física/);
 assert.throws(()=>bad({physicalByDraw:[10,10,...physical.slice(2)]}),/física/);
 assert.throws(()=>bad({physicalByDraw:[10.1,...physical.slice(1)]}),/física/);
 assert.throws(()=>bad({source:'=HYPERLINK("x")'}),/origem/);
 assert.throws(()=>bad({}, {acknowledged:false}),/humana/);
 assert.throws(()=>bad({reviewed:{...reviewed,evento:{...reviewed.evento,data:'31/02/2026'}}}),/Data/);
 assert.throws(()=>bad({reviewed:{...reviewed,salao:rows.map((x,i)=>({...x,ordem_final:i===9?1:i+1}))}}),/Bolinha/);
});
test('CSV persistency uses physical labels and EFFECTIVE compact order distinctly',()=>{
 const e={...good(),occupied:[1,2,3,4,5,6,7,8,9,11],first:11,last:1,
  drawn_mapping:[{drawn_number:1,physical_position:11},{drawn_number:10,physical_position:1}]};
 const csv=buildCsv(e,'actorhash','2026-10-12T00:10:00Z');
 const lines=csv.trim().split('\n');
 assert.match(lines[0],/Nº1 físico,Nº1 ordem efetiva/);
 assert.match(lines[1],/,11,10,2,2,/); // physical row 11, tenth occupied line
 assert.match(lines[1],/2026-10-11-I,11\/10\/2026,integral/);
});
test('manifest collision blocks same event by date and period regardless of ID',()=>{
 const m={canonical_event_count:1,sources:[{path:'/data/events.csv',events:1}]};
 const existing=[{Evento:'LEGACY-42',Data:'11/10/2026', 'Período':'integral'}];
 assert.throws(()=>assertUniqueEvent(m,[existing],good()),/already registered/);
 const unknown=[{Evento:'P05',Data:'11/10/2026','Período':'desconhecido'}];
 assert.throws(()=>assertUniqueEvent(m,[unknown],good()),/already registered/);
});
test('Gate E is disabled by default: no auth, no GitHub stage',async()=>{
 let stageCalls=0,authCalls=0;
 const h=createHandler({env:{},authenticate:{session:()=>{authCalls++;return null;}},
  stage:async()=>{stageCalls++;}});
 const state={status:0,body:null};const res={setHeader(){},status(v){state.status=v;return this;},json(v){state.body=v;return this;}};
 await h({method:'POST',headers:{}},res);
 assert.equal(state.status,503);assert.equal(authCalls,0);assert.equal(stageCalls,0);
});
test('enabled Gate E requires trusted Google sub, same origin and CSRF',async()=>{
 let staged=0;
 const auth={requireSameOrigin:()=>true,session:()=>({sub:'operator-1'}),
  csrfForSub:()=> 'secret'};
 const env={ROLETA_STAT_WRITES_ENABLED:'true',ROLETA_STAT_GITHUB_TOKEN:'placeholder-placeholder',
  ROLETA_STAT_ALLOWED_SUBS:'operator-1'};
 const makeRes=()=>{const state={status:null,data:null};
  return {state,setHeader(){},status(v){state.status=v;return this;},json(v){state.data=v;return this;}};};
 const request={method:'POST',headers:{'content-type':'application/json','x-roleta-csrf':'secret'},
  body:input};
 const stage=async(args)=>{staged++;assert.equal(args.actorSub,'operator-1');
  return {status:'pending_review',event_id:'2026-10-11-I',pr_number:999,pr_url:'https://github.com/wagnerjfjunior/Roleta/pull/999'};};
 let r=makeRes();await createHandler({env,authenticate:auth,stage})(request,r);assert.equal(r.state.status,202);
 r=makeRes();await createHandler({env:{...env,ROLETA_STAT_ALLOWED_SUBS:'other'},authenticate:auth,stage})(request,r);assert.equal(r.state.status,403);
 r=makeRes();await createHandler({env,authenticate:auth,stage})({...request,headers:{...request.headers,'x-roleta-csrf':'bad'}},r);assert.equal(r.state.status,403);
 r=makeRes();await createHandler({env,authenticate:{...auth,requireSameOrigin:()=>false},stage})(request,r);assert.equal(r.state.status,403);
 assert.equal(staged,1);
});
test('GitHub stage checks manifest then prepares a single commit and REVIEW PR',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'data/manifest.json'),'utf8'));
 const sha='a'.repeat(40);const seen=[];const clock=()=> '2026-10-12T00:10:00Z';
 const mock=async(url,opts)=>{
  const name=url.replace('https://api.github.com/repos/wagnerjfjunior/Roleta','');
  const body=opts.body?JSON.parse(opts.body):null;seen.push({name,method:opts.method,body});
  let data={};
  if(name==='/git/ref/heads/main')data={object:{sha}};
  else if(name==='/contents/data/manifest.json?ref=main')data={content:Buffer.from(JSON.stringify(manifest)).toString('base64')};
  else if(name.startsWith('/contents/data/')){
   const p=name.slice('/contents/'.length).replace('?ref=main','');
   data={content:fs.readFileSync(path.join(base,p)).toString('base64')};
  }else if(name==='/git/commits/'+sha)data={tree:{sha:'b'.repeat(40)}};
  else if(name==='/git/trees'){
   assert.equal(body.tree.length,2);
   assert.equal(body.tree[0].path,'data/incoming/2026-10-11-I.csv');
   assert.equal(body.tree[1].path,'data/manifest.json');
   assert.equal(JSON.parse(body.tree[1].content).canonical_event_count,manifest.canonical_event_count+1);
   data={sha:'c'.repeat(40)};
  }else if(name==='/git/commits'&&opts.method==='POST')data={sha:'d'.repeat(40)};
  else if(name==='/git/refs'&&opts.method==='POST'){
   assert.equal(body.ref,'refs/heads/stat-intake/2026-10-11-I');data={};
  }else if(name==='/pulls'&&opts.method==='POST'){
   assert.equal(body.base,'main');assert.equal(body.head,'stat-intake/2026-10-11-I');data={number:789,html_url:'https://github.com/wagnerjfjunior/Roleta/pull/789'};
  }else throw Error('Unexpected mock route '+name);
  return {ok:true,status:200,json:async()=>data};
 };
 const result=await stageStatisticalSubmission(input,{actorSub:'operator-1',token:'placeholder-placeholder',transport:mock,clock});
 assert.equal(result.status,'pending_review');
 assert.equal(result.pr_number,789);
 assert.equal(seen.filter(x=>x.name==='/git/commits'&&x.method==='POST').length,1);
 assert.equal(seen.filter(x=>x.name==='/pulls').length,1);
 assert.equal(seen.filter(x=>x.name==='/git/refs'&&x.method==='POST').length,1);
 assert.equal(seen.filter(x=>x.name.endsWith('/main')&&x.method==='PATCH').length,0);
});
