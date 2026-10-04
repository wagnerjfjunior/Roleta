(function(){
  'use strict';

  const STORAGE_KEY='roleta.simulation.runs.v1';
  const labels={
    context_raw:'Contextual Raw · Lab V1',
    global_raw:'Global Raw · Lab V1',
    random_baseline:'Random Baseline',
    fixed_baseline:'Fixed Baseline'
  };
  let worker=null;
  let lastResult=null;

  function fmtPct(x){return Number.isFinite(x)?(x*100).toFixed(2).replace('.',',')+'%':'—'}
  function fmt(x,d=3){return Number.isFinite(x)?x.toFixed(d).replace('.',','):'—'}
  function compact(n){
    if(n>=1e6)return (n/1e6).toFixed(2).replace('.',',')+' mi';
    if(n>=1e3)return (n/1e3).toFixed(1).replace('.',',')+' mil';
    return String(n);
  }
  function readRuns(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(_){return[]}
  }
  function updateSavedCount(){
    const el=document.querySelector('#simSavedRuns');
    if(el)el.textContent=readRuns().length+' runs auditáveis salvos localmente';
  }
  function saveRun(result){
    const runs=readRuns();
    runs.unshift({
      saved_at:new Date().toISOString(),
      engine_version:result.version,
      ...result
    });
    localStorage.setItem(STORAGE_KEY,JSON.stringify(runs.slice(0,25)));
    updateSavedCount();
  }
  function exportRun(){
    if(!lastResult)return;
    const payload={
      exported_at:new Date().toISOString(),
      source:'Roleta Intelligence Simulation Lab',
      result:lastResult
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='roleta-simulation-'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function renderSummary(result){
    lastResult=result;
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
        '<span><b>Esp. 2X</b> '+fmtPct(m.expected_rate_2x)+'</span>'+
        '<span><b>O/E 2X</b> '+fmt(m.oe_2x,3)+'</span>'+
        '<span><b>3X</b> '+fmtPct(m.hit_rate_3x)+' · O/E '+fmt(m.oe_3x,3)+'</span>'+
        '<span><b>4X</b> '+fmtPct(m.hit_rate_4x)+' · O/E '+fmt(m.oe_4x,3)+'</span>'+
        '<span><b>Lose p95</b> '+m.max_losing_p95+'</span>'+
      '</div>'
    ).join('');

    const title=document.querySelector('#simNullBands')?.previousElementSibling?.querySelector('h2');
    if(title)title.textContent=result.mode.includes('SIGNAL')?'Faixa no cenário com sinal':'Faixa esperada sob acaso';

    document.querySelector('#simNullBands').innerHTML=rows.map(m=>
      '<div class="sim-band-card">'+
        '<span>'+labels[m.id]+'</span>'+
        '<strong>'+fmt(m.oe_2x,3)+'</strong>'+
        '<small>O/E 2X agregado</small>'+
        '<div class="sim-band"><i style="left:'+Math.max(0,Math.min(100,(m.oe_2x_p05-.5)*100))+'%"></i>'+
        '<i class="mid" style="left:'+Math.max(0,Math.min(100,(m.oe_2x-.5)*100))+'%"></i>'+
        '<i style="left:'+Math.max(0,Math.min(100,(m.oe_2x_p95-.5)*100))+'%"></i></div>'+
        '<small>P05 '+fmt(m.oe_2x_p05,3)+' · P95 '+fmt(m.oe_2x_p95,3)+'</small>'+
      '</div>'
    ).join('');

    const exp=document.querySelector('#exportSimulation');
    if(exp)exp.disabled=false;
  }

  function wire(events){
    const runButton=document.querySelector('#runSimulation');
    const cancelButton=document.querySelector('#cancelSimulation');
    const exportButton=document.querySelector('#exportSimulation');
    const status=document.querySelector('#simStatus');
    const bar=document.querySelector('#simProgressBar');
    if(!runButton||!cancelButton||!status||!bar)return;

    const integrity=window.RoletaSimulationEngine.selfTest(events);
    status.textContent=integrity.pass
      ? 'Motor íntegro · '+integrity.checks+' verificações mecânicas PASS.'
      : 'Motor bloqueado · '+integrity.error;
    runButton.disabled=!integrity.pass;
    updateSavedCount();

    function finishUi(){
      runButton.disabled=!integrity.pass;
      cancelButton.disabled=true;
      runButton.textContent='Rodar simulação';
    }

    runButton.addEventListener('click',()=>{
      if(worker)worker.terminate();
      worker=new Worker('/simulation/worker.js');
      runButton.disabled=true;
      cancelButton.disabled=false;
      runButton.textContent='Simulando…';
      bar.style.width='0%';

      const scenario=document.querySelector('#simScenarioInput').value;
      const signal={
        type:scenario,
        position:Number(document.querySelector('#simPositionInput').value)||14,
        strength:scenario==='null'?0:Number(document.querySelector('#simStrengthInput').value)||0,
        minN:25
      };
      const config={
        realEvents:events,
        universes:Number(document.querySelector('#simUniversesInput').value),
        years:Number(document.querySelector('#simYearsInput').value),
        seed:document.querySelector('#simSeedInput').value,
        eventsPerYear:624,
        signal
      };
      const total=config.universes*config.years*624;
      status.textContent='Executando '+compact(total)+' roletas sintéticas em worker…';

      worker.onmessage=e=>{
        const msg=e.data||{};
        if(msg.type==='progress'){
          bar.style.width=(msg.pct*100).toFixed(1)+'%';
          status.textContent='Processando universos: '+msg.done+' / '+msg.total+' · '+(msg.pct*100).toFixed(1)+'%';
          return;
        }
        if(msg.type==='complete'){
          renderSummary(msg.result);
          saveRun(msg.result);
          bar.style.width='100%';
          status.textContent='Concluído · run salvo localmente · dados sintéticos não alteraram a base real.';
          worker.terminate();worker=null;finishUi();
          return;
        }
        if(msg.type==='error'){
          status.textContent='Erro: '+msg.message;
          worker.terminate();worker=null;finishUi();
        }
      };
      worker.onerror=e=>{
        status.textContent='Erro no worker: '+(e.message||'falha desconhecida');
        worker.terminate();worker=null;finishUi();
      };
      worker.postMessage({type:'run',config});
    });

    cancelButton.addEventListener('click',()=>{
      if(worker){worker.terminate();worker=null}
      status.textContent='Simulação cancelada pelo usuário.';
      bar.style.width='0%';
      finishUi();
    });

    if(exportButton)exportButton.addEventListener('click',exportRun);
  }

  document.addEventListener('roleta:workspace-ready',e=>wire(e.detail.events));
})();
