'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createHandler}=require('../api/ocr-callback');
const {canonical}=require('../server/ocr-callback-hmac.cjs');
const secret='a-very-long-secret-key-with-at-least-32-bytes';
const jobId='550e8400-e29b-41d4-a716-446655440000';
function response(){return {code:0,status(n){this.code=n;return this;},setHeader(){},json(x){this.body=x;return this;}};}
function signed(body,{now=Date.now(),nonce='uniqueNonce1234567890'}={}){
 const a={method:'POST',path:'/api/ocr-callback',timestamp:String(now),nonce,jobId,body};
 const signature='v1='+crypto.createHmac('sha256',secret).update(canonical(a)).digest('hex');
 return {method:'POST',body,headers:{'content-type':'application/json','x-roleta-job-id':jobId,'x-roleta-nonce':nonce,'x-roleta-timestamp':a.timestamp,'x-roleta-signature':signature}};
}
test('signed callback persists and acknowledges only DB success',async()=>{
 const body=Buffer.from(JSON.stringify({model_id:'gemini-test',result:{linhas:[{nome_lido:'Paola'}]}}));
 let called=0;
 const handler=createHandler({env:{ROLETA_INTAKE_ENABLED:'true',ROLETA_INTAKE_HMAC_SECRET:secret},
  db:()=>({query:async()=>{called++;return {rows:[{outcome:'SAVED'}]};}})});
 const res=response();await handler(signed(body),res);
 assert.equal(res.code,200);assert.equal(called,1);
});
test('tampered callback never reaches database',async()=>{
 const body=Buffer.from('{"model_id":"x","result":{}}');
 let called=0;
 const handler=createHandler({env:{ROLETA_INTAKE_ENABLED:'true',ROLETA_INTAKE_HMAC_SECRET:secret},
  db:()=>({query:async()=>{called++;return {rows:[{outcome:'SAVED'}]};}})});
 const req=signed(body);req.body=Buffer.from('{"model_id":"x","result":{"changed":true}}');
 const res=response();await handler(req,res);
 assert.equal(res.code,401);assert.equal(called,0);
});
test('DB failure never acknowledges success',async()=>{
 const body=Buffer.from('{"model_id":"x","result":{}}');
 const handler=createHandler({env:{ROLETA_INTAKE_ENABLED:'true',ROLETA_INTAKE_HMAC_SECRET:secret},
  db:()=>({query:async()=>{throw Error('offline');}})});
 const res=response();await handler(signed(body),res);assert.equal(res.code,503);
});

test('accepts Make Gemini JSON string without losing payload',async()=>{
 const result='{"linhas":[{"nome_lido":"Paola"}]}';
 const body=Buffer.from(JSON.stringify({model_id:'gemini-3.8-flash',result}));
 let params;
 const handler=createHandler({env:{ROLETA_INTAKE_ENABLED:'true',ROLETA_INTAKE_HMAC_SECRET:secret},db:()=>({query:async(sql,p)=>{params=p;return {rows:[{outcome:'SAVED'}]};}})});
 const res=response();await handler(signed(body),res);
 assert.equal(res.code,200);
 assert.deepEqual(JSON.parse(params[3]),JSON.parse(result));
});
