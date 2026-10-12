(function(root){
 'use strict';
 function mergeFinal(baseline,records){
  if(!Array.isArray(records))throw Error('Ledger final inválido.');
  const events=[...baseline],ids=new Set(events.map(e=>e.id)),keys=new Set(events.map(e=>e.date+'|'+e.period)),nominal=[];
  for(const r of records){
   const e=r?.payload?.event,review=r?.payload?.reviewed;
   if(!e||r.event_id!==e.event_id||!Number.isSafeInteger(r.version)||r.version<1||!Number.isSafeInteger(e.N)||e.N<4||e.N>200||!/^\d{4}-\d{2}-\d{2}$/.test(e.event_date)||!['manha','tarde','integral'].includes(e.period)||!Array.isArray(e.drawn_mapping)||e.drawn_mapping.length!==e.N||!Array.isArray(e.occupied)||e.occupied.length!==e.N||!Array.isArray(review?.salao)||review.salao.length!==e.N)throw Error('Registro final inválido.');
   const draws=new Set(),physical=new Set();
   for(const m of e.drawn_mapping){
    if(!Number.isSafeInteger(m.drawn_number)||m.drawn_number<1||m.drawn_number>e.N||!Number.isSafeInteger(m.physical_position)||m.physical_position<1||m.physical_position>999||draws.has(m.drawn_number)||physical.has(m.physical_position))throw Error('Permutação final inválida.');
    draws.add(m.drawn_number);physical.add(m.physical_position);
   }
   const mapping=new Map(e.drawn_mapping.map(m=>[m.drawn_number,m.physical_position]));
   if(e.first!==mapping.get(1)||e.second!==mapping.get(2)||e.courtesy!==mapping.get(e.N-1)||e.last!==mapping.get(e.N)||JSON.stringify([...physical].sort((a,b)=>a-b))!==JSON.stringify(e.occupied))throw Error('Índice final divergente.');
   const date=e.event_date.slice(8)+'/'+e.event_date.slice(5,7)+'/'+e.event_date.slice(0,4),key=date+'|'+e.period;
   if(ids.has(e.event_id)||keys.has(key)||baseline.some(b=>b.date===date&&b.period==='desconhecido'))throw Error('Conflito entre ledger final e histórico.');
   ids.add(e.event_id);keys.add(key);
   events.push({id:e.event_id,date,period:e.period,N:e.N,occupied:e.occupied,first:e.first,second:e.second,courtesy:e.courtesy,last:e.last,quality:'A',source:e.source,notes:'Supabase · versão '+r.version,storage_origin:'supabase',version:r.version});
   for(const m of e.drawn_mapping)nominal.push({event_id:e.event_id,date,period:e.period,N:e.N,physical_position:m.physical_position,drawn_number:m.drawn_number,broker_name_normalized:m.broker_name,broker_name_raw:m.broker_name,row_status:'VERIFIED_NUMBER',event_status:'VERIFIED_FULL'});
  }
  return {events,nominal};
 }
 function updateBrokerStats(stats,baselineNominal,added){
  if(!stats||!added.length)return stats;
  const out=JSON.parse(JSON.stringify(stats)),addedIds=new Set(added.map(x=>x.event_id));
  out.validated_events+=addedIds.size;
  for(const family of out.family){
   for(const r of added.filter(r=>r.broker_name_normalized===family.ledger_name)){
    family.participations++;
    for(const [key,ball] of [['number1',1],['number2',2],['courtesy',Number(r.N)-1],['last',Number(r.N)]])if(Number(r.drawn_number)===ball){family[key]++;family.total_special++;}
   }
  }
  // Full candidate pool is required: a prior top-five subset cannot rank a
  // newly successful broker. Count only complete verified nominal events.
  const groups=new Map();
  for(const r of [...baselineNominal,...added]){if(r.event_status!=='VERIFIED_FULL')continue;const rows=groups.get(r.event_id)||[];rows.push(r);groups.set(r.event_id,rows);}
  const people=new Map();
  for(const rows of groups.values()){
   const n=Number(rows[0].N);
   if(rows.length!==n||new Set(rows.map(r=>Number(r.drawn_number))).size!==n||rows.some(r=>Number(r.drawn_number)<1||Number(r.drawn_number)>n))continue;
   for(const r of rows){const name=r.broker_name_normalized;if(!name)continue;const p=people.get(name)||{broker:name,participations:0,number1:0,number2:0,courtesy:0,last:0};p.participations++;for(const [key,ball] of [['number1',1],['number2',2],['courtesy',n-1],['last',n]])if(Number(r.drawn_number)===ball)p[key]++;people.set(name,p);}
  }
  for(const key of Object.keys(out.top5))out.top5[key]=[...people.values()].filter(p=>p[key]>0).sort((a,b)=>b[key]-a[key]||a.broker.localeCompare(b.broker)).slice(0,5).map(p=>({broker:p.broker,hits:p[key],participations:p.participations}));
  out.note+=' Inclui '+addedIds.size+' eventos Supabase nas versões vigentes. TOP 5 recalculado a partir das transcrições nominais completas verificadas.';
  return out;
 }
 const api={mergeFinal,updateBrokerStats};root.RoletaFinalLedger=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
