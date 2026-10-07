const assert=require('assert');
const r=require('../roulette-intake.js');

const brokers=[
  {nome:'Globz',gerente:'Cazarim',diretor:'Renan',creci:'217.171-F',status_creci:'Definitivo'},
  {nome:'Gelasio',gerente:'Gabriel',diretor:'Renan',creci:'232.492-F',status_creci:'Definitivo'},
  {nome:'Sabrina',gerente:'Wislane',diretor:'Renan',creci:'209.905-F',status_creci:'Definitivo'}
];

const payload={
  status:'VALIDADO',pendencias:[],
  evento:{empreendimento:'CAMINHOS DA LAPA',data:'06/10/2026',dia_semana:'TERÇA-FEIRA',periodo:'MANHÃ',tegra_qtd:2,helbor_qtd:0,sorteio_empresa:{tg:'1-2',hb:'0'}},
  salao:[
    {physical_position:1,nome:'Gloz',manager_raw:'Cazarim',drawn_number:2,ordem_final:2},
    {physical_position:2,nome:'Sabrina',manager_raw:'Wislane',drawn_number:1,ordem_final:1}
  ],
  standby:[],online:[]
};

r.reconcilePayload(payload,brokers);
assert.strictEqual(payload.salao[0].match_status,'PROBABLE_MATCH');
assert.strictEqual(payload.salao[0].nome,'Gloz');
assert.strictEqual(payload.salao[1].match_status,'EXACT_MATCH');
assert.throws(()=>r.finalizeStatisticalConfirmation(payload,'2026-10-07T12:00:00Z'),/VALIDADO PARA IMPRESSÃO/);
assert.strictEqual(payload.canonical_confirmation,undefined);

r.confirmCandidate(payload,'salao',0,'Globz',brokers,'2026-10-07T12:01:00Z');
assert.strictEqual(payload.salao[0].match_status,'USER_CONFIRMED');
assert.strictEqual(payload.salao[0].nome,'Globz');
assert.strictEqual(payload.salao[0].gerente,'Cazarim');
assert.strictEqual(payload.salao[0].physical_position,1);
assert.strictEqual(payload.salao[0].drawn_number,2);

r.markPrintValidated(payload,'2026-10-07T12:02:00Z');
assert.strictEqual(payload.print_validation.status,'VALIDADO_PARA_IMPRESSAO');
assert.throws(()=>r.canonicalStatisticalPayload(payload),/confirmação humana final/);

r.finalizeStatisticalConfirmation(payload,'2026-10-07T12:03:00Z');
assert.strictEqual(payload.canonical_confirmation.status,'CANONICO_PARA_ESTATISTICA');
assert.doesNotThrow(()=>r.canonicalStatisticalPayload(payload));

console.log('PASS reconciliation-v2 regression: no bulk promotion, position/name/draw mapping preserved.');
