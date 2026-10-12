'use strict';
/**
 * Gate E negative tests for the REAL repository implementation.
 * Copy into tests/regression/ of a LOCAL checkout, then run:
 * node --test tests/regression/statistical-gate-e-negative.integration.test.cjs
 * Strictly mocked GitHub transport: no network calls, no production writes.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=path.resolve(__dirname,'../..');
const {stageStatisticalSubmission}=require(path.join(base,'server/statistical-github-stage.cjs'));
const {prepare}=require(path.join(base,'statistical/submission.js'));
const brokers=require(path.join(base,'data/print-brokers.json')).brokers
 .filter(b=>b.nome&&b.creci&&String(b.cargo).includes('salão')).slice(0,10);
assert.equal(brokers.length,10,'fixture requires ten official brokers');
const MAIN='a'.repeat(40), TREE='b'.repeat(40), COMMIT='c'.repeat(40);
const ROOT='https://api.github.com/repos/wagnerjfjunior/Roleta';
const manifest=JSON.parse(fs.readFileSync(path.join(base,'data/manifest.json'),'utf8'));
const reviewed=date=>({evento:{data:date,periodo:'INTEGRAL',empreendimento:'CAMINHOS DA LAPA',tegra_qtd:10},salao:brokers.map((b,i)=>({ordem_final:i+1,nome:b.nome,creci:b.creci,gerente:b.gerente,diretor:b.diretor,status_creci:b.status_creci}))});
const makeInput=(date='11/10/2026')=>({reviewed:reviewed(date),physicalByDraw:[10,2,3,4,5,6,7,8,9,1],source:'IMG_1700.jpeg',acknowledged:true});
const ok=data=>({ok:true,status:200,json:async()=>data});
const fail=(status=404)=>({ok:false,status,json:async()=>({message:'isolated mock rejection'})});
function mockGitHub({failure=null}={}){
 const state={requests:[],branches:new Map(),prs:new Map(),snapshots:[],manifestCommits:[]};
 const transport=async(url,opts)=>{
  assert.ok(url.startsWith(ROOT));const route=url.slice(ROOT.length),method=opts.method;
  const body=opts.body?JSON.parse(opts.body):null;
  state.requests.push({method,route,body});
  const branchPrefix='/git/ref/heads/stat-intake/';
  if(route.startsWith(branchPrefix)){
   const name='stat-intake/'+route.slice(branchPrefix.length);return state.branches.has(name)?ok({object:{sha:state.branches.get(name)}}):fail();
  }
  if(route.startsWith('/contents/data/intake-proofs/')){
   const name=route.match(/\/([^/]+)\.json\?ref=/)?.[1];
   const proof=state.snapshots.find(x=>x.proof?.event_id===name)?.proof;
   return proof?ok({content:Buffer.from(JSON.stringify(proof)).toString('base64')}):fail();
  }
  if(method==='GET'&&route.startsWith('/pulls?')){
   const head=decodeURIComponent(route.split('head=')[1]||'').replace('wagnerjfjunior:','');
   return ok([...state.prs.values()].filter(p=>p.head===head&&p.open).map(p=>({number:p.number,html_url:p.url})));
  }
  if(route==='/git/ref/heads/main')return ok({object:{sha:MAIN}});
  if(route==='/contents/data/manifest.json?ref='+MAIN)return ok({content:Buffer.from(JSON.stringify(manifest)).toString('base64')});
  if(route.startsWith('/contents/data/')){
   const file=route.slice('/contents/'.length).replace('?ref='+MAIN,'');
   return ok({content:fs.readFileSync(path.join(base,file)).toString('base64')});
  }
  if(route==='/git/commits/'+MAIN)return ok({tree:{sha:TREE}});
  if(method==='POST'&&route==='/git/trees'){
   const proof=JSON.parse(body.tree.find(x=>x.path.startsWith('data/intake-proofs/')).content);
   const newManifest=JSON.parse(body.tree.find(x=>x.path==='data/manifest.json').content);
   state.snapshots.push({proof,manifest:newManifest});return ok({sha:TREE});
  }
  if(method==='POST'&&route==='/git/commits')return ok({sha:COMMIT});
  if(method==='POST'&&route==='/git/refs'){
   const name=body.ref.replace('refs/heads/','');
   if(state.branches.has(name))return fail(422);
   state.branches.set(name,body.sha);
   if(failure==='after_branch')return fail(502);
   return ok({ref:body.ref});
  }
  if(method==='POST'&&route==='/pulls'){
   if(failure==='after_branch'||failure==='pr_rejected')return fail(502);
   const number=800+state.prs.size;
   const p={number,head:body.head,open:true,url:`https://github.com/wagnerjfjunior/Roleta/pull/${number}`};
   state.prs.set(number,p);return ok({number,html_url:p.url});
  }
  throw Error('Unexpected mocked GitHub route '+method+' '+route);
 };
 return {state,transport};
}
const stage=(input,transport)=>stageStatisticalSubmission(input,{actorSub:'operator-1',token:'placeholder-placeholder',transport,clock:()=> '2026-10-12T02:00:00Z'});
test('two distinct events generate stale manifest snapshots (must block second merge)',async()=>{
 const mock=mockGitHub();const a=makeInput('11/10/2026'),b=makeInput('12/10/2026');
 const out=await Promise.all([stage(a,mock.transport),stage(b,mock.transport)]);
 assert.equal(out.length,2);assert.equal(mock.state.prs.size,2);
 assert.deepEqual(mock.state.snapshots.map(x=>x.manifest.canonical_event_count),[manifest.canonical_event_count+1,manifest.canonical_event_count+1]);
 assert.notEqual(mock.state.snapshots[0].proof.event_id,mock.state.snapshots[1].proof.event_id);
 // This is a TEST OF THE RISK, not a passing implementation of rebase/reconciliation.
});
test('same-event concurrent requests do not overwrite branch',async()=>{
 const mock=mockGitHub();const results=await Promise.allSettled([stage(makeInput(),mock.transport),stage(makeInput(),mock.transport)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
 assert.equal(mock.state.branches.size,1);assert.equal(mock.state.prs.size,1);
});
test('branch created then PR rejected fails closed on retry',async()=>{
 const mock=mockGitHub({failure:'pr_rejected'});
 await assert.rejects(stage(makeInput(),mock.transport),e=>e.status===502);
 assert.equal(mock.state.branches.size,1);assert.equal(mock.state.prs.size,0);
 await assert.rejects(stage(makeInput(),mock.transport),e=>e.status===409);
 assert.equal(mock.state.branches.size,1);
});
test('identical replay returns PR and zero additional write requests',async()=>{
 const mock=mockGitHub();await stage(makeInput(),mock.transport);
 const before=mock.state.requests.filter(x=>x.method!=='GET').length;
 const replay=await stage(makeInput(),mock.transport);
 assert.equal(replay.replayed,true);
 assert.equal(mock.state.requests.filter(x=>x.method!=='GET').length,before);
});
test('replayed event with changed physical position conflicts',async()=>{
 const mock=mockGitHub();await stage(makeInput(),mock.transport);
 const changed=makeInput();changed.physicalByDraw=[9,2,3,4,5,6,7,8,10,1];
 await assert.rejects(stage(changed,mock.transport),e=>e.status===409);
});
test('identical replay with PR closed is blocked',async()=>{
 const mock=mockGitHub();await stage(makeInput(),mock.transport);
 [...mock.state.prs.values()][0].open=false;
 await assert.rejects(stage(makeInput(),mock.transport),e=>e.status===409);
});
test('proof stores every physical↔ball mapping with original event date',async()=>{
 const mock=mockGitHub();await stage(makeInput(),mock.transport);
 const {proof}=mock.state.snapshots[0];
 assert.equal(proof.event_date,'2026-10-11');assert.equal(proof.drawn_mapping.length,10);
 assert.equal(proof.drawn_mapping[0].physical_position,10);
 assert.equal(proof.drawn_mapping[9].physical_position,1);
 assert.equal(proof.payload_sha256,crypto.createHash('sha256').update(JSON.stringify(prepare(makeInput().reviewed,makeInput().physicalByDraw,{source:'IMG_1700.jpeg',acknowledged:true}))).digest('hex'));
});
