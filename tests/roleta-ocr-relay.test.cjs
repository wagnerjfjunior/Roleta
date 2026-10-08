'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const auth=require('../auth/google');
const handler=require('../api/roleta-ocr.js');
process.env.ROLETA_SITE_ORIGIN='https://roleta-tgv.vercel.app';
process.env.ROLETA_SESSION_SECRET='test-only-signing-secret-that-is-long-enough-0123';
process.env.ROLETA_GOOGLE_ALLOWED_EMAILS='approved@example.test';
process.env.ROLETA_UPLOAD_ACCESS_TOKEN='legacy-token-must-never-authorize';
process.env.ROLETA_MAKE_WEBHOOK_URL='https://hook.us2.make.com/redacted-placeholder';
const cookie=auth.cookie(auth.COOKIE,auth.seal({typ:'session',email:'approved@example.test',sub:'user-1',exp:Date.now()+60000}),3600);
const csrf=auth.csrfForSub('user-1');
function req(body,headers={}){const r=Readable.from([body]);r.method='POST';r.headers={origin:'https://roleta-tgv.vercel.app',host:'roleta-tgv.vercel.app','content-type':'image/jpeg','content-length':String(body.length),cookie,'x-roleta-csrf':csrf,...headers};return r;}
function res(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};}
const img=Buffer.from([0xff,0xd8,0xff,0xe0,0,0]);
(async()=>{
 let r=res();await handler(req(img,{cookie:'','x-roleta-access-token':'legacy-token-must-never-authorize'}),r);assert.equal(r.statusCode,401);
 r=res();await handler(req(img,{'x-roleta-csrf':'wrong'}),r);assert.equal(r.statusCode,403);
 r=res();await handler(req(img,{origin:'https://attacker.invalid'}),r);assert.equal(r.statusCode,403);
 r=res();await handler(req(img,{'content-type':'text/plain'}),r);assert.equal(r.statusCode,415);
 r=res();await handler(req(Buffer.alloc(0)),r);assert.equal(r.statusCode,400);
 const originalFetch=global.fetch;
 global.fetch=async(_url,options)=>{assert.equal(options.method,'POST');return {ok:true,text:async()=>JSON.stringify({linhas:[{posicao_impressa:16,nome_lido:'Paola',numero_sorteado:'01'}]})};};
 try{r=res();await handler(req(img),r);assert.equal(r.statusCode,200);assert.equal(r.body.status,'PENDENTE_REVISAO');assert.equal(r.body.result.linhas.length,1);}
 finally{global.fetch=originalFetch;}
 console.log('PASS: Google-only relay auth, CSRF, origin, upload constraints and JSON response');
})().catch(e=>{console.error(e);process.exitCode=1;});
