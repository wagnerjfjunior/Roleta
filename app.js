const state={events:[],weekendPolicy:null,presence:null,modelLab:null};
const OBJ='n1last';

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

function normalizePeriod(v){return (v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function parseDateBR(v){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v||'');
  return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])):null;
}
function dateKey(e){const d=parseDateBR(e.date);return d?d.getTime():-Infinity}
function eventFromRow(r){
  return {
    source:r['Fonte'],id:r['Evento'],date:r['Data'],period:normalizePeriod(r['Período']),
    N:Number(r['N']),
    occupied:(r['Posições físicas ocupadas']||'').split(',').map(Number).filter(Number.isFinite),
    first:Number(r['Nº1 físico']),second:Number(r['Nº2 físico']),
    courtesy:Number(r['Cortesia físico']),last:Number(r['Último físico']),
    quality:r['Qualidade'],notes:r['Observação']||''
  };
}
function eligible(e,pos){return e.occupied.includes(pos)}
function hit(e,pos){return e.first===pos||e.last===pos}
function chance(e){return Math.min(1,2/e.N)}
function format(x,d=2){return Number.isFinite(x)?x.toFixed(d).replace('.',','):'—'}

function rank(events,minExposure=3){
  if(!events.length)return[];
  const maxPos=Math.max(...events.flatMap(e=>e.occupied));
  const chronological=[...events].sort((a,b)=>dateKey(a)-dateKey(b));
  const out=[];
  for(let pos=1;pos<=maxPos;pos++){
    const elig=chronological.filter(e=>eligible(e,pos));
    if(elig.length<minExposure)continue;
    const hits=elig.filter(e=>hit(e,pos)).length;
    const expected=elig.reduce((s,e)=>s+chance(e),0);
    const recent=elig.slice(-10);
    const recentHits=recent.filter(e=>hit(e,pos)).length;
    const recentExpected=recent.reduce((s,e)=>s+chance(e),0);
    out.push({
      pos,exposure:elig.length,hits,expected,
      oe:expected?hits/expected:0,
      excess:hits-expected,
      recentHits,recentExpected,
      recentExcess:recentHits-recentExpected
    });
  }
  return out.sort((a,b)=>b.excess-a.excess||b.hits-a.hits||b.oe-a.oe||b.exposure-a.exposure||a.pos-b.pos);
}
function periodEvents(key){return state.events.filter(e=>e.period===key)}
function bestFor(events,count=1){
  const minExp=Math.max(3,Math.min(6,Math.ceil(events.length*.18)));
  return rank(events,minExp).slice(0,count);
}
function renderHero(){
  const morning=bestFor(periodEvents('manha'),1)[0];
  const afternoon=bestFor(periodEvents('tarde'),2);
  document.querySelector('#morningPick').textContent=morning?.pos??'—';
  document.querySelector('#morningPickMeta').textContent=morning
    ? morning.hits+' acertos / '+morning.exposure+' exp. · O/E '+format(morning.oe)
    : 'amostra insuficiente';
  document.querySelector('#afternoonPick1').textContent=afternoon[0]?.pos??'—';
  document.querySelector('#afternoonPick2').textContent=afternoon[1]?.pos??'—';
  document.querySelector('#afternoonPickMeta').textContent=afternoon.length
    ? 'principal #'+afternoon[0].pos+(afternoon[1]?' · reserva #'+afternoon[1].pos:'')
    : 'amostra insuficiente';
  const p=state.weekendPolicy?.saturday?.assignments||state.weekendPolicy?.family_assignments||[];
  document.querySelector('#weekendSummary').innerHTML=p.map(x=>'<span><b>'+x.broker.split(' ')[0]+'</b> '+x.physical_position+'</span>').join('');
}
function renderRanking(){
  const rows=rank(state.events,5).slice(0,8),max=Math.max(1,...rows.map(r=>r.hits));
  document.querySelector('#rankingBars').innerHTML=rows.map((r,i)=>
    '<div class="rank-row">'+
      '<div class="rank-pos">'+r.pos+'</div>'+
      '<div class="track"><div class="fill" style="width:'+Math.max(4,r.hits/max*100)+'%"></div></div>'+
      '<div class="rank-meta">'+(i===0?'campeão · ':'')+r.hits+' acertos · '+r.exposure+' exp. · O/E '+format(r.oe)+'</div>'+
    '</div>'
  ).join('');
}
function renderMomentum(){
  const moving=rank(state.events,5).filter(r=>r.recentHits>0)
    .sort((a,b)=>b.recentExcess-a.recentExcess||b.recentHits-a.recentHits||b.oe-a.oe)
    .slice(0,6);
  document.querySelector('#momentumList').innerHTML=moving.map(r=>
    '<div class="list-item"><strong>Posição '+r.pos+'</strong><span class="pill-up">'+
    r.recentHits+' acertos nas últimas '+Math.min(10,r.exposure)+' exposições · excesso '+format(r.recentExcess,1)+'</span></div>'
  ).join('')||'<div class="muted small">Sem sinal recente suficiente.</div>';
}
function renderNever(){
  const maxPos=Math.max(...state.events.flatMap(e=>e.occupied)),arr=[];
  for(let pos=1;pos<=maxPos;pos++){
    const elig=state.events.filter(e=>eligible(e,pos));
    if(elig.length<5)continue;
    const hits=elig.filter(e=>hit(e,pos)).length;
    if(hits===0)arr.push({pos,exposure:elig.length,expected:elig.reduce((s,e)=>s+chance(e),0)});
  }
  arr.sort((a,b)=>b.exposure-a.exposure||b.expected-a.expected||a.pos-b.pos);
  document.querySelector('#neverList').innerHTML=arr.slice(0,8).map(r=>
    '<div class="list-item"><strong>Posição '+r.pos+'</strong><span class="pill-cold">0 em '+r.exposure+
    ' oportunidades · esperado '+format(r.expected)+'</span></div>'
  ).join('')||'<div class="muted small">Nenhuma posição com exposição suficiente permanece zerada no alvo Nº1 ou Último.</div>';
}
function latestCompletedDate(){
  const dates=[...new Set(state.events.filter(e=>parseDateBR(e.date)).map(e=>e.date))]
    .sort((a,b)=>{
      const da=parseDateBR(a),db=parseDateBR(b);return db-da;
    });
  return dates[0]||null;
}
function renderPreviousDay(){
  const date=latestCompletedDate();
  if(!date)return;
  const es=state.events.filter(e=>e.date===date);
  document.querySelector('#previousDayTitle').textContent=date;
  const by={manha:es.find(e=>e.period==='manha'),tarde:es.find(e=>e.period==='tarde')};
  document.querySelector('#previousDayEvents').innerHTML=['manha','tarde'].map(period=>{
    const e=by[period];
    if(!e)return '<div class="day-card"><h3>'+period+'</h3><div class="muted small">sem folha canônica</div></div>';
    return '<div class="day-card"><div class="day-title">'+period+' · N='+e.N+'</div>'+
      '<div class="day-stats">'+
      '<span><b>Nº1</b>'+e.first+'</span><span><b>Nº2</b>'+e.second+'</span>'+
      '<span><b>Cortesia</b>'+e.courtesy+'</span><span><b>Último</b>'+e.last+'</span>'+
      '</div></div>';
  }).join('');
}
function renderRecent(){
  const es=[...state.events].filter(e=>parseDateBR(e.date)).sort((a,b)=>dateKey(b)-dateKey(a)).slice(0,14);
  document.querySelector('#recentTimeline').innerHTML=es.map(e=>
    '<div class="tick"><div class="date">'+e.date+'</div><div class="hit">'+e.first+' / '+e.last+
    '</div><div class="period">'+e.period+' · N='+e.N+'</div></div>'
  ).join('');
}
function renderWeekendFamily(){
  const host=document.querySelector('#weekendFamily');
  const policy=state.weekendPolicy,pres=state.presence;
  if(!host||!policy||!pres)return;
  const counts={};
  for(const broker of pres.brokers)counts[broker]=0;
  for(const r of pres.records||[])if(r.present&&counts[r.broker]!==undefined)counts[r.broker]++;
  host.innerHTML=policy.family_assignments.map(a=>{
    const canonical=a.broker.startsWith('Helena')?'Helena':a.broker;
    const override=pres.count_overrides?.[canonical];
    const exact=override&&Number.isFinite(override.count)?override.count:null;
    const count=exact!==null?exact:(counts[canonical]||0);
    const unresolved=override&&override.status==='needs_exact_count';
    const ok=!unresolved&&count>=policy.qualification.required_weekday_periods;
    const numberText=unresolved?'—':String(count);
    const flagText=unresolved?'CONTAGEM A RECONCILIAR':(ok?'APTO':'AINDA NÃO APTO');
    return '<div class="family-card '+(a.role==='principal'?'primary':'secondary')+'">'+
      '<div class="family-head"><div><div class="family-name">'+a.broker+'</div><div class="family-role">'+a.role+'</div></div>'+
      '<div class="family-role">posição '+a.physical_position+'</div></div>'+
      '<div class="family-number">'+numberText+'<span class="family-denom">/5</span></div>'+
      '<div class="eligibility"><span class="counter">'+(unresolved?'aguardando contagem exata':'períodos confirmados nesta semana')+'</span>'+
      '<span class="flag '+(ok?'ok':'')+'">'+flagText+'</span></div>'+
      '</div>';
  }).join('');
}

