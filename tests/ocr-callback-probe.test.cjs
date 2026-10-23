'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../server/ocr-callback-handler.cjs');
const secret='fixture-only-auth-probe-secret-at-least-32-bytes';
const env={ROLETA_INTAKE_ENABLED:'false',ROLETA_INTAKE_CALLBACK_AUTH:'managed_api_key',ROLETA_INTAKE_CALLBACK_API_KEY:secret,ROLETA_INTAKE_CALLBACK_PROBE_ENABLED:'true'};
const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
function request(payload={probe:'auth'},headers={}){return {method:'POST',body:Buffer.from(JSON.stringify(payload)),headers:{'content-type':'application/json','x-roleta-probe':'auth','x-roleta-callback-key':secret,'x-roleta-job-id':'550e8400-e29b-41d4-a716-446655440000','x-roleta-nonce':'probeNonce1234567890','x-roleta-timestamp':String(Date.now()),...headers}};}
async function run(req,changes={}){let dbCalls=0;const res=response();await createHandler({env:{...env,...changes},db:()=>{dbCalls++;throw Error('must never open DB');}})(req,res);assert.equal(dbCalls,0);return res;}
test('auth probe works with intake OFF and never opens DB',async()=>{
 const r=await run(request());assert.equal(r.code,200);assert.deepEqual(r.body,{status:'AUTHENTICATED_NO_WRITE'});assert.ok(!JSON.stringify(r.body).includes(secret));
});
test('Vercel parsed JSON is supported only for API-key mode, with payload and size gates intact',async()=>{
 const req=request();req.body={probe:'auth'};assert.equal((await run(req)).code,200);
 assert.equal((await run(req,{ROLETA_INTAKE_CALLBACK_AUTH:'hmac'})).code,415);
 req.headers['x-roleta-callback-key']='invalid';assert.equal((await run(req)).code,401);
 req.headers['x-roleta-callback-key']=secret;req.body={probe:'auth',result:{}};assert.equal((await run(req)).code,422);
 req.body={probe:'auth',large:'x'.repeat(1024*1024)};assert.equal((await run(req)).code,413);
});
test('probe is disabled by default',async()=>{assert.equal((await run(request(),{ROLETA_INTAKE_CALLBACK_PROBE_ENABLED:undefined})).code,503);});
test('probe does not enable regular result or failure persistence',async()=>{
 for(const payload of [{status:'FAILED',error_code:'GEMINI_503_EXHAUSTED'},{model_id:'fixture',result:{linhas:[]}}]){
  assert.equal((await run(request(payload,{'x-roleta-probe':undefined}))).code,503);
  assert.equal((await run(request(payload))).code,422);
 }
});
test('probe rejects incorrect, revoked and short credentials',async()=>{
 assert.equal((await run(request({}, {'x-roleta-callback-key':'invalid'}))).code,401);
 assert.equal((await run(request(),{ROLETA_INTAKE_CALLBACK_API_KEY:'replacement-exclusive-secret-over-32-bytes'})).code,401);
 assert.equal((await run(request(),{ROLETA_INTAKE_CALLBACK_API_KEY:'short'})).code,401);
});
test('probe refuses expired envelope and additional body fields',async()=>{
 assert.equal((await run(request({probe:'auth'},{'x-roleta-timestamp':String(Date.now()-600000)}))).code,401);
 assert.equal((await run(request({probe:'auth',result:{linhas:[]}}))).code,422);
});
test('probe cannot persist even when intake is ON',async()=>{
 assert.equal((await run(request(),{ROLETA_INTAKE_ENABLED:'true'})).code,200);
 assert.equal((await run(request({status:'FAILED',error_code:'GEMINI_503_EXHAUSTED'}),{ROLETA_INTAKE_ENABLED:'true'})).code,422);
});
