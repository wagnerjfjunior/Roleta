(function(root,factory){
'use strict';
const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RoletaStatisticalSubmission=api;
})(typeof globalThis==='object'?globalThis:null,function(){
'use strict';
// PRINT data is not a source of physical lines; supply those independently.
const PAD=['M','T','I'],SUFFIX={MANHA:'M',TARDE:'T',INTEGRAL:'I'};
const isoDate=(v)=>{
 const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v||''));
 if(!m)return null;
 const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
 if(d.getUTCFullYear()!==+m[3]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[1])return null;
 return m[3]+'-'+m[2]+'-'+m[1];
};
const periodOf=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
function prepare(reviewed,physicalByDraw,{source,acknowledged}={}){
 const event=reviewed?.evento,rows=reviewed?.salao;
 if(!event||!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('SALÃO validado obrigatório.');
 const date=isoDate(event.data),period=periodOf(event.periodo),suffix=SUFFIX[period];
 if(!date||!suffix)throw Error('Data ou período do sorteio inválido.');
 if(String(event.empreendimento||'').trim().toUpperCase()!=='CAMINHOS DA LAPA')throw Error('Empreendimento inválido.');
 if(!acknowledged)throw Error('Confirmação humana específica da estatística obrigatória.');
 if(typeof source!=='string'||!source.trim()||source.length>180)throw Error('Informe a origem da folha oficial.');
 if(!Array.isArray(physicalByDraw)||physicalByDraw.length!==rows.length)throw Error('Informe a posição física original de cada corretor.');
 const usedDraw=new Set(),usedPhysical=new Set(),mapping=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i],draw=Number(row?.ordem_final),physical=Number(physicalByDraw[i]);
  if(!Number.isSafeInteger(draw)||draw<1||draw>rows.length||usedDraw.has(draw))
   throw Error('Bolinha/ordem final inválida ou repetida.');
  if(!Number.isSafeInteger(physical)||physical<1||physical>999||usedPhysical.has(physical))
   throw Error('Posição física ausente, inválida ou repetida.');
  if(!String(row?.nome||'').trim())throw Error('Corretor não identificado.');
  usedDraw.add(draw);usedPhysical.add(physical);
  mapping.push({drawn_number:draw,physical_position:physical,broker_name:String(row.nome).trim()});
 }
 if(usedDraw.size!==rows.length)throw Error('Sorteio incompleto.');
 mapping.sort((a,b)=>a.drawn_number-b.drawn_number);
 const byDraw=new Map(mapping.map(x=>[x.drawn_number,x.physical_position]));
 const n=rows.length;
 return Object.freeze({
  schema:'rlt-statistical-submission-v1',
  event_id:date+'-'+suffix,
  event_date:date,
  period:period.toLowerCase(),
  N:n,
  occupied:[...usedPhysical].sort((a,b)=>a-b),
  first:byDraw.get(1),second:byDraw.get(2),
  courtesy:byDraw.get(n-1),last:byDraw.get(n),
  drawn_mapping:mapping,
  source:source.trim(),quality:'A',
  human_review_confirmed:true
 });
}
return {prepare,isoDate,periodOf};
});
