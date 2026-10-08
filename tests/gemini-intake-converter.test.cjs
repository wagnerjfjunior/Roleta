const assert=require('node:assert/strict');
const {convertGeminiDraft}=require('../gemini-intake-converter.js');
const dto={brokers:[{nome:'Paola',creci:'123-F',gerente:'Wislane',diretor:'Renan',status_creci:'Definitivo'},{nome:'Nair',creci:'456-F',gerente:'Cazarim',diretor:'Renan',status_creci:'Definitivo'}]};
const src={empreendimento:'CAMINHOS DA LAPA',data:'08/10/2026',periodo:'TARDE',quantidade_corretores:17,linhas:[
 {posicao_impressa:1,nome_lido:'Nair',numero_sorteado:'02',gerente:'ERRADO'},
 {posicao_impressa:16,nome_lido:'Paola',numero_sorteado:'01'},
 {posicao_impressa:29,nome_lido:'Desconhecido',numero_sorteado:null}
]};
const result=convertGeminiDraft(src,dto);
assert.equal(result.payload.schema,'rlt-print-v2');
assert.equal(result.payload.data,'2026-10-08');
assert.equal(result.payload.tegra_qtd,2);
assert.equal(result.payload.salao.length,2);
assert.equal(result.payload.salao[0].ordem_final,1);
assert.equal(result.payload.salao[0].nome,'Paola');
assert.equal(result.payload.salao[1].gerente,'Cazarim');
assert.equal(result.sorteados[0].posicao_impressa,16);
assert.equal(result.sem_sorteio.length,1);
assert.equal(result.sem_sorteio[0].posicao_impressa,29);
assert.equal(result.payload.helbor_qtd,null);
assert.equal(result.payload.resultado.numero_exposto,false);
assert.equal(result.status,'PENDENTE_REVISAO');
assert.equal(result.impressao_liberada,false);
assert.ok(result.pendencias.some(p=>p.code==='NOME_NAO_RESOLVIDO'));
assert.ok(result.pendencias.some(p=>p.code==='QUANTIDADE_DECLARADA_DIVERGENTE'));
assert.ok(result.pendencias.some(p=>p.code==='LINHAS_SEM_SORTEIO'));
assert.ok(!result.pendencias.some(p=>p.code==='ORDEM_INCOMPLETA'));
const duplicate=convertGeminiDraft({...src,linhas:src.linhas.map((l,i)=>i===1?{...l,numero_sorteado:'02'}:l)},dto);
assert.ok(duplicate.pendencias.some(p=>p.code==='SORTEIO_DUPLICADO'));
assert.ok(duplicate.pendencias.some(p=>p.code==='ORDEM_INCOMPLETA'));
assert.equal(duplicate.payload.salao[0].ordem_final,null);
assert.throws(()=>convertGeminiDraft({},dto));
console.log('PASS: Gemini sorted SALÃO / undrawn participants / safe pending assertions');
require('./gemini-review-bridge.test.cjs');

// Cross-cutting print/PDF regression: the legacy GPT and Gemini paths share this layout.
require('./print-layout-blank-pages.test.cjs');

require('./gemini-row-checks.test.cjs');
