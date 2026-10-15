'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
test('real review UI learns only on final confirmation and never from a moved physical row',async()=>{
 const dom=new JSDOM('<section id="host"><textarea id="rltv2Json"></textarea><button id="rltv2Validate"></button></section>',{url:'https://roleta-tgv.vercel.app/simples/',runScripts:'outside-only'});
 const w=dom.window,doc=w.document,host=doc.getElementById('host');
 const directory=JSON.parse(fs.readFileSync('data/print-brokers.json','utf8'));
 w.fetch=async url=>({ok:true,json:async()=>url==='/api/auth/session'?{authenticated:true,email:'test@example.test',csrfToken:'test'}:url==='/data/print-brokers.json'?directory:{aliases:{}}});
 for(const file of ['reconciliation/identity.js','intake-normalization.js','ocr-learning.js','gemini-intake-converter.js','gemini-review-bridge.js','gemini-draft-ui.js'])w.eval(fs.readFileSync(file,'utf8'));
 try{
  await w.RoletaGeminiDraftUI.mount(host);await tick();
  async function review(date,position='16'){
   doc.querySelector('[data-gemini-json]').value=JSON.stringify({source:'ocr-space',linhas:[{nome_lido:'PAQLA',posicao_impressa:16,numero_sorteado:'01'}]});
   doc.querySelector('[data-gemini-check]').click();await tick();await tick();
   assert.equal(doc.querySelector('[data-correct-confirm]').checked,false);
   doc.querySelector('[data-correct-position]').value=position;
   doc.querySelector('[data-correct-name]').value='Paola';
   // The native date picker accepts ISO; the UI converts back to BR for the canonical bridge.
   doc.querySelector('[data-review-date]').value=date.split('/').reverse().join('-');
   doc.querySelector('[data-review-period]').value='TARDE';
   doc.querySelector('[data-review-helbor]').value='17';
   const share=doc.querySelector('[data-review-share]');share.value='tegra_share';share.dispatchEvent(new w.Event('change'));
   doc.querySelector('[data-review-primary]').value='3';
   doc.querySelector('[data-review-enterprise]').checked=true;
   const check=doc.querySelector('[data-correct-confirm]');check.checked=true;check.dispatchEvent(new w.Event('change'));
   doc.querySelector('[data-review-transfer]').click();
   return JSON.parse(doc.getElementById('rltv2Json').value);
  }
  const first=await review('06/10/2026');
  assert.equal(w.RoletaOcrLearning.load(w.localStorage,'test@example.test').events.length,0);
  host.dispatchEvent(new w.CustomEvent('roleta-final-confirmed',{detail:first}));
  let state=w.RoletaOcrLearning.load(w.localStorage,'test@example.test');
  assert.equal(state.events.length,1);assert.equal(state.events[0].pairs[0].raw,'PAQLA');
  host.dispatchEvent(new w.CustomEvent('roleta-final-confirmed',{detail:first}));
  assert.equal(w.RoletaOcrLearning.load(w.localStorage,'test@example.test').events.length,1);
  const moved=await review('07/10/2026','17');
  host.dispatchEvent(new w.CustomEvent('roleta-final-confirmed',{detail:moved}));
  state=w.RoletaOcrLearning.load(w.localStorage,'test@example.test');
  assert.equal(state.events[1].pairs.length,0);assert.equal(w.RoletaOcrLearning.suggestions(state,directory).PAQLA,undefined);
  const corrected=await review('07/10/2026');
  host.dispatchEvent(new w.CustomEvent('roleta-final-confirmed',{detail:corrected}));
  await review('08/10/2026');
  assert.ok(doc.querySelector('[data-correct-name]').parentNode.textContent.includes('PAQLA → Paola'));
  assert.equal(doc.querySelector('[data-correct-confirm]').checked,true); // review() explicitly checked it
  const clear=[...doc.querySelectorAll('button')].find(b=>b.textContent==='Limpar aprendizado deste navegador');clear.click();
  assert.equal(w.RoletaOcrLearning.load(w.localStorage,'test@example.test').events.length,0);
 }finally{dom.window.close();}
});
