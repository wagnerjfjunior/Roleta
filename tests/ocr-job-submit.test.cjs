'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../server/ocr-job-submit-handler.cjs');
const sub='google-sub-A',email='operator@example.com',id='550e8400-e29b-41d4-a716-446655440000';
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);
const env={ROLETA_INTAKE_ENABLED:'true',ROLETA_FINAL_OPERATOR_EMAILS:email,ROLETA_INTAKE_MAKE_WEBHOOK_URL:'https://hook.us2.make.com/example'};
const auth={session:()=>({sub,email}),requireSameOrigin:()=>true,csrfForSub:()=> 'csrf-secret'};
function req(){return {method:'POST',body:png,headers:{'content-type':'image/png','x-roleta-csrf':'csrf-secret'}};}
function response(){return {code:0,status(n){this.code=n;return this;},setHeader(){},json(x){this.body=x;return this;}};}
test('accepts image, dispatches exactly once, returns 202',async()=>{
 const sql=[];let dispatched=0;
 const db=()=>({query:async(q)=>{sql.push(q);return {rows:[{id,ok:true}]};}});
 const handler=createHandler({env,authenticate:auth,db,dispatch:async()=>{dispatched++;return {ok:true};}});
 const res=response();await handler(req(),res);
 assert.equal(res.code,202);assert.equal(dispatched,1);assert.equal(sql.length,2);
});
test('duplicate in-flight job never dispatches again',async()=>{
 let dispatched=0;
 const db=()=>({query:async(q)=>({rows:[q.includes('create_job')?{id}:{ok:false}]})});
 const handler=createHandler({env,authenticate:auth,db,dispatch:async()=>{dispatched++;return {ok:true};}});
 const res=response();await handler(req(),res);
 assert.equal(res.code,202);assert.equal(res.body.status,'EXISTING');assert.equal(dispatched,0);
});
test('failed dispatch invokes bounded fail_dispatch RPC',async()=>{
 const sql=[];
 const db=()=>({query:async(q)=>{sql.push(q);return {rows:[q.includes('create_job')?{id}:{ok:true}]};}});
 const handler=createHandler({env,authenticate:auth,db,dispatch:async()=>({ok:false})});
 const res=response();await handler(req(),res);
 assert.equal(res.code,503);assert.equal(sql.length,3);
 assert.match(sql[2],/fail_dispatch/);
});
test('rejects non-Make URL before any database write',async()=>{
 let called=0;
 const db=()=>({query:async()=>{called++;return {rows:[]};}});
 const handler=createHandler({env:{...env,ROLETA_INTAKE_MAKE_WEBHOOK_URL:'https://hook.us2.make.com.attacker.example/path'},authenticate:auth,db});
 const res=response();await handler(req(),res);
 assert.equal(res.code,503);assert.equal(called,0);
});
test('rejects wrong CSRF before any database write',async()=>{
 let called=0;
 const db=()=>({query:async()=>{called++;return {rows:[]};}});
 const handler=createHandler({env,authenticate:auth,db});
 const r=req();r.headers['x-roleta-csrf']='wrong';
 const res=response();await handler(r,res);
 assert.equal(res.code,403);assert.equal(called,0);
});

test('ambiguous transport timeout preserves job for a late signed callback',async()=>{
 const sql=[];
 const db=()=>({query:async(q)=>{sql.push(q);return {rows:[q.includes('create_job')?{id}:{ok:true}]};}});
 const handler=createHandler({env,authenticate:auth,db,dispatch:async()=>{const e=new Error('timeout');e.name='AbortError';throw e;}});
 const res=response();await handler(req(),res);
 assert.equal(res.code,202);assert.equal(res.body.status,'DISPATCH_UNCONFIRMED');
 assert.equal(res.body.job_id,id);
 assert.equal(sql.length,2);
 assert.ok(!sql.some(q=>q.includes('fail_dispatch')));
});
test('ambiguous network failure preserves job rather than recording a false FAILED',async()=>{
 const sql=[];
 const db=()=>({query:async(q)=>{sql.push(q);return {rows:[q.includes('create_job')?{id}:{ok:true}]};}});
 const handler=createHandler({env,authenticate:auth,db,dispatch:async()=>{throw new TypeError('fetch failed');}});
 const res=response();await handler(req(),res);
 assert.equal(res.code,202);assert.equal(res.body.status,'DISPATCH_UNCONFIRMED');
 assert.equal(sql.length,2);
});

test('status flags stale PROCESSING without overwriting the job',async()=>{
 const {createHandler:statusHandler}=require('../server/ocr-job-status-handler.cjs');
 const queries=[];
 const db=()=>({query:async(sql,args)=>{queries.push({sql,args});return {rows:[{job:{state:'PROCESSING',updated_at:new Date(Date.now()-600000).toISOString()}}]};}});
 const handler=statusHandler({env,authenticate:auth,db});
 const res=response();await handler({method:'GET',url:'/api/ocr-job-status?job_id='+id},res);
 assert.equal(res.code,200);assert.equal(res.body.state,'PROCESSING');
 assert.equal(res.body.reconciliation_required,true);
 assert.equal(queries.length,1);
 assert.equal(queries[0].args[1],sub);
});

test('feature discovery reports disabled without database or dispatch',async()=>{
 let calls=0;
 const handler=createHandler({env:{ROLETA_INTAKE_ENABLED:'false'},authenticate:auth,
  db:()=>{calls++;throw Error('unexpected DB');},dispatch:async()=>{calls++;throw Error('unexpected Make');}});
 const res=response();await handler({method:'GET',url:'/api/ocr-job-submit',headers:{}},res);
 assert.equal(res.code,200);assert.deepEqual(res.body,{enabled:false});assert.equal(calls,0);
});
test('feature discovery enabled does not disclose secrets',async()=>{
 const handler=createHandler({env:{...env,ROLETA_INTAKE_CALLBACK_API_KEY:'never-expose-me'},authenticate:auth});
 const res=response();await handler({method:'GET',url:'/api/ocr-job-submit',headers:{}},res);
 assert.equal(res.code,200);assert.deepEqual(res.body,{enabled:true});
});
test('POST remains disabled when feature flag is absent',async()=>{
 const handler=createHandler({env:{...env,ROLETA_INTAKE_ENABLED:undefined},authenticate:auth,
  db:()=>{throw Error('DB should not be called');}});
 const res=response();await handler(req(),res);assert.equal(res.code,503);
});
test('fresh status and completed status do not require reconciliation',async()=>{
 const {createHandler:statusHandler}=require('../server/ocr-job-status-handler.cjs');
 for(const state of ['PROCESSING','READY_FOR_REVIEW']){
  const date=new Date(Date.now()-(state==='PROCESSING'?1000:600000)).toISOString();
  const handler=statusHandler({env,authenticate:auth,
    db:()=>({query:async()=>({rows:[{job:{state,updated_at:date}}]})})});
  const res=response();await handler({method:'GET',url:'/api/ocr-job-status?job_id='+id},res);
  assert.equal(res.code,200);assert.equal(res.body.reconciliation_required,false);
 }
});
test('status query refuses nonexistent job without exposing result',async()=>{
 const {createHandler:statusHandler}=require('../server/ocr-job-status-handler.cjs');
 const handler=statusHandler({env,authenticate:auth,db:()=>({query:async()=>({rows:[{job:null}]})})});
 const res=response();await handler({method:'GET',url:'/api/ocr-job-status?job_id='+id},res);
 assert.equal(res.code,404);
});
