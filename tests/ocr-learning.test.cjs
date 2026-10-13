'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const learning=require('../ocr-learning.js');
const {convertGeminiDraft}=require('../gemini-intake-converter.js');
const {convertOcrSpace}=require('../server/ocr-space-draft.cjs');
const directory={brokers:[{nome:'Paola'},{nome:'Arnon'},{nome:'Wagner'}]};
const raw={source:'ocr-space',linhas:[{posicao_impressa:16,nome_lido:'PAQLA',numero_sorteado:'01'}]};
const final=(date,name='Paola')=>({status:'VALIDADO',evento:{empreendimento:'CAMINHOS DA LAPA',data:date,periodo:'TARDE'},salao:[{nome:name,physical_position:16,ordem_final:1}]});
test('one reviewed sheet is evidence; two different sheets enable a pending suggestion',()=>{
 let s=learning.record(learning.empty(),raw,final('06/10/2026'),directory);
 assert.deepEqual(Object.keys(learning.suggestions(s,directory)),[]);
 s=learning.record(s,raw,final('07/10/2026'),directory);
 assert.equal(learning.suggestions(s,directory).PAQLA,'Paola');
 const d=convertGeminiDraft(raw,directory,{learnedAliases:learning.suggestions(s,directory)});
 assert.equal(d.leitura_original.linhas[0].nome_lido,'PAQLA');
 assert.equal(d.leitura_original.linhas[0].nome,'Paola');
 assert.equal(d.leitura_original.linhas[0].cadastro_resolucao,'SUGESTAO_APRENDIDA');
 assert.equal(d.status,'PENDENTE_REVISAO');assert.equal(d.aprovado,false);assert.equal(d.impressao_liberada,false);
});
test('replays never increase support; correction replaces the previous observation and conflicts disable the rule',()=>{
 let s=learning.record(learning.empty(),raw,final('06/10/2026'),directory);
 s=learning.record(s,raw,final('06/10/2026'),directory);
 assert.equal(s.events.length,1);assert.equal(learning.suggestions(s,directory).PAQLA,undefined);
 s=learning.record(s,raw,final('07/10/2026'),directory);
 s=learning.record(s,raw,final('07/10/2026','Arnon'),directory);
 assert.equal(s.events.length,2);assert.equal(learning.suggestions(s,directory).PAQLA,undefined);
 s=learning.record(s,{...raw,linhas:[]},final('07/10/2026'),directory);
 assert.equal(s.events[1].pairs.length,0);assert.equal(learning.suggestions(s,directory).PAQLA,undefined);
});
test('unknown, repeated or changed physical mappings and exact directory names cannot train an alias',()=>{
 for(const lines of [[{...raw.linhas[0],posicao_impressa:null}],[raw.linhas[0],raw.linhas[0]],[{...raw.linhas[0],posicao_impressa:1}],[{...raw.linhas[0],nome_lido:'Arnon'}]]){
  const s=learning.record(learning.empty(),{...raw,linhas:lines},final('06/10/2026'),directory);
  assert.equal(s.events[0].pairs.length,0);
 }
 assert.equal(learning.record(learning.empty(),{...raw,source:'gemini'},final('06/10/2026'),directory).events.length,0);
 assert.equal(learning.record(learning.empty(),raw,{...final('06/10/2026'),status:'PENDENTE'},directory).events.length,0);
});
test('exact names take precedence and a learned target must still be unique in the current directory',()=>{
 const s={version:1,events:['a','b'].map(id=>({id,pairs:[{raw:'Arnon',name:'Paola'},{raw:'PAQLA',name:'Paola'}]}))};
 assert.equal(learning.suggestions(s,directory).ARNON,undefined);
 assert.equal(learning.suggestions(s,{brokers:[...directory.brokers,{nome:'Paola'}]}).PAQLA,undefined);
 const d=convertGeminiDraft({linhas:[{nome_lido:'Arnon',posicao_impressa:1,numero_sorteado:1}]},directory,{learnedAliases:{ARNON:'Paola'}});
 assert.equal(d.leitura_original.linhas[0].nome,'Arnon');
});
test('local accounts are isolated; malformed or unavailable storage does not grant authority',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const s=learning.record(learning.empty(),raw,final('06/10/2026'),directory);
 assert.equal(learning.save(storage,'a@example.test',s),true);
 assert.equal(learning.load(storage,'a@example.test').events.length,1);
 assert.equal(learning.load(storage,'b@example.test').events.length,0);
 storage.getItem=()=>'{broken';assert.equal(learning.load(storage,'a').events.length,0);
 storage.setItem=()=>{throw Error('quota')};assert.equal(learning.save(storage,'a',s),false);
});
test('the real Paola OCR token 010 remains literal and requires manual ball entry',()=>{
 const d=convertOcrSpace({ParsedResults:[{FileParseExitCode:1,ParsedText:'16 | PAQLA | 010'}]});
 assert.equal(d.linhas[0].numero_lido_original,'010');
 const converted=convertGeminiDraft(d,directory);
 const row=converted.leitura_original.linhas[0];
 assert.equal(row.numero_sorteado,null);assert.equal(row.numero_lido_original,'010');assert.equal(row.bolinha_ambigua,true);
 assert.ok(converted.pendencias.some(p=>p.code==='BOLINHA_AMBIGUA'));
 for(const n of ['01','10','100'])assert.equal(convertGeminiDraft({...raw,linhas:[{...raw.linhas[0],numero_sorteado:n}]},directory).leitura_original.linhas[0].numero_sorteado,Number(n));
});
