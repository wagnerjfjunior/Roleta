'use strict';
const assert=require('node:assert/strict'),{Readable}=require('node:stream');
const auth=require('../auth/google'),handler=require('../api/roleta-ocr');
process.env.ROLETA_SITE_ORIGIN='https://roleta-tgv.vercel.app';
process.env.ROLETA_SESSION_SECRET='test-only-signing-secret-that-is-long-enough-0123';
process.env.ROLETA_GOOGLE_ALLOWED_EMAILS='approved@example.test';
process.env.ROLETA_MAKE_WEBHOOK_URL='https://hook.us2.make.com/redacted-placeholder';
const cookie=auth.cookie(auth.COOKIE,auth.seal({typ:'session',email:'approved@example.test',sub:'user-1',exp:Date.now()+60000}),3600);
function request(){const r=Readable.from([Buffer.from([255,216,255,224])]);r.method='POST';r.headers={origin:process.env.ROLETA_SITE_ORIGIN,host:'roleta-tgv.vercel.app','content-type':'image/jpeg',cookie,'x-roleta-csrf':auth.csrfForSub('user-1')};return r;}
function response(){return {code:0,setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;}};}
const json=JSON.stringify({linhas:[{posicao_impressa:1,nome_lido:'Paola',numero_sorteado:'01'}]});
async function run(delay,slowBody=false){
 const original={fetch:global.fetch,setTimeout:global.setTimeout,clearTimeout:global.clearTimeout};
 let now=0,id=0,start;const timers=new Map(),started=new Promise(resolve=>start=resolve);
 global.setTimeout=(fn,ms)=>{const key=++id;timers.set(key,{fn,at:now+ms});return key;};
 global.clearTimeout=key=>timers.delete(key);
 function tick(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;}
 function delayed(signal,value){return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true});setTimeout(()=>resolve(value),delay);start();});}
 global.fetch=async(_url,{signal})=>slowBody?{ok:true,text:()=>delayed(signal,json)}:await delayed(signal,{ok:true,text:async()=>json});
 try{
  const res=response(),pending=handler(request(),res);await started;tick(delay<=175000?delay:175000);await pending;
  assert.equal(res.code,delay<=175000?200:504);
  assert.equal(timers.size,delay<=175000?0:1,'the relay deadline is always cleared');
  return res;
 }finally{Object.assign(global,original);}
}
(async()=>{
 const late=await run(143000);assert.equal(late.body.result.linhas.length,1);
 const over=await run(190000);assert.match(over.body.error,/excedeu/);
 const body=await run(190000,true);assert.match(body.body.error,/prazo/);
 const config=require('../vercel.json');assert.ok(config.functions['api/roleta-ocr.js'].maxDuration*1000>175000);
 console.log('PASS: Gemini response after 143 seconds returns; deadline bounds both headers and body; Vercel duration covers deadline');
})().catch(e=>{console.error(e);process.exitCode=1;});
