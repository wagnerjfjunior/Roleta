(function(){
  'use strict';

  const DATA_URL='/data/prospective/prototype-week.json';

  function byId(list,id){return (list||[]).filter(x=>x.target_event_id===id)}
  function recommendationFor(data,eventId,person,strategy){
    const rows=byId(data.recommendations,eventId)
      .filter(x=>x.person_id===person&&x.strategy===strategy)
      .sort((a,b)=>(a.revision_number||0)-(b.revision_number||0));
    return rows.length?rows[rows.length-1]:null;
  }
  function trajectory(data,eventId,person){
    const rows=byId(data.recommendations,eventId)
      .filter(x=>x.person_id===person&&x.strategy==='CURRENT')
      .sort((a,b)=>(a.revision_number||0)-(b.revision_number||0));
    const values=rows.map(x=>x.physical_position).filter(Number.isFinite);
    return values.length?values.join(' → '):'—';
  }
  function executionFor(data,eventId,person){
    return (data.executions||[]).find(x=>x.target_event_id===eventId&&x.person_id===person)||null;
  }
  function adjudicationFor(data,recommendationId){
    return (data.adjudications||[]).find(x=>x.recommendation_id===recommendationId)||null;
  }
  function mark(adj){
    if(!adj)return '<span class="prospective-status pending">⏳</span>';
    return adj.hit_2x
      ? '<span class="prospective-status hit" title="HIT 2X">✓</span>'
      : '<span class="prospective-status miss" title="MISS 2X">×</span>';
  }
  function number(v){return Number.isFinite(v)?String(v):'—'}

  function personRow(data,event,person){
    const weekly=recommendationFor(data,event.id,person,'WEEKLY_FROZEN');
    const current=recommendationFor(data,event.id,person,'CURRENT');
    const executed=executionFor(data,event.id,person);
    const currentAdj=current?adjudicationFor(data,current.recommendation_id):null;
    return '<div class="prospective-person-row">'+
      '<strong>'+person+'</strong>'+
      '<span><small>Pré</small><b>'+number(weekly?.physical_position)+'</b></span>'+
      '<span><small>Atual</small><b>'+number(current?.physical_position)+'</b></span>'+
      '<span class="prospective-trajectory"><small>Histórico</small><b>'+trajectory(data,event.id,person)+'</b></span>'+
      '<span><small>Usado</small><b>'+number(executed?.physical_position)+'</b></span>'+
      mark(currentAdj)+
    '</div>';
  }

  function eventCard(data,event){
    return '<article class="prospective-event-card">'+
      '<div class="prospective-event-head">'+
        '<div><span>'+event.weekday+' · '+event.date+'</span><strong>'+event.period+'</strong></div>'+
        '<span class="prospective-event-state">PENDENTE</span>'+
      '</div>'+
      '<div class="prospective-person-list">'+data.people.map(p=>personRow(data,event,p)).join('')+'</div>'+
    '</article>';
  }

  function scorecard(data){
    return '<div class="prospective-scorecard">'+(data.scorecard||[]).map(s=>
      '<div><span>'+s.label+'</span><strong>'+s.hits+'/'+s.events+'</strong>'+
      '<small>O/E '+(Number.isFinite(s.oe)?s.oe.toFixed(2).replace('.',','):'—')+' · '+s.state.replaceAll('_',' ')+'</small></div>'
    ).join('')+'</div>';
  }

  async function render(){
    const existing=document.querySelector('.workspace-overview-family');
    if(!existing)return;

    let data;
    try{
      const r=await fetch(DATA_URL,{cache:'no-store'});
      if(!r.ok)throw new Error('Falha ao carregar protótipo prospectivo');
      data=await r.json();
    }catch(err){
      existing.innerHTML='<div class="section-head"><div><span class="eyebrow">RLT-M5-01</span><h2>Pré-cravados da semana</h2></div></div>'+
        '<p class="small error">'+err.message+'</p>';
      return;
    }

    existing.className='card workspace-prospective';
    existing.innerHTML=
      '<div class="section-head">'+
        '<div><span class="eyebrow">RLT-M5-01 · PROSPECTIVO</span><h2>Pré-cravados da semana</h2>'+
        '<p class="small muted">Pré = número congelado no início da semana · Atual = última recomendação antes do evento · Usado = posição realmente escolhida.</p></div>'+
        '<span class="prospective-week">'+data.week.label+'</span>'+
      '</div>'+
      '<div class="prospective-warning"><strong>Protótipo auditável.</strong> Nenhum número ainda foi congelado para esta semana; “—” não é previsão.</div>'+
      '<div class="prospective-events">'+data.events.map(e=>eventCard(data,e)).join('')+'</div>'+
      '<div class="sim-context-head"><span class="eyebrow">VALIDAÇÃO PROSPECTIVA</span><h3>Modelo × execução × acaso</h3></div>'+
      scorecard(data)+
      '<p class="small muted prospective-note">'+data.note+'</p>';
  }

  document.addEventListener('roleta:workspace-ready',render,{once:true});
  if(document.querySelector('.workspace-overview-family'))render();
})();
