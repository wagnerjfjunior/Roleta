'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {expectFinal}=require('../server/ocr-shadow-link.cjs');
const jpeg=Buffer.from([255,216,255,217]);
const good={eventId:'2026-10-14-T',version:1,operatorSub:'google_subject',reviewed:{status:'VALIDADO',evento:{data:'14/10/2026',periodo:'TARDE'},salao:[{nome:'TESTE'}],pendencias:[]},image:jpeg,mime:'image/jpeg'};
test('vinculo sombra calcula hash e exige versao final',()=>{
 const x=expectFinal(good);
 assert.equal(x.event_id,'2026-10-14-T');
 assert.equal(x.final_version_id,'1');
 assert.match(x.image_sha256,/^[a-f0-9]{64}$/);
 assert.equal(x.image_bytes,4);
});
test('identificadores integrais sao permitidos',()=>{
 assert.equal(expectFinal({...good,eventId:'2026-10-14-I'}).event_id,'2026-10-14-I');
});
test('dados pendentes nao alimentam dicionario',()=>{
 for(const reviewed of [{...good.reviewed,status:'PENDENTE_REVISAO'},{...good.reviewed,pendencias:['numero']},null])
  assert.throws(()=>expectFinal({...good,reviewed}),/conferência humana/);
});
test('rejeita associacao entre foto e outro evento',()=>{
 assert.throws(()=>expectFinal({...good,eventId:'2026-10-13-T'}),/Evento divergente/);
 assert.throws(()=>expectFinal({...good,reviewed:{...good.reviewed,evento:{data:'14/10/2026',periodo:'MANHA'}}}),/Evento divergente/);
});
test('rejeita imagem, evento e versao inconsistentes',()=>{
 assert.throws(()=>expectFinal({...good,image:Buffer.from('falso')}),/Assinatura/);
 assert.throws(()=>expectFinal({...good,eventId:'outro'}),/evento/);
 assert.throws(()=>expectFinal({...good,version:0}),/Versão/);
 assert.throws(()=>expectFinal({...good,operatorSub:'usuario@dominio.com'}),/Operador/);
});
