'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {convertOcrSpace}=require('../server/ocr-space-draft.cjs');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup({directoryError=false,missingBridge=false}={}){
 const dom=new JSDOM(fs.readFileSync('simples/index.html','utf8'),{url:'https://roleta-tgv.vercel.app/simples/#digitalizar',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let releaseDirectory;
 const ready=new Promise(resolve=>{releaseDirectory=resolve;});
 w.fetch=async url=>{
  if(url==='/api/auth/session')return {ok:true,json:async()=>({authenticated:true,email:'test@example.test',csrfToken:'test-only'})};
  if(url==='/api/ocr-job-submit')return {ok:true,json:async()=>({enabled:false})};
  if(url==='/data/print-brokers.json')await ready;
  return {ok:!(directoryError&&url==='/data/print-brokers.json'),json:async()=>JSON.parse(fs.readFileSync('.'+url,'utf8'))};
 };
 const draft=convertOcrSpace(require('./fixtures/ocr-space-header-only-overlay.json'));
 w.XMLHttpRequest=class{
  constructor(){this.upload={};}
  open(){}setRequestHeader(){}
  send(){this.upload.onload?.();this.status=200;this.responseText=JSON.stringify({source:'make-ocr-space',result:draft});this.onload();}
 };
 w.URL.createObjectURL=()=> 'blob:test-photo';w.URL.revokeObjectURL=()=>{};
 for(const p of ['intake-normalization.js','gemini-intake-converter.js','gemini-review-bridge.js','photo-prepare.js','gemini-draft-ui.js','roulette-intake.js','simples/simple.js'])w.eval(fs.readFileSync(p,'utf8'));
 if(missingBridge)w.RoletaHumanBridge=undefined;
 // Only the isolated DOM test stubs photo preparation/session/upload. No request
 // leaves the process and no production cookie or authorization is manufactured.
 w.RoletaPhotoPrepare={prepare:async file=>({file,width:100,height:100})};
 await tick();
 const doc=w.document,file=new w.File(['test-only'],'test.jpg',{type:'image/jpeg'});
 const gallery=doc.querySelector('[data-photo-gallery-file]');
 Object.defineProperty(gallery,'files',{value:[file]});gallery.dispatchEvent(new w.Event('change'));
 await tick();
 const confirm=doc.querySelector('[data-photo-confirm]');confirm.checked=true;confirm.dispatchEvent(new w.Event('change'));
 assert.equal(doc.querySelector('[data-photo-send]').disabled,false);
 doc.querySelector('[data-photo-send]').click();
 return {dom,doc,releaseDirectory};
}
test('upload waits for the Simples table before reporting completion',async()=>{
 const {dom,doc,releaseDirectory}=await setup();
 try{
  await tick();assert.equal(doc.querySelectorAll('[data-correction-row]').length,0);
  assert.ok(!doc.querySelector('[data-upload-label]').textContent.includes('Leitura concluída'));
  releaseDirectory();await tick();await tick();
  assert.equal(doc.querySelectorAll('[data-correction-row]').length,31);
  assert.equal([...doc.querySelectorAll('[data-correct-name]')].filter(x=>x.value).length,28);
  assert.equal(doc.getElementById('simpleIntake').dataset.simplePhase,'2');
  assert.equal(doc.getElementById('simpleWorkflow').hidden,false);
  assert.ok(doc.querySelector('[data-upload-label]').textContent.includes('Leitura concluída'));
  assert.equal(doc.querySelector('[data-review-transfer]').disabled,true);
 }finally{dom.window.close();}
});
for(const [label,options,error] of [
 ['unavailable directory',{directoryError:true},'Cadastro oficial indisponível'],
 ['missing review module',{missingBridge:true},'O módulo de conferência não carregou']
])test('upload exposes '+label+' instead of claiming success',async()=>{
 const {dom,doc,releaseDirectory}=await setup(options);
 try{
  releaseDirectory();await tick();await tick();
  assert.ok(doc.querySelector('[data-photo-status]').textContent.includes('ENVIO NÃO CONCLUÍDO'));
  assert.ok(doc.querySelector('[data-photo-status]').textContent.includes(error));
  assert.equal(doc.querySelector('[data-upload-progress]').hidden,true);
  assert.ok(!doc.querySelector('[data-upload-label]').textContent.includes('Leitura concluída'));
  assert.equal(doc.querySelectorAll('[data-correction-row]').length,0);
  assert.equal(doc.querySelector('[data-photo-send]').disabled,false);
 }finally{dom.window.close();}
});
