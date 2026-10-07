(function(global){
  'use strict';
  function format(x,d=2){return Number.isFinite(x)?x.toFixed(d).replace('.',','):'—'}
  function pct(v,d=0){return Number.isFinite(v)?(v*100).toFixed(d).replace('.',',')+'%':'—'}
  function eventHtml(e){return '<div class="day-card"><div class="day-title">'+e.period+' · N='+e.N+'</div><div class="day-stats"><span><b>Nº1</b>'+e.first+'</span><span><b>Nº2</b>'+e.second+'</span><span><b>Cortesia</b>'+e.courtesy+'</span><span><b>Último</b>'+e.last+'</span></div></div>'}
  function renderBase(model){
    const m=model.eventModel;
    document.querySelector('#datasetStamp').textContent=m.dataset.count+' roletas · '+m.dataset.qualityA+' A / '+m.dataset.qualityB+' B';
    const morning=m.hero.morning,afternoon=m.hero.afternoon||[];
    document.querySelector('#morningPick').textContent=morning?.pos??'—';
    document.querySelector('#morningPickMeta').textContent=morning?morning.hits+' acertos / '+morning.exposure+' exp. · O/E '+format(morning.oe):'amostra insuficiente';
    document.querySelector('#afternoonPick1').textContent=afternoon[0]?.pos??'—';
    document.querySelector('#afternoonPick2').textContent=afternoon[1]?.pos??'—';
    document.querySelector('#afternoonPickMeta').textContent=afternoon.length?'ranking histórico: #'+afternoon[0].pos+(afternoon[1]?' · #'+afternoon[1].pos:'')+' · não prospectivo':'amostra insuficiente';
    const sat=model.weekend.saturday||[];
    const ws=document.querySelector('#weekendSummary');if(ws)ws.innerHTML=sat.map(x=>'<span><b>'+x.broker.split(' ')[0]+'</b> '+x.physical_position+'</span>').join('');
    const ranking=m.ranking||[],max=Math.max(1,...ranking.map(r=>r.hits));
    document.querySelector('#rankingBars').innerHTML=ranking.map((r,i)=>'<div class="rank-row"><div class="rank-pos">'+r.pos+'</div><div class="track"><div class="fill" style="width:'+Math.max(4,r.hits/max*100)+'%"></div></div><div class="rank-meta">'+(i===0?'campeão · ':'')+r.hits+' acertos · '+r.exposure+' exp. · O/E '+format(r.oe)+'</div></div>').join('');
    document.querySelector('#momentumList').innerHTML=(m.momentum||[]).map(r=>'<div class="list-item"><strong>Posição '+r.pos+'</strong><span class="pill-up">'+r.recentHits+' acertos nas últimas '+Math.min(10,r.exposure)+' exposições · excesso '+format(r.recentExcess,1)+'</span></div>').join('')||'<div class="muted small">Sem sinal recente suficiente.</div>';
    document.querySelector('#neverList').innerHTML=(m.never||[]).map(r=>'<div class="list-item"><strong>Posição '+r.pos+'</strong><span class="pill-cold">0 em '+r.exposure+' oportunidades · esperado '+format(r.expected)+'</span></div>').join('')||'<div class="muted small">Nenhuma posição com exposição suficiente permanece zerada no alvo Nº1 ou Último.</div>';
    const p=m.previousDay;
    if(p?.date){
      document.querySelector('#previousDayTitle').textContent='Data: '+p.date;
      const mt=document.querySelector('#previousDayModeTitle');if(mt)mt.textContent=p.mode==='integral'?'Roleta integral':(p.exception?'Manhã e tarde · exceção eleitoral':'Manhã e tarde lado a lado');
      const host=document.querySelector('#previousDayEvents');
      if(p.mode==='integral'){host.innerHTML=eventHtml(p.events.find(e=>e.period==='integral'))}
      else{const by={manha:p.events.find(e=>e.period==='manha'),tarde:p.events.find(e=>e.period==='tarde')};host.innerHTML=['manha','tarde'].map(k=>by[k]?eventHtml(by[k]):'<div class="day-card"><h3>'+k+'</h3><div class="muted small">sem folha canônica</div></div>').join('')}
    }
    document.querySelector('#recentTimeline').innerHTML=(m.recent||[]).map(e=>'<div class="tick"><div class="date">'+e.date+'</div><div class="hit">'+e.first+' / '+e.last+'</div><div class="period">'+e.period+' · N='+e.N+'</div></div>').join('');
    renderModelLab(model.modelLab);
  }
  function renderModelLab(lab){
    if(!lab)return;const models=[...(lab.models||[])],cards=document.querySelector('#modelCards');
    if(cards)cards.innerHTML=models.map(m=>{const champion=m.id===lab.champion_id,idx=Number.isFinite(m.relative_index)?format(m.relative_index,1)+'%':'—',oos=m.oos,pros=m.prospective||{};return '<div class="model-card '+(champion?'champion':'')+'"><div class="model-card-head"><span>'+(champion?'CHAMPION':'CHALLENGER')+'</span><b>'+m.status+'</b></div><h3>'+m.name+'</h3><div class="model-index">'+idx+'</div><div class="model-metrics"><span><b>OOS</b>'+(oos?oos.hits+'/'+oos.n:'—')+'</span><span><b>PROS</b>'+((pros.n||0)>0?pros.hits+'/'+pros.n:'0/0')+'</span><span><b>p</b>'+(oos&&Number.isFinite(oos.p_value)?format(oos.p_value,3):'—')+'</span></div></div>'}).join('');
    const board=document.querySelector('#modelLeaderboard');if(board){const ranked=models.filter(m=>m.oos).sort((a,b)=>(b.relative_index??-Infinity)-(a.relative_index??-Infinity));board.innerHTML=ranked.map((m,i)=>'<div class="model-rank-row"><span class="model-place">'+(i+1)+'</span><strong>'+m.name+'</strong><span>'+m.oos.hits+'/'+m.oos.n+' acertos OOS</span><b>'+format(m.relative_index,1)+'%</b></div>').join('')}
    const v=lab.viability,se=document.querySelector('#viabilityState');if(se)se.textContent=v?.state||'—';const metrics=document.querySelector('#viabilityMetrics');if(metrics&&v)metrics.innerHTML='<div><span>Acertos OOS</span><strong>'+v.observed_hits+'</strong></div><div><span>Esperado ao acaso</span><strong>'+format(v.expected_hits,2)+'</strong></div><div><span>Lift</span><strong>'+pct(v.lift_vs_random,1)+'</strong></div><div><span>p-value</span><strong>'+format(v.p_value,3)+'</strong></div>';const note=document.querySelector('#viabilityNote');if(note)note.textContent=v?.rule||'';
  }
  global.RoletaDashboardRenderers={renderBase,format};
})(typeof globalThis!=='undefined'?globalThis:this);
