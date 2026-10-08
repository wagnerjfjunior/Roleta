'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const handler=require('../api/roleta-ocr.js');
function req(body,headers={}){const r=Readable.from([body]);r.method='POST';r.headers={origin:'https://roleta.vercel.app',host:'roleta.vercel.app','content-type':'image/jpeg','content-length':String(body.length),'x-roleta-access-token':'some-auth-token-of-at-least-24-chars',...headers};return r;}
function res(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};}
const img=Buffer.from([0xff,0xd8,0xff,0xe0,0,0]);
process.env.ROLETA_UPLOAD_ACCESS_TOKEN='some-auth-token-of-at-least-24-chars';
process.env.ROLETA_MAKE_WEBHOOK_URL='https://hook.us2.make.com/redacted-placeholder';
(async()=>{
 let r=res();await handler(req(img,{'x-roleta-access-token':'wrong'}),r);assert.equal(r.statusCode,401);
 r=res();await handler(req(img,{'origin':'https://attacker.invalid'}),r);assert.equal(r.statusCode,403);
 r=res();await handler(req(img,{'content-type':'text/plain'}),r);assert.equal(r.statusCode,415);
 r=res();await handler(req(Buffer.alloc(0)),r);assert.equal(r.statusCode,400);
 const originalFetch=global.fetch;
 global.fetch=async(_url,options)=>{assert.equal(options.method,'POST');return {ok:true,text:async()=>JSON.stringify({linhas:[{nome_lido:'Paola'}]})};};
 try{
 r=res();await handler(req(img),r);
 assert.equal(r.statusCode,200);
 assert.equal(r.body.status,'PENDENTE_REVISAO');
 assert.equal(r.body.result.linhas.length,1);
 }finally{global.fetch=originalFetch;}
 console.log('PASS: relay auth/origin/type/empty body/valid response');
})().catch(e=>{console.error(e);process.exitCode=1;});