function assignmentCard(a,mode){
  const fallback=a.fallback_position?' · reserva '+a.fallback_position:'';
  return '<div class="assignment-card '+mode+'">'+
    '<span class="assignment-name">'+a.broker+'</span>'+
    '<strong>'+a.physical_position+'</strong>'+
    '<span class="assignment-role">'+a.role+fallback+'</span>'+
    '</div>';
}
function renderWeekendPlans(){
  const policy=state.weekendPolicy;
  if(!policy)return;
  const sat=document.querySelector('#saturdayAssignments');
  const sun=document.querySelector('#sundayAssignments');
  if(sat)sat.innerHTML=(policy.saturday?.assignments||[]).map(a=>assignmentCard(a,'sat')).join('');
  if(sun)sun.innerHTML=(policy.sunday?.assignments||[]).map(a=>assignmentCard(a,'sun')).join('');
}
function pct(v,d=0){
  return Number.isFinite(v)?(v*100).toFixed(d).replace('.',',')+'%':'—';
}
function renderModelLab(){
  const lab=state.modelLab;
  if(!lab)return;
  const models=[...(lab.models||[])];
  const cards=document.querySelector('#modelCards');
  if(cards){
    cards.innerHTML=models.map(m=>{
      const champion=m.id===lab.champion_id;
      const idx=Number.isFinite(m.relative_index)?format(m.relative_index,1)+'%':'—';
      const oos=m.oos;
      const pros=m.prospective||{};
      return '<div class="model-card '+(champion?'champion':'')+'">'+
        '<div class="model-card-head"><span>'+(champion?'CHAMPION':'CHALLENGER')+'</span><b>'+m.status+'</b></div>'+
        '<h3>'+m.name+'</h3>'+
        '<div class="model-index">'+idx+'</div>'+
        '<div class="model-metrics">'+
          '<span><b>OOS</b>'+(oos?oos.hits+'/'+oos.n:'—')+'</span>'+
          '<span><b>PROS</b>'+((pros.n||0)>0?pros.hits+'/'+pros.n:'0/0')+'</span>'+
          '<span><b>p</b>'+(oos&&Number.isFinite(oos.p_value)?format(oos.p_value,3):'—')+'</span>'+
        '</div>'+
      '</div>';
    }).join('');
  }

  const board=document.querySelector('#modelLeaderboard');
  if(board){
    const ranked=models.filter(m=>m.oos).sort((a,b)=>
      (b.relative_index??-Infinity)-(a.relative_index??-Infinity)
    );
    board.innerHTML=ranked.map((m,i)=>
      '<div class="model-rank-row">'+
        '<span class="model-place">'+(i+1)+'</span>'+
        '<strong>'+m.name+'</strong>'+
        '<span>'+m.oos.hits+'/'+m.oos.n+' acertos OOS</span>'+
        '<b>'+format(m.relative_index,1)+'%</b>'+
      '</div>'
    ).join('');
  }

  const v=lab.viability;
  const stateEl=document.querySelector('#viabilityState');
  if(stateEl)stateEl.textContent=v?.state||'—';
  const metrics=document.querySelector('#viabilityMetrics');
  if(metrics&&v){
    metrics.innerHTML=
      '<div><span>Acertos OOS</span><strong>'+v.observed_hits+'</strong></div>'+
      '<div><span>Esperado ao acaso</span><strong>'+format(v.expected_hits,2)+'</strong></div>'+
      '<div><span>Lift</span><strong>'+pct(v.lift_vs_random,1)+'</strong></div>'+
      '<div><span>p-value</span><strong>'+format(v.p_value,3)+'</strong></div>';
  }
  const note=document.querySelector('#viabilityNote');
  if(note)note.textContent=v?.rule||'';
}
function render(){
  document.querySelector('#datasetStamp').textContent=state.events.length+' roletas · '+
    state.events.filter(e=>e.quality==='A').length+' A / '+state.events.filter(e=>e.quality==='B').length+' B';
  renderHero();renderWeekendFamily();renderWeekendPlans();renderRanking();renderMomentum();renderNever();renderPreviousDay();renderRecent();renderModelLab();
}
async function init(){
  try{
    const [mr,wr,pr,lr]=await Promise.all([
      fetch('/data/manifest.json',{cache:'no-store'}),
      fetch('/data/weekend-policy.json',{cache:'no-store'}),
      fetch('/data/presence-current-week.json',{cache:'no-store'}),
      fetch('/data/model-lab.json',{cache:'no-store'})
    ]);
    if(!mr.ok||!wr.ok||!pr.ok||!lr.ok)throw new Error('Falha ao carregar dados canônicos do painel');
    const manifest=await mr.json();
    state.weekendPolicy=await wr.json();
    state.presence=await pr.json();
    state.modelLab=await lr.json();
    const chunks=await Promise.all(manifest.sources.map(async s=>{
      const r=await fetch(s.path,{cache:'no-store'});
      if(!r.ok)throw new Error('Falha ao carregar '+s.path);
      return parseCSV(await r.text()).map(eventFromRow).filter(e=>e.N>0);
    }));
    const byId=new Map();chunks.flat().forEach(e=>byId.set(e.id,e));
    state.events=[...byId.values()];
    render();
  }catch(err){
    document.querySelector('#datasetStamp').textContent='erro de dados';
    document.body.insertAdjacentHTML('beforeend','<div class="error">'+err.message+'</div>');
  }
}
init();
