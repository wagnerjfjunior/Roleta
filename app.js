const state={events:[],weekendPolicy:null,presence:null,modelLab:null};
const OBJ='n1last';
const domain=window.RoletaDomainCore;
if(!domain)throw new Error('RoletaDomainCore unavailable.');

const SCHEDULE_EXCEPTIONS={
  '04/10/2026':{mode:'dual',periods:['manha','tarde'],reason:'Eleições Gerais 2026 · 1º turno'},
  '25/10/2026':{mode:'dual',periods:['manha','tarde'],reason:'Eleições Gerais 2026 · eventual 2º turno'}
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
function eligible(e,pos){return domain.eligible(e,pos)}
function hit(e,pos){return domain.hit2x(e,pos)}
function chance(e){return domain.chance2x(e)}
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
    ? 'ranking histórico: #'+afternoon[0].pos+(afternoon[1]?' · #'+afternoon[1].pos:'')+' · não prospectivo'
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
  document.querySelector('#previousDayTitle').textContent='Data: '+date;

  const renderEvent=e=>'<div class="day-card"><div class="day-title">'+e.period+' · N='+e.N+'</div>'+
    '<div class="day-stats">'+
    '<span><b>Nº1</b>'+e.first+'</span><span><b>Nº2</b>'+e.second+'</span>'+
    '<span><b>Cortesia</b>'+e.courtesy+'</span><span><b>Último</b>'+e.last+'</span>'+
    '</div></div>';

  const exception=SCHEDULE_EXCEPTIONS[date];
  const integral=es.find(e=>e.period==='integral');
  const modeTitle=document.querySelector('#previousDayModeTitle');

  if(!exception&&integral){
    if(modeTitle)modeTitle.textContent='Roleta integral';
    document.querySelector('#previousDayEvents').innerHTML=renderEvent(integral);
    return;
  }

  if(modeTitle)modeTitle.textContent=exception?'Manhã e tarde · exceção eleitoral':'Manhã e tarde lado a lado';
  const by={manha:es.find(e=>e.period==='manha'),tarde:es.find(e=>e.period==='tarde')};
  document.querySelector('#previousDayEvents').innerHTML=['manha','tarde'].map(period=>{
    const e=by[period];
    if(!e)return '<div class="day-card"><h3>'+period+'</h3><div class="muted small">sem folha canônica</div></div>';
    return renderEvent(e);
  }).join('');
}
function renderRecent(){
  const es=[...state.events].filter(e=>parseDateBR(e.date)).sort((a,b)=>dateKey(b)-dateKey(a)).slice(0,14);
  document.querySelector('#recentTimeline').innerHTML=es.map(e=>
    '<div class="tick"><div class="date">'+e.date+'</div><div class="hit">'+e.first+' / '+e.last+
    '</div><div class="period">'+e.period+' · N='+e.N+'</div></div>'
  ).join('');
}
function latestNominalEvents(nominalRows,limit=2){
  const nominalIds=new Set((nominalRows||[]).map(r=>r.event_id).filter(Boolean));
  const periodOrder={desconhecido:0,manha:1,tarde:2,integral:3};
  return [...state.events]
    .filter(e=>parseDateBR(e.date)&&nominalIds.has(e.id))
    .sort((a,b)=>dateKey(b)-dateKey(a)||(periodOrder[b.period]??0)-(periodOrder[a.period]??0))
    .slice(0,limit);
}
function normalizeLookupName(v){
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
function nominalBrokerForDraw(nominalRows,eventId,drawnNumber,officialBrokers,nameAliases){
  const row=(nominalRows||[]).find(r=>r.event_id===eventId&&Number(r.drawn_number)===drawnNumber);
  if(!row)return null;
  const transcribed=row.broker_name_normalized||row.broker_name_raw||'';
  const canonical=(nameAliases&&nameAliases[transcribed])||transcribed;
  const official=(officialBrokers||[]).find(b=>normalizeLookupName(b['Nome Comercial'])===normalizeLookupName(canonical));
  return {
    name:official?.['Nome Comercial']||canonical||'—',
    manager:official?.['Equipe']||null,
    director:official?.['Diretor']||null,
    position:Number(row.physical_position),
    transcribed
  };
}
function buildLastTwoSpecialCard(nominalRows,officialBrokers,nameAliases){
  const card=document.createElement('article');
  card.className='card workspace-recent-specials';
  const events=latestNominalEvents(nominalRows,2);
  card.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">ÚLTIMAS 2 ROLETAS</span><h2>Quem tirou os números especiais</h2></div>'+
    '<span class="muted">Nº1 · Nº2 · Cortesia · Último de vez</span></div>'+
    (events.length
      ? '<div class="recent-special-events">'+events.map(e=>{
          const specials=[
            ['Nº1',1],
            ['Nº2',2],
            ['Cortesia',Math.max(1,e.N-1)],
            ['Último de vez',e.N]
          ];
          return '<section class="recent-special-event">'+
            '<div class="recent-special-head"><div><strong>'+e.date+'</strong><span>'+e.period+' · N='+e.N+'</span></div><small>'+e.id+'</small></div>'+
            '<div class="recent-special-grid">'+specials.map(([label,drawn])=>{
              const broker=nominalBrokerForDraw(nominalRows,e.id,drawn,officialBrokers,nameAliases);
              return '<div class="recent-special-item">'+
                '<span>'+label+'</span>'+
                '<strong>'+(broker?.name||'—')+'</strong>'+
                '<small>'+(broker?'posição física '+broker.position:'nome não disponível na transcrição nominal')+'</small>'+
              '</div>';
            }).join('')+'</div>'+
          '</section>';
        }).join('')+'</div>'
      : '<div class="muted small">Sem transcrição nominal validada para as roletas mais recentes.</div>')+
    '<p class="small muted workspace-data-note">Quadro de recência independente. Não altera o TOP 5 nem o ranking histórico.</p>';
  return card;
}
function renderWeekendFamily(){
  const host=document.querySelector('#weekendFamily');
  const policy=state.weekendPolicy,pres=state.presence;
  if(!host||!policy||!pres)return;
  const counts={};
  for(const broker of pres.brokers)counts[broker]=0;
  for(const r of pres.records||[])if(r.present&&counts[r.broker]!==undefined)counts[r.broker]++;
  host.innerHTML=policy.family_assignments.map(a=>{
    const canonical=a.presence_key||(a.broker.startsWith('Helena')?'Helena':a.broker);
    const override=pres.count_overrides?.[canonical];
    const exact=override&&Number.isFinite(override.count)?override.count:null;
    const count=exact!==null?exact:(counts[canonical]||0);
    const unresolved=override&&override.status==='needs_exact_count';
    const ok=!unresolved&&count>=policy.qualification.required_weekday_periods;
    const numberText=unresolved?'—':String(count);
    const missing=Math.max(0,policy.qualification.required_weekday_periods-count);
    const flagText=unresolved?'CONTAGEM A RECONCILIAR':(ok?'APTO':('PENDENTE · FALTA '+missing));
    return '<div class="family-card '+(a.role==='principal'?'primary':'secondary')+'">'+
      '<div class="family-head"><div><div class="family-name">'+a.broker+'</div><div class="family-role">'+a.role+'</div></div>'+
      '<div class="family-role">posição '+a.physical_position+(a.fallback_position?' · reserva '+a.fallback_position:'')+'</div></div>'+
      '<div class="family-number">'+numberText+'<span class="family-denom">/5</span></div>'+
      '<div class="eligibility"><span class="counter">'+(unresolved?'aguardando contagem exata':'períodos confirmados nesta semana')+'</span>'+
      '<span class="flag '+(ok?'ok':'')+'">'+flagText+'</span></div>'+
      '</div>';
  }).join('');
}

function assignmentCard(a,mode){
  const fallback=a.fallback_position?' · reserva '+a.fallback_position:'';
  const key=a.presence_key||a.broker;
  const override=state.presence?.count_overrides?.[key];
  const count=override&&Number.isFinite(override.count)?override.count:null;
  const required=state.weekendPolicy?.qualification?.required_weekday_periods||5;
  const eligible=count!==null&&count>=required;
  const eligibility=count===null?'contagem pendente':(eligible?'APTO '+count+'/'+required:'PENDENTE '+count+'/'+required);
  return '<div class="assignment-card '+mode+'">'+
    '<span class="assignment-name">'+a.broker+'</span>'+
    '<strong>'+a.physical_position+'</strong>'+
    '<span class="assignment-role">'+a.role+fallback+'</span>'+
    '<span class="assignment-role '+(eligible?'pill-up':'pill-cold')+'">'+eligibility+'</span>'+
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
    await upgradeWorkspace();
    document.dispatchEvent(new CustomEvent('roleta:workspace-ready',{detail:{events:state.events}}));
  }catch(err){
    document.querySelector('#datasetStamp').textContent='erro de dados';
    document.body.insertAdjacentHTML('beforeend','<div class="error">'+err.message+'</div>');
  }
}

