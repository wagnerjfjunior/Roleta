const state={events:[],objective:'n1last',period:'manha',n:18};

const objectiveMap={
  n1:{label:'Nº 1',keys:['first'],chance:n=>1/n},
  n1last:{label:'Nº 1 ou Último',keys:['first','last'],chance:n=>Math.min(1,2/n)},
  premium:{label:'Premium',keys:['first','courtesy','last'],chance:n=>Math.min(1,3/n)},
  n2:{label:'Nº 2',keys:['second'],chance:n=>1/n},
  courtesy:{label:'Cortesia',keys:['courtesy'],chance:n=>1/n},
  last:{label:'Último de vez',keys:['last'],chance:n=>1/n}
};

function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
    if(c==='"'){quoted=!quoted;continue}
    if(c===','&&!quoted){row.push(field);field='';continue}
    if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&n==='\n')i++;
      row.push(field);field='';
      if(row.some(v=>v!==''))rows.push(row);
      row=[];continue
    }
    field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row)}
  const headers=rows.shift();
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}

function parseDateBR(v){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v||'');
  if(!m)return null;
  return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
}
function dateKey(e){const d=parseDateBR(e.date);return d?d.getTime():-Infinity}
function weekday(e){const d=parseDateBR(e.date);return d?d.getDay():null}
function normalizePeriod(v){return (v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function eventFromRow(r){
  const occupied=(r['Posições físicas ocupadas']||'').split(',').map(Number).filter(Number.isFinite);
  return{
    source:r['Fonte'],id:r['Evento'],date:r['Data'],period:normalizePeriod(r['Período']),
    N:Number(r['N']),occupied,
    first:Number(r['Nº1 físico']),second:Number(r['Nº2 físico']),
    courtesy:Number(r['Cortesia físico']),last:Number(r['Último físico']),
    quality:r['Qualidade'],notes:r['Observação']||''
  };
}
function isWeekendEvent(e){
  const wd=weekday(e);
  return e.period==='integral'||wd===0||wd===6;
}
function hitsObjective(e,pos,objKey){
  const obj=objectiveMap[objKey];
  return obj.keys.some(k=>e[k]===pos);
}
function eligible(e,pos){return e.occupied.includes(pos)}
function format(x,d=2){return Number.isFinite(x)?x.toFixed(d).replace('.',','):'—'}

function rank(events,objKey,opt){
  opt=opt||{};
  const minExposure=opt.minExposure||3;
  const recentSize=opt.recentSize||10;
  if(!events.length)return[];
  const maxPos=Math.max.apply(null,events.flatMap(e=>e.occupied));
  const chronological=[...events].sort((a,b)=>dateKey(a)-dateKey(b));
  const out=[];
  for(let pos=1;pos<=maxPos;pos++){
    const elig=chronological.filter(e=>eligible(e,pos));
    if(elig.length<minExposure)continue;
    const hits=elig.filter(e=>hitsObjective(e,pos,objKey)).length;
    const expected=elig.reduce((s,e)=>s+objectiveMap[objKey].chance(e.N),0);
    const recent=elig.slice(-recentSize);
    const recentHits=recent.filter(e=>hitsObjective(e,pos,objKey)).length;
    const recentExpected=recent.reduce((s,e)=>s+objectiveMap[objKey].chance(e.N),0);
    const oe=expected?hits/expected:0;
    const recentOE=recentExpected?recentHits/recentExpected:0;
    out.push({
      pos:pos,exposure:elig.length,hits:hits,expected:expected,oe:oe,
      excess:hits-expected,recentHits:recentHits,recentExpected:recentExpected,
      recentOE:recentOE,recentExcess:recentHits-recentExpected
    });
  }
  return out.sort((a,b)=>b.hits-a.hits||b.oe-a.oe||b.exposure-a.exposure||a.pos-b.pos);
}

function recommendation(events,objKey){
  const minExp=Math.max(3,Math.min(6,Math.ceil(events.length*.18)));
  return rank(events,objKey,{minExposure:minExp}).sort((a,b)=>
    b.excess-a.excess||b.recentExcess-a.recentExcess||b.hits-a.hits||b.exposure-a.exposure
  );
}

function periodFilter(events,key){
  if(key==='all')return events;
  if(key==='weekend')return events.filter(isWeekendEvent);
  return events.filter(e=>e.period===key);
}

function contextWindow(events,period,n){
  const base=periodFilter(events,period);
  const candidates=[
    {label:'N exato ('+n+')',data:base.filter(e=>e.N===n)},
    {label:'N '+Math.max(2,n-2)+'–'+(n+2),data:base.filter(e=>Math.abs(e.N-n)<=2)},
    {label:'N '+Math.max(2,n-5)+'–'+(n+5),data:base.filter(e=>Math.abs(e.N-n)<=5)},
    {label:'todos os tamanhos do período',data:base}
  ];
  return candidates.find(x=>x.data.length>=5)||candidates[candidates.length-1];
}

function wildcard(events,objKey){
  const bins=[
    {name:'Manhã',data:periodFilter(events,'manha')},
    {name:'Tarde',data:periodFilter(events,'tarde')},
    {name:'Fim de semana',data:periodFilter(events,'weekend')},
    {name:'1–10',data:events.filter(e=>e.N<=10)},
    {name:'11–15',data:events.filter(e=>e.N>=11&&e.N<=15)},
    {name:'16–20',data:events.filter(e=>e.N>=16&&e.N<=20)},
    {name:'21–25',data:events.filter(e=>e.N>=21&&e.N<=25)},
    {name:'26+',data:events.filter(e=>e.N>=26)}
  ].filter(s=>s.data.length>=4);

  const maxPos=Math.max.apply(null,events.flatMap(e=>e.occupied));
  const scores=[];
  for(let pos=1;pos<=maxPos;pos++){
    let total=0,coverage=0,positive=0;
    for(const seg of bins){
      const elig=seg.data.filter(e=>eligible(e,pos));
      if(elig.length<3)continue;
      const hits=elig.filter(e=>hitsObjective(e,pos,objKey)).length;
      const exp=elig.reduce((s,e)=>s+objectiveMap[objKey].chance(e.N),0);
      const z=(hits-exp)/Math.sqrt(exp+.5);
      total+=Math.max(-2,Math.min(3,z));
      coverage++;
      if(z>0)positive++;
    }
    if(coverage>=3){
      const score=(total/coverage)*(0.6+0.4*coverage/bins.length)+positive*.08;
      scores.push({pos:pos,score:score,coverage:coverage,positive:positive});
    }
  }
  return scores.sort((a,b)=>b.score-a.score||b.coverage-a.coverage)[0]||null;
}

function latest(events){
  const weight={tarde:2,integral:1,manha:0};
  return [...events].filter(e=>parseDateBR(e.date)).sort((a,b)=>{
    const d=dateKey(b)-dateKey(a);
    if(d!==0)return d;
    return (weight[b.period]||0)-(weight[a.period]||0);
  })[0];
}

function setHero(id,value,meta){
  document.querySelector('#'+id).textContent=value??'—';
  document.querySelector('#'+id+'Meta').textContent=meta;
}

function renderRanking(rows,obj){
  document.querySelector('#rankingSubtitle').textContent=objectiveMap[obj].label+' · ranking físico geral';
  const max=Math.max(1,...rows.map(r=>r.hits));
  document.querySelector('#rankingBars').innerHTML=rows.map((r,i)=>
    '<div class="rank-row">'+
      '<div class="rank-pos">'+r.pos+'</div>'+
      '<div class="track"><div class="fill" style="width:'+Math.max(4,r.hits/max*100)+'%"></div></div>'+
      '<div class="rank-meta">'+(i===0?'campeão · ':'')+r.hits+' acertos · '+r.exposure+' exp. · O/E '+format(r.oe)+'</div>'+
    '</div>'
  ).join('');
}

function renderMomentum(rows){
  const moving=[...rows].filter(r=>r.recentHits>0)
    .sort((a,b)=>b.recentExcess-a.recentExcess||b.recentHits-a.recentHits||b.oe-a.oe)
    .slice(0,6);
  document.querySelector('#momentumList').innerHTML=moving.map(r=>
    '<div class="list-item"><strong>Posição '+r.pos+'</strong><span class="pill-up">'+
    r.recentHits+' nas últimas '+Math.min(10,r.exposure)+' exp. · excesso '+format(r.recentExcess,1)+'</span></div>'
  ).join('')||'<div class="muted small">Sem sinal recente suficiente.</div>';
}

function renderNever(events,obj){
  const maxPos=Math.max.apply(null,events.flatMap(e=>e.occupied));
  const arr=[];
  for(let pos=1;pos<=maxPos;pos++){
    const elig=events.filter(e=>eligible(e,pos));
    const h=elig.filter(e=>hitsObjective(e,pos,obj)).length;
    if(h===0&&elig.length>=5){
      const exp=elig.reduce((s,e)=>s+objectiveMap[obj].chance(e.N),0);
      arr.push({pos:pos,exp:elig.length,expected:exp});
    }
  }
  arr.sort((a,b)=>b.exp-a.exp||b.expected-a.expected);
  document.querySelector('#neverList').innerHTML=arr.slice(0,8).map(r=>
    '<div class="list-item"><strong>Posição '+r.pos+'</strong><span class="pill-cold">0 em '+
    r.exp+' oportunidades · esperado '+format(r.expected)+'</span></div>'
  ).join('')||'<div class="muted small">Nenhuma posição com exposição suficiente permanece zerada.</div>';
}

function renderLatest(events){
  const e=latest(events);
  if(!e)return;
  document.querySelector('#latestEventTitle').textContent=e.date+' · '+e.period+' · N='+e.N;
  const items=[['Nº 1',e.first],['Nº 2',e.second],['Cortesia',e.courtesy],['Último',e.last]];
  document.querySelector('#latestEvent').innerHTML=items.map(x=>
    '<div class="last-item"><div class="label">'+x[0]+'</div><div class="value">'+x[1]+
    '</div><div class="small muted">posição física</div></div>'
  ).join('');
}

function bestForSegment(events,obj){
  if(events.length<3)return null;
  return recommendation(events,obj)[0]||null;
}

function renderPeriods(events,obj){
  const segs=[
    ['Manhã',periodFilter(events,'manha')],
    ['Tarde',periodFilter(events,'tarde')],
    ['Fim de semana / integral',periodFilter(events,'weekend')]
  ];
  document.querySelector('#periodCards').innerHTML=segs.map(x=>{
    const name=x[0],data=x[1],b=bestForSegment(data,obj);
    return '<div class="mini-card"><h3>'+name+'</h3><div class="choice">'+(b?.pos??'—')+
      '</div><div class="sub">'+data.length+' roletas · '+(b?(b.hits+'/'+b.exposure+' · O/E '+format(b.oe)):'amostra insuficiente')+'</div></div>';
  }).join('');
}

function renderRanges(events,obj){
  const segs=[
    ['1–10',e=>e.N<=10],
    ['11–15',e=>e.N>=11&&e.N<=15],
    ['16–20',e=>e.N>=16&&e.N<=20],
    ['21–25',e=>e.N>=21&&e.N<=25],
    ['26+',e=>e.N>=26]
  ];
  document.querySelector('#rangeCards').innerHTML=segs.map(x=>{
    const name=x[0],data=events.filter(x[1]),b=bestForSegment(data,obj);
    return '<div class="mini-card"><h3>'+name+' participantes</h3><div class="choice">'+(b?.pos??'—')+
      '</div><div class="sub">'+data.length+' roletas · '+(b?(b.hits+'/'+b.exposure+' · O/E '+format(b.oe)):'amostra baixa')+'</div></div>';
  }).join('');
}

function renderRecent(events,obj){
  const es=[...events].filter(e=>parseDateBR(e.date)).sort((a,b)=>dateKey(b)-dateKey(a)).slice(0,14);
  document.querySelector('#recentTimeline').innerHTML=es.map(e=>{
    const positions=objectiveMap[obj].keys.map(k=>e[k]).join(' / ');
    return '<div class="tick"><div class="date">'+e.date+'</div><div class="hit">'+positions+
      '</div><div class="period">'+e.period+' · N='+e.N+'</div></div>';
  }).join('');
}

function render(){
  const events=state.events,obj=state.objective;
  const overall=rank(events,obj,{minExposure:5});
  const champ=overall[0],wild=wildcard(events,obj);
  const ctx=contextWindow(events,state.period,state.n);
  const ctxRank=recommendation(ctx.data,obj);
  const pick=ctxRank[0],alt=ctxRank[1];

  document.querySelector('#datasetStamp').textContent=events.length+' roletas · '+
    events.filter(e=>e.quality==='A').length+' A / '+events.filter(e=>e.quality==='B').length+' B';
  document.querySelector('#scenarioBasis').textContent=ctx.label+' · '+ctx.data.length+' eventos usados';

  setHero('scenarioPick',pick?.pos,pick?(pick.hits+' acertos / '+pick.exposure+' oportunidades · O/E '+format(pick.oe)):'amostra insuficiente');
  setHero('scenarioAlt',alt?.pos,alt?(alt.hits+' acertos / '+alt.exposure+' oportunidades · O/E '+format(alt.oe)):'—');
  setHero('absoluteChampion',champ?.pos,champ?(champ.hits+' acertos / '+champ.exposure+' oportunidades · O/E '+format(champ.oe)):'—');
  setHero('wildcard',wild?.pos,wild?('positivo em '+wild.positive+'/'+wild.coverage+' contextos avaliados'):'—');

  renderRanking(overall.slice(0,8),obj);
  renderMomentum(overall);
  renderNever(events,obj);
  renderLatest(events);
  renderPeriods(events,obj);
  renderRanges(events,obj);
  renderRecent(events,obj);
}

function bind(){
  const objective=document.querySelector('#objective');
  const period=document.querySelector('#scenarioPeriod');
  const n=document.querySelector('#participantCount');
  objective.addEventListener('change',()=>{state.objective=objective.value;render()});
  period.addEventListener('change',()=>{state.period=period.value;render()});
  n.addEventListener('input',()=>{state.n=Math.max(2,Math.min(40,Number(n.value)||18));render()});
}

async function init(){
  try{
    const mr=await fetch('/data/manifest.json',{cache:'no-store'});
    if(!mr.ok)throw new Error('Falha ao carregar data/manifest.json');
    const manifest=await mr.json();
    const chunks=await Promise.all(manifest.sources.map(async s=>{
      const r=await fetch(s.path,{cache:'no-store'});
      if(!r.ok)throw new Error('Falha ao carregar '+s.path);
      return parseCSV(await r.text()).map(eventFromRow).filter(e=>e.N>0);
    }));
    const byId=new Map();
    chunks.flat().forEach(e=>byId.set(e.id,e));
    state.events=[...byId.values()];
    bind();render();
  }catch(err){
    document.querySelector('#datasetStamp').textContent='erro de dados';
    document.querySelector('#rankingBars').innerHTML='<div class="error">'+err.message+'</div>';
  }
}
init();
