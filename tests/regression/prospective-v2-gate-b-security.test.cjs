'use strict';
// Gate B negative-only regression, no production SQL writes.
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../../api/prospective-v2-append.js');
const {loadAuthorizedPersonIdsFromEnv}=require('../../server/prospective-v2-person-acl-env.cjs');
const {prepareV2FromHttp}=require('../../server/prospective-v2-google-http.cjs');
const {assertPreDraw}=require('../../server/prospective-v2-event-gate.cjs');
const {buildPersonAppendCommand}=require('../../server/prospective-person-db-command-v2.cjs');
const {appendV2}=require('../../server/prospective-v2-db-transport.cjs');
const {canonical}=require('../../simulation/prospective-intent.cjs');
const session={sub:'operator_001',email:'operator@example.test'};
const payload={recommendation_id:'rec_001',person_id:'broker_001',revision_number:1,
 supersedes_recommendation_id:null,physical_position:3,
 generated_at:'2026-10-12T11:42:00Z',data_cutoff:'2026-10-11T20:00:00Z',
 frozen_at:'2026-10-12T11:42:00Z'};
const body={event_id:'2026-10-12-manha',kind:'prediction',policy:'WEEKLY_FROZEN',
 idempotency_key:'gate-b-idempotency-0000001',payload};
const auth={requireSameOrigin:()=>true,session:()=>session,csrfForSub:()=> 'secret-csrf'};
const req={method:'POST',headers:{'content-type':'application/json','x-roleta-csrf':'secret-csrf'},body};
const env={ROLETA_V2_DATABASE_URL:'postgresql://roleta_v2_writer.uobxxgzshrmbtjfdolxd:placeholder@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full',ROLETA_V2_WRITES_ENABLED:'true'};
function response(){const state={status:0,body:null};return {state,setHeader(){},status(n){state.status=n;return this;},json(b){state.body=b;return this;}};}
test('feature gate refuses invalid flags without touching auth or SQL',async()=>{
 let calls=0;
 for(const flag of [undefined,'false','TRUE','1','true ']){
  const res=response();
  await createHandler({env:{ROLETA_V2_WRITES_ENABLED:flag},
    prepare:async()=>{calls++;throw Error('unexpected');},
    append:async()=>{calls++;throw Error('unexpected');}})({method:'POST'},res);
  assert.equal(res.state.status,503);
 }
 assert.equal(calls,0);
});
test('private ACL fails closed for malformed configuration and unauthorized Google sub',()=>{
 const before=process.env.ROLETA_V2_PERSON_ACL_JSON;
 try {
  for(const bad of [undefined,'','{','[]','{"operator_999":["broker_001"]}',
   '{"operator_001":[]}','{"operator_001":["../other"]}',
   '{"__proto__":["broker_001"],"operator_001":["broker_001"]}']){
   if(bad===undefined)delete process.env.ROLETA_V2_PERSON_ACL_JSON;
   else process.env.ROLETA_V2_PERSON_ACL_JSON=bad;
   assert.throws(()=>loadAuthorizedPersonIdsFromEnv({googleSub:'operator_001'}));
  }
  process.env.ROLETA_V2_PERSON_ACL_JSON='{"operator_001":["broker_001"]}';
  assert.deepEqual([...loadAuthorizedPersonIdsFromEnv({googleSub:'operator_001'})],['broker_001']);
  assert.throws(()=>loadAuthorizedPersonIdsFromEnv({googleSub:'operator_999'}));
 }finally{
  if(before===undefined)delete process.env.ROLETA_V2_PERSON_ACL_JSON;
  else process.env.ROLETA_V2_PERSON_ACL_JSON=before;
 }
});
test('HTTP denies spoofed actor, forged CSRF, bad origin and other-person prediction',async()=>{
 const loadAuthorizedPersonIds=async()=>new Set(['broker_001']);
 const run=(r,a=auth)=>prepareV2FromHttp(r,{auth:a,loadAuthorizedPersonIds});
 const valid=await run(req);
 assert.equal(valid.params[2],'google:operator_001');
 await assert.rejects(run({...req,headers:{...req.headers,'x-roleta-csrf':'bad'}}),/CSRF/);
 await assert.rejects(run(req,{...auth,requireSameOrigin:()=>false}),/origin/);
 await assert.rejects(run(req,{...auth,session:()=>null}),/authentication/);
 await assert.rejects(run({...req,body:{...body,actor_subject:'google:other'}}),/unexpected request fields/);
 await assert.rejects(run({...req,body:{...body,payload:{...payload,person_id:'broker_999'}}}),/not authorized/);
});
test('draw gate refuses weekend, integral, expired draw and stale generation',()=>{
 const cmd=buildPersonAppendCommand({session,authorizedPersonIds:new Set(['broker_001']),body});
 assert.equal(assertPreDraw(cmd,{now:()=>Date.parse('2026-10-12T11:43:00Z')}).event_id,'2026-10-12-manha');
 const change=(id)=>({...cmd,params:cmd.params.map((v,i)=>i===3?id:v)});
 assert.throws(()=>assertPreDraw(change('2026-10-11-manha'),{now:()=>Date.parse('2026-10-11T11:43:00Z')}),/weekend/);
 assert.throws(()=>assertPreDraw(change('2026-10-10-tarde'),{now:()=>Date.parse('2026-10-10T11:43:00Z')}),/weekend/);
 assert.throws(()=>assertPreDraw(change('2026-10-12-integral'),{now:()=>Date.parse('2026-10-12T11:43:00Z')}),/unsupported/);
 assert.throws(()=>assertPreDraw(cmd,{now:()=>Date.parse('2026-10-12T11:46:00Z')}),/closed/);
 assert.throws(()=>assertPreDraw(cmd,{now:()=>Date.parse('2026-10-12T11:35:00Z')}),/server-current/);
});
test('DB transport accepts only canonical function call with nine bound parameters',async()=>{
 let calls=0;const pool={query:async()=>{calls++;return {rows:[{evidence_id:'31'}]};}};
 const cmd=buildPersonAppendCommand({session,authorizedPersonIds:new Set(['broker_001']),body});
 assert.equal(await appendV2(cmd,{env,getPoolFn:()=>pool}),'31');
 await assert.rejects(appendV2({...cmd,sql:'DELETE FROM roleta_audit.prospective_evidence'},{env,getPoolFn:()=>pool}),/unsupported/);
 await assert.rejects(appendV2({...cmd,params:[...cmd.params,'extra']},{env,getPoolFn:()=>pool}),/unsupported/);
 await assert.rejects(appendV2(cmd,{env:{...env,ROLETA_V2_WRITES_ENABLED:'false'},getPoolFn:()=>pool}),/disabled/);
 assert.equal(calls,1);
 assert.equal(cmd.params[1].length,64);
 assert.equal(JSON.parse(cmd.params[0]).actor_subject,'google:operator_001');
 assert.equal(canonical(body.payload),cmd.params[8]);
});
test('rejected draw cannot reach append or disclose private identifiers',async()=>{
 let calls=0;
 const h=createHandler({env,prepare:async()=>buildPersonAppendCommand({session,authorizedPersonIds:new Set(['broker_001']),body}),
  assertEvent:()=>{throw Error('target roulette already closed');},
  append:async()=>{calls++;return '99';}});
 const res=response();await h(req,res);
 assert.equal(res.state.status,422);assert.equal(calls,0);
 assert.doesNotMatch(JSON.stringify(res.state.body),/operator_001|secret-csrf|broker_001/);
});
