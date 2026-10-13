'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const normalization=require('../intake-normalization.js');
const {convertGeminiDraft}=require('../gemini-intake-converter.js');
const context={window:{RoletaIntakeNormalization:normalization}};
vm.runInNewContext(fs.readFileSync('roulette-intake.js','utf8'),context);
const intake=context.window.RouletteIntake;
for(const date of ['12/10/26','12/10/2026','2026-10-12']){
 assert.equal(normalization.dateInfo(date).data,'12/10/2026');
 for(const p of [{schema:'rlt-print-v2',data:date,salao:[]},{evento:{data:date},salao:[]}]){
  const normalized=intake.normalizePayload(JSON.stringify(p));
  assert.equal(normalized.evento.data,'12/10/2026');
  assert.ok(!intake.validatePayload(normalized).some(e=>e.includes('data deve')));
 }
 const draft=convertGeminiDraft({data:date,linhas:[]},{brokers:[]});
 assert.equal(draft.payload.data,'2026-10-12');assert.ok(!draft.pendencias.some(x=>x.code==='DATA'));
}
for(const date of ['31/02/26','32/10/26','12/13/26','2026-02-29','12/10/2','12/10','2026-00-12'])assert.equal(normalization.dateInfo(date),null,date);
assert.equal(normalization.dateInfo('29/02/24').iso,'2024-02-29');
const broker=(nome,gerente='Wislane')=>({nome,gerente,creci:'1-F',diretor:'Renan',status_creci:'Definitivo'});
const sabrina=broker('Sabrina'),official=require('../data/print-brokers.json');
assert.equal(normalization.resolveDraftName('sobrina',official.brokers).broker.nome,'Sabrina');
assert.equal(normalization.resolveDraftName('sobrina',official.brokers).method,'GRAFIA_PROXIMA_UNICA');
for(const candidates of [[sabrina,broker('Sobrina')],[sabrina,broker('Sobrena')]]){
 const found=normalization.resolveDraftName('sobrina',candidates);
 if(candidates[1].nome==='Sobrina')assert.equal(found.broker.nome,'Sobrina','exact name wins');
 else assert.equal(found.broker,null,'close competitor prevents spelling repair');
}
assert.equal(normalization.resolveDraftName('sobrina',[sabrina,broker('Sabrina')]).broker,null);
assert.equal(normalization.resolveDraftName('sobrina',[sabrina],{manager:'Cazarim'}).broker,null);
assert.equal(normalization.resolveDraftName('Nena',[broker('Nina')]).broker,null,'short names never repaired by proximity');
assert.equal(normalization.resolveDraftName('sabrxxx',[sabrina]).broker,null);
assert.equal(normalization.resolveDraftName('sobrina!', [sabrina]).broker,null);
assert.equal(normalization.resolveDraftName('Sabr',[sabrina,broker('Sabrina Junior')]).broker,null);
assert.equal(normalization.resolveDraftName('Fuzmalina',[broker('Turmalina')],{aliases:require('../data/broker-name-aliases.json').aliases}).method,'ALIAS_CONFIRMADO');
const source={empreendimento:'CAMINHOS DA LAPA',data:'12/10/26',periodo:'TARDE',linhas:[{posicao_impressa:26,numero_sorteado:'01',nome_lido:'sobrina'}]};
const draft=convertGeminiDraft(source,official);
assert.equal(draft.sorteados[0].nome,'Sabrina');assert.equal(draft.sorteados[0].nome_lido,'sobrina');
assert.equal(draft.impressao_liberada,false);assert.equal(draft.salvamento_liberado,false);
const dup=convertGeminiDraft({...source,linhas:[...source.linhas,{posicao_impressa:3,numero_sorteado:'02',nome_lido:'Sabrina'}]},official);
assert.ok(dup.pendencias.some(x=>x.code==='NOME_DUPLICADO'));
// Browser scripts must work without Node require, in the same order as index.html.
const web={};web.window=web;vm.createContext(web);
for(const file of ['reconciliation/identity.js','intake-normalization.js','gemini-intake-converter.js','gemini-review-bridge.js','roulette-intake.js'])vm.runInContext(fs.readFileSync(file,'utf8'),web);
assert.equal(web.RoletaGeminiConverter.convertGeminiDraft(source,official).sorteados[0].nome,'Sabrina');
assert.equal(web.RouletteIntake.normalizePayload({schema:'rlt-print-v2',data:'12/10/26',salao:[]}).evento.data,'12/10/2026');
console.log('PASS: all intake date paths, impossible dates, exact/alias/prefix/spelling repair, ambiguous and short names, draft-only gate');