async function upgradeWorkspace(){
  if(document.querySelector('.workspace-root'))return;
  let brokerStats=null,nominalRows=[],officialBrokers=[],nameAliases={};
  try{
    const [statsResponse,nominalResponse,officialResponse,aliasesResponse]=await Promise.all([
      fetch('/data/broker-stats-v3.json',{cache:'no-store'}),
      fetch('/data/full_draws_reconstructed.csv',{cache:'no-store'}),
      fetch('/data/brokers-official.csv',{cache:'no-store'}),
      fetch('/data/broker-name-aliases.json',{cache:'no-store'})
    ]);
    if(statsResponse.ok)brokerStats=await statsResponse.json();
    if(nominalResponse.ok)nominalRows=parseCSV(await nominalResponse.text());
    if(officialResponse.ok)officialBrokers=parseCSV(await officialResponse.text());
    if(aliasesResponse.ok)nameAliases=(await aliasesResponse.json()).aliases||{};
  }catch(_){}

  const shell=document.querySelector('.shell');
  if(!shell)return;

  const root=document.createElement('div');
  root.className='workspace-root';
  shell.parentNode.insertBefore(root,shell);

  const sidebar=document.createElement('aside');
  sidebar.className='workspace-sidebar';
  sidebar.innerHTML=
    '<div class="workspace-brand"><b>Roleta Intelligence</b><span>WORKSPACE V3</span></div>'+
    '<button class="workspace-menu-toggle" type="button" aria-controls="workspaceNavigation" aria-expanded="false" aria-label="Abrir menu de navegação">☰ <span>Menu</span></button>'+
    '<nav id="workspaceNavigation" class="workspace-nav" aria-label="Navegação principal">'+
      '<button class="active" data-workspace-page="overview">Visão geral</button>'+
      '<button data-workspace-page="intake">Nova Roleta</button>'+
      '<button data-workspace-page="family">Minha família</button>'+
      '<button data-workspace-page="ranking">Ranking</button>'+
      '<button data-workspace-page="weekend">Fim de semana</button>'+
      '<button data-workspace-page="models">Modelos & estatística</button>'+
      '<button data-workspace-page="simulation">Simulação</button>'+
    '</nav>';

  root.appendChild(sidebar);
  root.appendChild(shell);
  shell.classList.add('workspace-main');

  const overview=document.createElement('section');
  const intake=document.createElement('section');
  const family=document.createElement('section');
  const ranking=document.createElement('section');
  const weekend=document.createElement('section');
  const models=document.createElement('section');
  const simulation=document.createElement('section');
  overview.id='workspace-overview'; intake.id='workspace-intake'; family.id='workspace-family'; ranking.id='workspace-ranking';
  weekend.id='workspace-weekend'; models.id='workspace-models'; simulation.id='workspace-simulation';
  [overview,intake,family,ranking,weekend,models,simulation].forEach((p,idx)=>{p.className='workspace-page'+(idx===0?' active':'')});

  const first=shell.firstChild;
  shell.insertBefore(simulation,first); shell.insertBefore(models,simulation); shell.insertBefore(weekend,models); shell.insertBefore(ranking,weekend);
  shell.insertBefore(family,ranking); shell.insertBefore(intake,family); shell.insertBefore(overview,intake);

  const move=(el,to)=>{if(el)to.appendChild(el)};
  move(shell.querySelector('.topbar'),overview);
  move(shell.querySelector('.notice'),overview);

  const prospectiveMount=document.createElement('article');
  prospectiveMount.id='prospectiveOverview';
  prospectiveMount.className='card workspace-prospective';
  prospectiveMount.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">RLT-M5-01 · PROSPECTIVO</span><h2>Pré-cravados da semana</h2></div></div>'+
    '<div class="muted small">Carregando ledger prospectivo…</div>';
  overview.appendChild(prospectiveMount);

  const hero=shell.querySelector('.hero-grid');
  if(hero){
    const duplicateSaturday=hero.querySelector('.hero-card.accent');
    if(duplicateSaturday)duplicateSaturday.remove();
    hero.classList.add('workspace-hero','workspace-historical-signal');
    const historicalIntro=document.createElement('article');
    historicalIntro.className='card workspace-historical-intro';
    historicalIntro.innerHTML=
      '<div class="section-head"><div><span class="eyebrow">SINAL HISTÓRICO · DESCRITIVO</span><h2>Leitura por período</h2></div>'+
      '<span class="historical-only-badge">NÃO PROSPECTIVO</span></div>'+
      '<p class="small muted">Estes números vêm do ranking histórico da base e servem apenas para análise em Modelos & estatística. Não são pré-cravados, não entram como sugestão operacional e não recebem crédito prospectivo.</p>';
    models.appendChild(historicalIntro);
    move(hero,models);
  }

  const weekendModule=shell.querySelector('.weekend-module');
  move(weekendModule,weekend);

  const dashboard=shell.querySelector('.dashboard-grid');
  if(dashboard){
    [...dashboard.children].forEach(card=>{
      if(card.querySelector('#rankingBars')||card.querySelector('#momentumList')||card.querySelector('#neverList'))move(card,ranking);
      else if(card.querySelector('#previousDayEvents')||card.querySelector('#recentTimeline'))move(card,overview);
      else if(card.querySelector('#modelCards')||card.querySelector('#modelLeaderboard')||card.querySelector('#viabilityState')||card.classList.contains('methodology'))move(card,models);
    });
    if(!dashboard.children.length)dashboard.remove();
  }

  const pageHead=(eyebrow,title,desc)=>{
    const h=document.createElement('div'); h.className='workspace-page-head';
    h.innerHTML='<div><span class="eyebrow">'+eyebrow+'</span><h2>'+title+'</h2><p>'+desc+'</p></div>';
    return h;
  };
  if(window.RouletteIntake)window.RouletteIntake.mount(intake);
  else intake.prepend(pageHead('NOVA ROLETA','Upload e validação','Módulo de entrada indisponível.'));
  family.prepend(pageHead('MINHA FAMÍLIA','Histórico individual','Nº1, Nº2, Cortesia e Último por pessoa nas roletas com permutação completa validada.'));
  ranking.prepend(pageHead('RANKING','Estatística de corretores','Top 5 por resultado especial e ranking histórico de posições.'));
  weekend.prepend(pageHead('FIM DE SEMANA','Sábado e domingo','Elegibilidade 5/10, prévia de sábado e fechamento de domingo após o resultado de sábado.'));
  models.prepend(pageHead('MODEL LAB','Modelos & estatística','Champion, challengers, backtest, viabilidade e auditoria estatística.'));
  simulation.prepend(pageHead('SIMULATION LAB','Validação por Monte Carlo','Universos sintéticos estruturados pelas roletas reais. Nenhum evento simulado entra na base canônica.'));

  const simControls=document.createElement('article');
  simControls.className='card simulation-controls';
  simControls.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">RLT-M4-06</span><h2>Configuração da simulação</h2></div><span class="simulation-separation">SIMULATION DATA</span></div>'+
    '<div class="simulation-control-grid">'+
      '<label><span>Universos</span><select id="simUniversesInput"><option>50</option><option selected>100</option><option>250</option><option>500</option><option>1000</option></select></label>'+
      '<label><span>Anos por universo</span><select id="simYearsInput"><option>1</option><option>5</option><option selected>10</option><option>20</option></select></label>'+
      '<label><span>Cenário</span><select id="simScenarioInput"><option value="null">NULL · acaso puro</option><option value="fixed_2x">Bias 2X · posição fixa</option><option value="morning_2x">Bias 2X · somente manhã</option><option value="high_n_2x">Bias 2X · N alto</option></select></label>'+
      '<label><span>Posição do sinal</span><input id="simPositionInput" type="number" min="1" value="14"></label>'+
      '<label><span>Força do sinal</span><select id="simStrengthInput"><option value="0.01">1%</option><option value="0.03" selected>3%</option><option value="0.05">5%</option><option value="0.10">10%</option></select></label>'+
      '<label id="simMinNWrap" hidden><span>N mínimo do sinal</span><input id="simMinNInput" type="number" min="4" step="1" value="25"></label>'+
      '<label><span>Seed</span><input id="simSeedInput" value="roleta-2026"></label>'+
      '<button id="runSimulation" class="simulation-run">Rodar simulação</button>'+
      '<button id="cancelSimulation" class="simulation-run simulation-cancel" disabled>Cancelar</button>'+
    '</div>'+
    '<div class="simulation-progress-wrap"><div class="simulation-progress"><i id="simProgressBar"></i></div><span id="simProgressText">0,0%</span></div>'+
    '<p id="simStatus" class="small muted">Pronto. A base real é usada somente como estrutura e estado inicial.</p>'+
    '<div class="simulation-audit-actions"><button id="exportSimulation" class="workspace-link-button" disabled>Exportar JSON</button><span id="simSavedRuns" class="small muted">0 runs auditáveis salvos localmente</span></div>';
  simulation.appendChild(simControls);

  const simSummary=document.createElement('article');
  simSummary.className='card';
  simSummary.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">ESCALA</span><h2>Universos processados</h2></div><span class="simulation-real">REAL DATA: '+state.events.length+' roletas</span></div>'+
    '<div class="simulation-kpis">'+
      '<div><span>Universos</span><strong id="simUniverses">—</strong></div>'+
      '<div><span>Horizonte</span><strong id="simYears">—</strong></div>'+
      '<div><span>Roletas sintéticas</span><strong id="simEvents">—</strong></div>'+
      '<div><span>Moldes estruturais</span><strong id="simTemplates">—</strong></div>'+
    '</div>'+
    '<p class="small muted">Modo: <b id="simMode">—</b> · seed: <b id="simSeedUsed">—</b></p>';
  simulation.appendChild(simSummary);

  const simModels=document.createElement('article');
  simModels.className='card';
  simModels.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">CHAMPION vs BASELINES</span><h2>Placar Monte Carlo</h2></div><span class="muted">Top-2 congelado antes de cada sorteio</span></div>'+
    '<div id="simModelTable" class="sim-model-table"><div class="muted small">Rode a simulação para gerar o placar.</div></div>'+
    '<div class="sim-context-head"><span class="eyebrow">RLT-M4-06</span><h3>Adaptive Meta · O/E 2X</h3></div>'+
    '<div id="simContextTable" class="sim-context-table"><div class="muted small">Geral, manhã, tarde e signal-eligible serão comparados após a execução.</div></div>'+
    '<div id="simMetaPolicy" class="sim-pairwise"><div class="muted small">Aguardando diagnóstico do meta-modelo.</div></div>'+
    '<div id="simPairwise" class="sim-pairwise"><div class="muted small">Aguardando comparação pareada entre universos.</div></div>';
  simulation.appendChild(simModels);

  const simBands=document.createElement('article');
  simBands.className='card';
  simBands.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">NULL LAB</span><h2>Faixa esperada sob acaso</h2></div><span class="muted">O/E 2X · P05–P95 entre universos</span></div>'+
    '<div id="simNullBands" class="sim-band-grid"><div class="muted small">Aguardando simulação.</div></div>';
  simulation.appendChild(simBands);

  const simMethod=document.createElement('article');
  simMethod.className='card methodology';
  simMethod.innerHTML=
    '<div class="section-head"><div><span class="eyebrow">MECÂNICA</span><h2>Como cada roleta é simulada</h2></div></div>'+
    '<p>O laboratório sorteia um molde real completo, preserva N, período, posições físicas e gaps, recalcula a ordem efetiva e gera uma nova permutação uniforme 1..N. Cada modelo escolhe antes do sorteio; somente depois o evento sintético é revelado e incorporado ao histórico daquele universo.</p>'+
    '<p class="small muted"><strong>Isolamento:</strong> resultados sintéticos existem apenas no laboratório e nunca entram em data/manifest.json.</p>';
  simulation.appendChild(simMethod);

  if(brokerStats){
    const familyCard=document.createElement('article');
    familyCard.className='card workspace-family-module';
    familyCard.innerHTML='<div class="section-head"><div><span class="eyebrow">RESULTADOS DA FAMÍLIA</span><h2>Números especiais</h2></div><span class="muted">'+brokerStats.validated_events+' roletas completas</span></div>'+
      '<div class="workspace-family-grid">'+brokerStats.family.map(x=>
        '<div class="workspace-family-card">'+
          '<div class="workspace-family-name">'+x.display_name+'</div>'+
          '<div class="workspace-family-exp">'+x.participations+' participações</div>'+
          '<div class="workspace-family-stats">'+
            '<div><span>Nº1</span><b>'+x.number1+'</b></div>'+
            '<div><span>Nº2</span><b>'+x.number2+'</b></div>'+
            '<div><span>Cortesia</span><b>'+x.courtesy+'</b></div>'+
            '<div><span>Último</span><b>'+x.last+'</b></div>'+
          '</div>'+
          '<div class="workspace-family-total">Total especial: <b>'+x.total_special+'</b></div>'+
        '</div>'
      ).join('')+
      '<p class="small muted workspace-data-note">'+brokerStats.note+'</p>';
    family.appendChild(familyCard);

    const labels={number1:'Nº 1',number2:'Nº 2',courtesy:'Cortesia',last:'Último'};
    const topCard=document.createElement('article');
    topCard.className='card workspace-top5-module';
    topCard.innerHTML='<div class="section-head"><div><span class="eyebrow">TOP 5 CORRETORES</span><h2>Nº1, Nº2, Cortesia e Último</h2></div><span class="muted">contagem observada</span></div>'+
      '<div class="workspace-top5-grid">'+Object.entries(brokerStats.top5).map(([key,rows])=>
        '<div class="workspace-top5-card"><div class="workspace-top5-title">'+labels[key]+'</div>'+
        rows.map((r,idx)=>'<div class="workspace-top5-row"><span>'+(idx+1)+'º</span><strong>'+r.broker+'</strong><em><b>'+r.hits+'</b> / '+r.participations+'</em></div>').join('')+
        '</div>'
      ).join('')+'</div>';
    ranking.insertBefore(topCard,ranking.children[1]||null);

  }

  ranking.appendChild(buildLastTwoSpecialCard(nominalRows,officialBrokers,nameAliases));

  const footer=shell.querySelector('footer');
  if(footer)shell.appendChild(footer);

  function openPage(name){
    document.querySelectorAll('.workspace-page').forEach(p=>p.classList.toggle('active',p.id==='workspace-'+name));
    document.querySelectorAll('.workspace-nav button').forEach(b=>b.classList.toggle('active',b.dataset.workspacePage===name));
    sidebar.classList.remove('menu-open');
    const toggle=sidebar.querySelector('.workspace-menu-toggle');
    if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menu de navegação');}
    window.scrollTo({top:0,behavior:'smooth'});
  }
  const menuToggle=sidebar.querySelector('.workspace-menu-toggle');
  if(menuToggle)menuToggle.addEventListener('click',()=>{
    const expanded=sidebar.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded',String(expanded));
    menuToggle.setAttribute('aria-label',expanded?'Fechar menu de navegação':'Abrir menu de navegação');
  });
  document.querySelectorAll('.workspace-nav button').forEach(b=>b.addEventListener('click',()=>openPage(b.dataset.workspacePage)));
  document.querySelectorAll('[data-open-workspace]').forEach(b=>b.addEventListener('click',()=>openPage(b.dataset.openWorkspace)));
}

init();
