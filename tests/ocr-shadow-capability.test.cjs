'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/ocr-shadow-submit.js');
async function run(env,session={sub:'s',email:'x@example.com'}){
 const fn=createHandler({env,authenticate:{session:()=>session}});
 const res={code:0,header:{},setHeader(k,v){this.header[k]=v;return this;},status(n){this.code=n;return this;},json(x){this.body=x;return this;}};
 await fn({method:'GET'},res);return res;
}
const ready={ROLETA_OCR_SHADOW_ENABLED:'true',ROLETA_OCR_RETENTION_READY:'true',ROLETA_OCR_STORAGE_SERVICE_KEY:'fake-non-secret-placeholder',ROLETA_OCR_SUPABASE_URL:'https://uobxxgzshrmbtjfdolxd.supabase.co',ROLETA_FINAL_READS_ENABLED:'true',ROLETA_V2_DATABASE_URL:'configured'};
test('shadow is hidden without credentials or retention',async()=>{
 assert.equal((await run({})).body.enabled,false);
 assert.equal((await run({...ready,ROLETA_OCR_RETENTION_READY:'false'})).body.enabled,false);
 assert.equal((await run({...ready,ROLETA_OCR_STORAGE_SERVICE_KEY:''})).body.enabled,false);
});
test('shadow cannot be advertised to anonymous sessions',async()=>{
 assert.equal((await run(ready,null)).body.enabled,false);
});
test('shadow requires full config before opt-in visible',async()=>{
 assert.equal((await run(ready)).body.enabled,true);
});
