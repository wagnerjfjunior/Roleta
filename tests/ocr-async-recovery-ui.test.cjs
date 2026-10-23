'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const id='550e8400-e29b-41d4-a716-446655440000';
async function setup({email='a@example.test',offline=false,enabled=true}={}){
 const dom=new JSDOM('<div id="host"></div>',{url:'https://roleta.invalid',runScripts:'outside-only'}),w=dom.window;
 const key='roleta:ocr-pending:a@example.test';w.localStorage.setItem(key,id);
 const calls=[];
 w.RoletaGeminiConverter={};
 w.fetch=async url=>{calls.push(url);
  if(url==='/api/auth/session')return {ok:true,json:async()=>({authenticated:true,email,csrfToken:'fixture'})};
  if(url==='/api/ocr-job-submit')return {ok:true,json:async()=>({enabled})};
  if(url.startsWith('/api/ocr-job-status')){
   if(offline)throw Error('offline');
   return {ok:true,json:async()=>({state:'FAILED',error_code:'GEMINI_503_EXHAUSTED'})};
  }
  throw Error('unexpected call');
 };
 w.eval(fs.readFileSync('gemini-draft-ui.js','utf8'));await w.RoletaGeminiDraftUI.mount(w.document.getElementById('host'));
 await tick();await tick();return {dom,w,calls,key};
}
test('reload resumes only the current authenticated account job',async()=>{
 const {dom,w,calls}=await setup();try{
 assert.ok(calls.includes('/api/ocr-job-status?job_id='+id));
 assert.match(w.document.querySelector('[data-photo-status]').textContent,/processamento falhou/);
 assert.equal(w.document.querySelectorAll('[data-correction-row]').length,0);
 }finally{dom.window.close();}
});
test('another account does not poll the previous account job',async()=>{
 const {dom,calls}=await setup({email:'b@example.test'});try{
 assert.ok(!calls.some(x=>x.startsWith('/api/ocr-job-status')));
 }finally{dom.window.close();}
});
test('network interruption preserves job id for the next reload',async()=>{
 const {dom,w,key}=await setup({offline:true});try{
 assert.equal(w.localStorage.getItem(key),id);
 assert.equal(w.document.querySelectorAll('[data-correction-row]').length,0);
 }finally{dom.window.close();}
});
test('flag OFF does not poll an existing async job',async()=>{
 const {dom,calls}=await setup({enabled:false});try{
 assert.ok(!calls.some(x=>x.startsWith('/api/ocr-job-status')));
 }finally{dom.window.close();}
});
