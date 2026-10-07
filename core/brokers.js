(function(global){
  'use strict';
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
  function canonicalName(name,aliases){return (aliases&&aliases[name])||name}
  function buildRows(nominalRows,transcriptionRows,aliases,options={}){
    const out=[],seen=new Set(),blocked=new Set(options.blockedEvents||[]);
    for(const r of nominalRows||[]){
      if(blocked.has(r.event_id))continue;
      if(r.row_status!=='VERIFIED_NUMBER'||r.event_status!=='VERIFIED_FULL')continue;
      const name=canonicalName(r.broker_name_normalized||r.broker_name_raw||'',aliases); if(!name)continue;
      const key=r.event_id+'|'+r.physical_position;if(seen.has(key))continue;seen.add(key);
      out.push({event_id:r.event_id,name,position:Number(r.physical_position),drawn:Number(r.drawn_number),N:Number(r.N),source:r.source});
    }
    for(const r of transcriptionRows||[]){
      if(blocked.has(r['Evento']))continue;
      if(r['Status da linha']!=='PARTICIPANTE')continue;
      const name=canonicalName(r['Corretor']||'',aliases);if(!name)continue;
      const key=r['Evento']+'|'+r['Posição física'];if(seen.has(key))continue;seen.add(key);
      const eventRows=(transcriptionRows||[]).filter(x=>x['Evento']===r['Evento']&&x['Status da linha']==='PARTICIPANTE');
      out.push({event_id:r['Evento'],name,position:Number(r['Posição física']),drawn:Number(r['Número sorteado']),N:eventRows.length,source:r['Fonte']});
    }
    return out;
  }
  function derive(nominalRows,transcriptionRows,officialRows,aliases,events,familyMap,options={}){
    const rows=buildRows(nominalRows,transcriptionRows,aliases,options),official=new Map((officialRows||[]).map(r=>[norm(r['Nome Comercial']),r]));
    const names=new Map();
    for(const r of rows){
      const off=official.get(norm(r.name));const canonical=off?.['Nome Comercial']||r.name;
      if(!names.has(canonical))names.set(canonical,{broker:canonical,participations:0,number1:0,number2:0,courtesy:0,last:0});
      const s=names.get(canonical);s.participations++;
      if(r.drawn===1)s.number1++;if(r.drawn===2)s.number2++;if(r.drawn===r.N-1)s.courtesy++;if(r.drawn===r.N)s.last++;
    }
    for(const s of names.values())s.total_special=s.number1+s.number2+s.courtesy+s.last;
    const family=(familyMap||[]).map(x=>{const s=names.get(x.ledger_name)||{participations:0,number1:0,number2:0,courtesy:0,last:0,total_special:0};return {...x,...s,display_name:x.display_name,ledger_name:x.ledger_name}});
    const topFor=key=>[...names.values()].filter(x=>x[key]>0).sort((a,b)=>b[key]-a[key]||b.participations-a.participations||a.broker.localeCompare(b.broker)).slice(0,5).map(x=>({broker:x.broker,hits:x[key],participations:x.participations}));
    const top5={number1:topFor('number1'),number2:topFor('number2'),courtesy:topFor('courtesy'),last:topFor('last')};
    const eventMap=new Map((events||[]).map(e=>[e.id,e])),periodOrder={desconhecido:0,manha:1,tarde:2,integral:3};
    const nominalIds=[...new Set(rows.map(r=>r.event_id))].filter(id=>eventMap.has(id)).sort((a,b)=>{
      const ea=eventMap.get(a),eb=eventMap.get(b),da=global.RoletaEvents?.dateKey(ea)??0,db=global.RoletaEvents?.dateKey(eb)??0;
      return db-da||(periodOrder[eb.period]??0)-(periodOrder[ea.period]??0);
    }).slice(0,2);
    const recentSpecials=nominalIds.map(id=>{const e=eventMap.get(id);const pick=d=>{const r=rows.find(x=>x.event_id===id&&x.drawn===d);if(!r)return null;const off=official.get(norm(r.name));return {name:off?.['Nome Comercial']||r.name,manager:off?.['Equipe']||null,director:off?.['Diretor']||null,position:r.position}};
      return {id,date:e.date,period:e.period,N:e.N,specials:{number1:pick(1),number2:pick(2),courtesy:pick(Math.max(1,e.N-1)),last:pick(e.N)}}});
    return {validated_events:new Set(rows.map(r=>r.event_id)).size,validated_rows:rows.length,family,top5,recentSpecials,rows};
  }
  const api={norm,buildRows,derive};global.RoletaBrokers=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
