'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createRouter,config}=require('../api/ocr-shadow-submit');
const {createHandler}=require('../server/ocr-callback-handler.cjs');
const response=()=>({setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
test('canonical and rewritten URLs select exactly the intended handler',async()=>{
 for(const [path,op] of [['ocr-job-submit','submit'],['ocr-job-status','status'],['ocr-callback','callback'],['ocr-shadow-submit','shadow']]){
  for(const url of ['/api/'+path,'/api/ocr-shadow-submit?__intake='+op+'&job_id=fixture']){
   const calls=[];const handlers=Object.fromEntries(['shadow','submit','status','callback'].map(n=>[n,req=>calls.push([n,req.url])]));
   await createRouter(handlers)({url},response());assert.deepEqual(calls,[[op,url]]);
  }
 }
});
test('invalid routing fails closed and raw request parser remains disabled',async()=>{
 const res=response();await createRouter()({url:'/api/ocr-shadow-submit?__intake=unexpected'},res);assert.equal(res.code,404);
 assert.equal(config.api.bodyParser,false);
});
test('rewrites retain canonical external routes and deploy at most twelve functions',()=>{
 const cfg=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 assert.equal(cfg.rewrites.length,3);
 for(const [path,op] of [['ocr-job-submit','submit'],['ocr-job-status','status'],['ocr-callback','callback']]){
  assert.ok(cfg.rewrites.some(r=>r.source==='/api/'+path&&r.destination==='/api/ocr-shadow-submit?__intake='+op));
 }
 const files=fs.readdirSync('api',{recursive:true}).filter(p=>p.endsWith('.js'));assert.equal(files.length,12);
});
test('routed callback authenticates raw payload without opening the DB',async()=>{
 const env={ROLETA_INTAKE_ENABLED:'false',ROLETA_INTAKE_CALLBACK_PROBE_ENABLED:'true',ROLETA_INTAKE_CALLBACK_AUTH:'managed_api_key',ROLETA_INTAKE_CALLBACK_API_KEY:'fixture-router-key-exclusive-at-least-32-bytes'};
 let dbCalls=0;const router=createRouter({callback:createHandler({env,db:()=>{dbCalls++;throw Error('no DB');}})});
 const req={method:'POST',url:'/api/ocr-shadow-submit?__intake=callback',body:Buffer.from('{"probe":"auth"}'),headers:{'content-type':'application/json','x-roleta-probe':'auth','x-roleta-callback-key':env.ROLETA_INTAKE_CALLBACK_API_KEY,'x-roleta-job-id':'550e8400-e29b-41d4-a716-446655440000','x-roleta-nonce':'routerNonce123456789','x-roleta-timestamp':String(Date.now())}};
 const res=response();await router(req,res);assert.equal(res.code,200);assert.equal(res.body.status,'AUTHENTICATED_NO_WRITE');assert.equal(dbCalls,0);
});
