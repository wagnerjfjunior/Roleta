(function(){
  'use strict';

  const labels={
    context_raw:'Contextual Raw · Lab V1',
    global_raw:'Global Raw · Lab V1',
    random_baseline:'Random Baseline',
    fixed_baseline:'Fixed Baseline'
  };

  function fmtPct(x){return Number.isFinite(x)?(x*100).toFixed(2).replace('.',',')+'%':'—'}
  function fmt(x,d=3){return Number.isFinite(x)?x.toFixed(d).replace('.',','):'—'}
  function compact(n){
    if(n>=1e6)return (n/1e6).toFixed(2).replace('.',',')+' mi';
    if(n>=1e3)return (n/1e3).toFixed(1).replace('.',',')+' mil';
    return String(n);
  }

  function renderSummary(result){
    document.querySelector('#simUniverses').textContent=result.universes;
    document.querySelector('#simYears').textContent=result.years+' anos';
    document.querySelector('#simEvents').textContent=compact(result.total_synthetic_events);
    document.querySelector('#simTemplates').textContent=result.structural_templates;
    document.querySelector('#simMode').textContent=result.mode;
    document.querySelector('#simSeedUsed').textContent=result.seed;

    const rows=Object.values(result.models).sort((a,b)=>b.oe_2x-a.oe_2x);
    document.querySelector('#simModelTable').innerHTML=rows.map((m,i)=>
      '<div class="sim-model-row">'+
        '<span class="model-place">'+(i+1)+'</span>'+
        '<strong>'+labels[m.id]+'</strong>'+
        '<span><b>2X</b> '+fmtPct(m.hit_rate_2x)+'</span>'+
        '<span><b>Esp.</b> '+fmtPct(m.expected_rate_2x)+'</span>'+
        '<span><b>O/E</b> '+fmt(m.oe_2x,3)+'</span>'+
        '<span><b>3X</b> '+fmtPct(m.hit_rate_3x)+'</span>'+
        '<span><b>4X</b> '+fmtPct(m.hit_rate_4x)+'</span>'+
        '<span><b>Lose p95</b> '+m.max_losing_p95+'</span>'+
      '</div>'
    ).join('');

    document.querySelector('#simNullBands').innerHTML=rows.map(m=>
      '<div class="sim-band-card">'+
        '<span>'+labels[m.id]+'</span>'+
        '<strong>'+fmt(m.oe_2x,3)+'</strong>'+
        '<small>O/E 2X agregado</small>'+
        '<div class="sim-band"><i style="left:'+Math.max(0,Math.min(100,(m.oe_2x_p05-.5)*100))+'%"></i>'+
        '<i class="mid" style="left:'+Math.max(0,Math.min(100,(m.oe_2x-0.5)*100))+'%"></i>'+
        '<i style="left:'+Math.max(0,Math.min(100,(m.oe_2x_p95-.5)*100))+'%"></i></div>'+
        '<small>P05 '+fmt(m.oe_2x_p05,3)+' · P95 '+fmt(m.oe_2x_p95,3)+'</small>'+
      '</div>'
    ).join('');
  }

  function wire(events){
    const button=document.querySelector('#runSimulation');
    if(!button)return;
    const integrity=window.RoletaSimulationEngine.selfTest(events);
    document.querySelector('#simStatus').textContent=integrity.pass
      ? 'Motor íntegro · '+integrity.checks+' verificações mecânicas PASS.'
      : 'Motor bloqueado · '+integrity.error;
    button.disabled=!integrity.pass;
    const run=()=>{
      button.disabled=true;
      button.textContent='Simulando…';
      document.querySelector('#simStatus').textContent='Executando walk-forward sem hindsight…';
      setTimeout(()=>{
        try{
          const result=window.RoletaSimulationEngine.run({
            realEvents:events,
            universes:Number(document.querySelector('#simUniversesInput').value),
            years:Number(document.querySelector('#simYearsInput').value),
            seed:document.querySelector('#simSeedInput').value,
            eventsPerYear:624
          });
          renderSummary(result);
          document.querySelector('#simStatus').textContent='Concluído · dados sintéticos não foram gravados na base real.';
        }catch(err){
          document.querySelector('#simStatus').textContent='Erro: '+err.message;
        }finally{
          button.disabled=false;
          button.textContent='Rodar simulação';
        }
      },30);
    };
    button.addEventListener('click',run);
  }

  document.addEventListener('roleta:workspace-ready',e=>wire(e.detail.events));
})();
