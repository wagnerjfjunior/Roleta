(function(global){
  'use strict';
  function normalizePeriod(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function parseDateBR(v){const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v||'');return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])):null}
  function dateKey(e){const d=parseDateBR(e.date);return d?d.getTime():-Infinity}
  function eventFromRow(r){
    return {source:r['Fonte'],id:r['Evento'],date:r['Data'],period:normalizePeriod(r['Período']),N:Number(r['N']),
      occupied:(r['Posições físicas ocupadas']||'').split(',').map(Number).filter(Number.isFinite),
      first:Number(r['Nº1 físico']),second:Number(r['Nº2 físico']),courtesy:Number(r['Cortesia físico']),last:Number(r['Último físico']),
      quality:r['Qualidade'],notes:r['Observação']||''};
  }
  function mergeEventRows(rowGroups){
    const byId=new Map();
    for(const rows of rowGroups||[])for(const row of rows||[]){const e=eventFromRow(row);if(e.id&&e.N>0)byId.set(e.id,e)}
    return [...byId.values()];
  }
  function chance(e){return Number.isFinite(e.N)&&e.N>0?Math.min(1,2/e.N):0}
  function rank(events,minExposure=3){
    if(!events?.length)return[];
    const maxPos=Math.max(...events.flatMap(e=>e.occupied||[]),0),chronological=[...events].sort((a,b)=>dateKey(a)-dateKey(b)),out=[];
    for(let pos=1;pos<=maxPos;pos++){
      const elig=chronological.filter(e=>(e.occupied||[]).includes(pos)); if(elig.length<minExposure)continue;
      const hits=elig.filter(e=>e.first===pos||e.last===pos).length;
      const expected=elig.reduce((s,e)=>s+chance(e),0),recent=elig.slice(-10);
      const recentHits=recent.filter(e=>e.first===pos||e.last===pos).length,recentExpected=recent.reduce((s,e)=>s+chance(e),0);
      out.push({pos,exposure:elig.length,hits,expected,oe:expected?hits/expected:0,excess:hits-expected,recentHits,recentExpected,recentExcess:recentHits-recentExpected});
    }
    return out.sort((a,b)=>b.excess-a.excess||b.hits-a.hits||b.oe-a.oe||b.exposure-a.exposure||a.pos-b.pos);
  }
  function bestFor(events,count=1){
    const minExp=Math.max(3,Math.min(6,Math.ceil((events?.length||0)*.18)));
    return rank(events||[],minExp).slice(0,count);
  }
  function build(events,exceptions={}){
    const period=k=>(events||[]).filter(e=>e.period===k),morning=bestFor(period('manha'),1)[0]||null,afternoon=bestFor(period('tarde'),2);
    const ranking=rank(events||[],5).slice(0,8);
    const momentum=rank(events||[],5).filter(r=>r.recentHits>0).sort((a,b)=>b.recentExcess-a.recentExcess||b.recentHits-a.recentHits||b.oe-a.oe).slice(0,6);
    const maxPos=Math.max(...(events||[]).flatMap(e=>e.occupied||[]),0),never=[];
    for(let pos=1;pos<=maxPos;pos++){const elig=(events||[]).filter(e=>(e.occupied||[]).includes(pos));if(elig.length<5)continue;const hits=elig.filter(e=>e.first===pos||e.last===pos).length;if(!hits)never.push({pos,exposure:elig.length,expected:elig.reduce((s,e)=>s+chance(e),0)})}
    never.sort((a,b)=>b.exposure-a.exposure||b.expected-a.expected||a.pos-b.pos);
    const dated=(events||[]).filter(e=>parseDateBR(e.date)),latestDate=[...new Set(dated.map(e=>e.date))].sort((a,b)=>parseDateBR(b)-parseDateBR(a))[0]||null;
    const latestEvents=latestDate?(events||[]).filter(e=>e.date===latestDate):[];
    const integral=latestEvents.find(e=>e.period==='integral');
    const previousDay={date:latestDate,mode:integral&&!exceptions[latestDate]?'integral':'dual',exception:Boolean(exceptions[latestDate]),events:latestEvents};
    const recent=[...dated].sort((a,b)=>dateKey(b)-dateKey(a)).slice(0,14);
    return {dataset:{count:(events||[]).length,qualityA:(events||[]).filter(e=>e.quality==='A').length,qualityB:(events||[]).filter(e=>e.quality==='B').length},
      hero:{morning,afternoon},ranking,momentum,never:never.slice(0,8),previousDay,recent,events:[...(events||[])]};
  }
  const api={normalizePeriod,parseDateBR,dateKey,eventFromRow,mergeEventRows,chance,rank,bestFor,build};
  global.RoletaEvents=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
