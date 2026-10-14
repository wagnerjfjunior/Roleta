'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler,SQL}=require('../api/ocr-shadow-submit.js');
const jpeg=Buffer.from([255,216,255,217]);
const digest='a'.repeat(64);
const base={event_id:'2026-10-14-T',version:2,digest,payload:{reviewed:{status:'VALIDADO',evento:{data:'14/10/2026',periodo:'TARDE'},salao:[{nome:'SAMPLE'}],pendencias:[]}}};
const auth={requireSameOrigin:()=>true,session:()=>({sub:'google123',email:'allowed@example.com'}),csrfForSub:()=> 'TOKEN'};
function context(overrides={}){
 const calls={read:0,db:0,upload:0};
 const env={ROLETA_OCR_SHADOW_ENABLED:'true',ROLETA_FINAL_OPERATOR_EMAILS:'allowed@example.com',ROLETA_V2_DATABASE_URL:'postgresql://roleta_v2_writer.uobxxgzshrmbtjfdolxd:synthetic@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full'};
 const handler=createHandler({
   env,...{
    authenticate:auth,
    authorize:async()=>{},
    read:async()=>{calls.read++;return [base]},
    storage:async()=>{calls.upload++;return {created:true}},
    poolFn:()=>({query:async(sql,params)=>{calls.db++;assert.equal(sql,SQL);assert.equal(params[0],base.event_id);return {rows:[{result:{status:'queued',job_id:'job-synthetic',event_id:base.event_id,final_version_id:'2'}}]}}})
   },...overrides
 });
 return {handler,calls};
}
async function run(handler,{headers={},body=jpeg,method='POST'}={}){
 const req={method,headers:{origin:'https://example.com','content-type':'image/jpeg','x-roleta-csrf':'TOKEN','x-roleta-event-id':base.event_id,'x-roleta-final-version':'2','x-roleta-final-digest':digest,...headers},body};
 const res={code:0,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.code=n;return this},json(v){this.payload=v;return this}};
 await handler(req,res);return res;
}
test('flag fechada nao toca base nem foto',async()=>{
 const c=context({env:{ROLETA_OCR_SHADOW_ENABLED:'false'}}),r=await run(c.handler);
 assert.equal(r.code,503);assert.equal(c.calls.upload,0);assert.equal(c.calls.db,0);
});
test('versao atual autentica e enfileira uma unica evidencia',async()=>{
 const c=context(),r=await run(c.handler);
 assert.equal(r.code,202);
 assert.equal(r.payload.status,'QUEUED');
 assert.equal(c.calls.upload,1);
 assert.equal(c.calls.db,1);
});
test('rejeita csrf e versao stale ANTES de upload',async()=>{
 const c=context();
 assert.equal((await run(c.handler,{headers:{'x-roleta-csrf':'wrong'}})).code,403);
 assert.equal((await run(c.handler,{headers:{'x-roleta-final-version':'1'}})).code,409);
 assert.equal(c.calls.upload,0);
});
test('rejeita assinatura falsa e formato antes de storage',async()=>{
 const c=context();
 assert.equal((await run(c.handler,{body:Buffer.from('fake')})).code,422);
 assert.equal((await run(c.handler,{headers:{'content-type':'application/pdf'}})).code,415);
 assert.equal(c.calls.upload,0);
});
test('rejeita sessoes anonimas',async()=>{
 const c=context({authenticate:{...auth,session:()=>null}});
 assert.equal((await run(c.handler)).code,401);
 assert.equal(c.calls.upload,0);
});
