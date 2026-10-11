'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {databaseUrl,verifiedTlsConfig,getPool,appendV2}=require('../../server/prospective-v2-db-transport.cjs');
const {assertPreDraw}=require('../../server/prospective-v2-event-gate.cjs');
const {createHandler}=require('../../api/prospective-v2-append.js');
const body={generated_at:'2026-10-12T11:40:00Z',data_cutoff:'2026-10-11T20:00:00Z',frozen_at:'2026-10-12T11:42:00Z'};
const cmd={sql:'SELECT roleta_audit.append_authenticated_person_evidence_v2($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) AS evidence_id',params:[
 'canonical','a'.repeat(64),'google:abc','2026-10-12-manha','brenda','rec123','WEEKLY_FROZEN','idempotency_key_123',JSON.stringify(body)
]};
const env={ROLETA_V2_DATABASE_URL:'postgresql://roleta_v2_writer.uobxxgzshrmbtjfdolxd:test@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full',ROLETA_V2_WRITES_ENABLED:'true'};
function result(){const state={status:null,body:null,headers:{}};return {
 state,setHeader(k,v){state.headers[k]=v;return this;},
 status(code){state.status=code;return this;},
 json(data){state.body=data;return this;}
};}
test('default feature gate refuses without invoking auth or SQL',async()=>{
 let invoked=false;const h=createHandler({env:{},prepare:async()=>{invoked=true;throw Error('unexpected');}});
 const res=result();await h({method:'POST'},res);
 assert.equal(res.state.status,503);assert.equal(invoked,false);
});
test('V2 SQL URL rejects privileged account and non-verified transport',()=>{
 for(const user of ['postgres','service_role','anon','authenticated','roleta_append_owner','roleta_runtime']){
  assert.throws(()=>databaseUrl({ROLETA_V2_DATABASE_URL:'postgresql://'+user+':test@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full'}));
 }
 assert.throws(()=>databaseUrl({ROLETA_V2_DATABASE_URL:'postgresql://roleta_v2_writer.uobxxgzshrmbtjfdolxd:test@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require'}));
 assert.equal(databaseUrl(env),env.ROLETA_V2_DATABASE_URL);
 assert.throws(()=>databaseUrl({ROLETA_V2_DATABASE_URL:env.ROLETA_V2_DATABASE_URL.replace('aws-1-sa-east-1.pooler.supabase.com','db.example.com')}),/session pooler/);
 assert.throws(()=>databaseUrl({ROLETA_V2_DATABASE_URL:env.ROLETA_V2_DATABASE_URL.replace('roleta_v2_writer.uobxxgzshrmbtjfdolxd','postgres.uobxxgzshrmbtjfdolxd')}),/dedicated/);
});
test('append validates private DB config and forwards only bound parameters',async()=>{
 let calls=0;const pool={query:async(sql,params)=>{calls++;assert.equal(sql,cmd.sql);assert.deepEqual(params,cmd.params);return {rows:[{evidence_id:'42'}]};}};
 const id=await appendV2(cmd,{env,getPoolFn:()=>pool});
 assert.equal(id,'42');assert.equal(calls,1);
 await assert.rejects(()=>appendV2(cmd,{env:{...env,ROLETA_V2_WRITES_ENABLED:'false'},getPoolFn:()=>pool}));
 assert.equal(calls,1);
});
test('server cutoff keeps date-bound morning window and rejects late predictions',()=>{
 assert.deepEqual(assertPreDraw(cmd,{now:()=>Date.parse('2026-10-12T11:43:00Z')}),{event_id:'2026-10-12-manha',cutoff:Date.parse('2026-10-12T08:46:00-03:00')});
 assert.throws(()=>assertPreDraw(cmd,{now:()=>Date.parse('2026-10-12T11:46:00Z')}),/already closed/);
 assert.throws(()=>assertPreDraw({...cmd,params:cmd.params.map((v,i)=>i===3?'2026-10-12-integral':v)},{now:()=>Date.parse('2026-10-12T11:43:00Z')}),/unsupported/);
 assert.throws(()=>assertPreDraw({...cmd,params:cmd.params.map((v,i)=>i===3?'2026-10-12-tarde':v)},{now:()=>Date.parse('2026-10-12T12:00:00Z')}),/server-current/);
});
test('HTTP path records a verified append and preserves idempotent SQL evidence ID',async()=>{
 let writes=0;const h=createHandler({env,loadAcl:()=>new Set(['brenda']),prepare:async(req,{loadAuthorizedPersonIds})=>{
  assert.equal(loadAuthorizedPersonIds().has('brenda'),true);return cmd;
 },assertEvent:()=>true,authorizeRoster:async()=>true,append:async()=>{writes++;return '42';}});
 const res=result();await h({method:'POST'},res);
 assert.equal(res.state.status,201);assert.equal(res.state.body.evidence_id,'42');assert.equal(writes,1);
});
test('HTTP unauthorized and stale-event requests never reach DB',async()=>{
 let writes=0;
 const h=createHandler({env,prepare:async()=>cmd,assertEvent:()=>{throw Error('target roulette already closed');},append:async()=>{writes++;return '1';}});
 const res=result();await h({method:'POST'},res);
 assert.equal(res.state.status,422);assert.equal(writes,0);
});

test('Supabase trusted root CA is required and provided to pg without URL sslmode override',()=>{
 const pem='-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
 assert.throws(()=>verifiedTlsConfig({}),/trusted pooler CA/);
 assert.throws(()=>verifiedTlsConfig({ROLETA_V2_TLS_CA_PEM:'not-a-cert'}),/trusted pooler CA/);
 const tls=verifiedTlsConfig({ROLETA_V2_TLS_CA_PEM:pem});
 assert.equal(tls.rejectUnauthorized,true);
 assert.equal(tls.servername,'aws-1-sa-east-1.pooler.supabase.com');
 assert.equal(tls.ca,pem);
 let config;
 class Pool {constructor(c){config=c;}}
 getPool({env:{...env,ROLETA_V2_TLS_CA_PEM:pem},loadPg:()=>({Pool})});
 assert.ok(config);
 assert.equal(new URL(config.connectionString).searchParams.has('sslmode'),false);
 assert.equal(new URL(config.connectionString).hostname,'aws-1-sa-east-1.pooler.supabase.com');
 assert.deepEqual(config.ssl,tls);
});
