(function(){
  'use strict';

  const STORAGE_KEY='roleta.weekly-duel.runs.v2';
  let worker=null;
  let lastResult=null;
  let lastTest=null;
  let realEvents=[];


  // F2-03: hash exactly the ordered, normalized input sent to the worker.
  // A new run must be exported to obtain provenance; historical exports are not retroactively attested.
  async function inputProvenance(events,config){
    if(!globalThis.crypto?.subtle)throw new Error('SHA-256 indisponível neste contexto; execução bloqueada para preservar auditoria.');
    const ordered=events.map(e=>({
      N:e.N,period:e.period||'desconhecido',
      occupied:Array.isArray(e.occupied)?e.occupied.slice():[],
      first:e.first??null,last:e.last??null,
      second:e.second??null,courtesy:e.courtesy??null
    }));
    const bytes=new TextEncoder().encode(JSON.stringify(ordered));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    return {
      schema:'rlt-simulation-input-provenance-v1',
      algorithm:'SHA-256',encoding:'UTF-8',serialization:'JSON.stringify ordered selected engine fields',
      real_events_count:events.length,ordered_engine_input_sha256:sha256,
      engine:'simulation/weekly-duel.js',
      configuration:{weeks:config.weeks,scenario:config.scenario,signalStrength:config.signalStrength,seed:config.seed,seedCount:config.seedCount},
      warning:'Hash covers selected ordered engine input fields, not raw source files or engine revision. Does not establish historical export provenance.'
    };
  }

  function readRuns(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(_){return[]}
  }
  function updateSavedCount(){
    const el=document.querySelector('#weeklyDuelSavedRuns');
    if(el)el.textContent=readRuns().length+' runs auditáveis salvos localmente';
  }
  function buildTestDefinition(config){
    const names={
      null:'NULL · acaso puro',
      stable_period:'Sinal estável por período',
      regime_shift:'Mudança de regime no meio da semana',
      weak_noise:'Sinal fraco + ruído'
    };
    return {
      id:'RLT-M4-07-v2',
      name:names[config.scenario]||config.scenario,
      objective:'Comparar WEEKLY_FROZEN e CURRENT sob a mesma sequência de semanas sintéticas, separando disponibilidade operacional de qualidade paired-valid.',
      policy:'PROSPECTIVE-V1.0.0 / RLT-M5-WEEKLY-V1',
      scenario:{
        type:config.scenario,
        signal_strength:config.signalStrength,
        target:'2X = Nº1 ou Último'
      },
      workload:{
        weeks:config.weeks,
        events_per_week:12,
        people_per_event:4,
        planned_synthetic_events:config.weeks*12,
        planned_person_opportunities:config.weeks*12*4
      },
      reproducibility:{
        seed:config.seed,
        structural_source:'Moldes estruturais derivados da base real carregada; a quantidade elegível é registrada no resultado',
        chronology:'Weekly congela no início; Current recalcula somente após revelar cada evento; ambos usam o mesmo resultado sintético.'
      },
      evaluation:{
        primary:'paired-valid Δ O/E e Δ excesso',
        secondary:['paired-valid Δ hits','weekly win rate','operational valid opportunities','churn','helped/hurt/neutral revisions'],
        guard:'Resultados simulados não alteram a semana real congelada.'
      }
    };
  }
  function saveRun(test,result){
    const runs=readRuns();
    runs.unshift({
      saved_at:new Date().toISOString(),
      source:'Roleta Intelligence · Weekly Policy Duel',
      test,
      result
    });
    localStorage.setItem(STORAGE_KEY,JSON.stringify(runs.slice(0,50)));
    updateSavedCount();
  }
  function exportRun(){
    if(!lastResult||!lastTest)return;
    const payload={
      exported_at:new Date().toISOString(),
      source:'Roleta Intelligence · Weekly Policy Duel',
      test:lastTest,
      result:lastResult
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='roleta-weekly-duel-'+Date.now()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function pct(x){return Number.isFinite(x)?(x*100).toFixed(2).replace('.',',')+'%':'—'}
  function num(x,d=3){return Number.isFinite(x)?x.toFixed(d).replace('.',','):'—'}
  function int(x){return Number.isFinite(x)?Math.round(x).toLocaleString('pt-BR'):'—'}

  function ensureUI(){
    const page=document.querySelector('#workspace-simulation');
    if(!page||document.querySelector('#weeklyDuelLab'))return;

    const host=document.createElement('article');
    host.id='weeklyDuelLab';
    host.className='card';
    host.innerHTML=
      '<div class="section-head"><div><span class="eyebrow">RLT-M4-07 · POLICY DUEL</span><h2>Pré-cravado semanal × Sugestão atual</h2></div><span class="simulation-separation">POLÍTICA V1 FIXA</span></div>'+
      '<p class="small muted">A política PROSPECTIVE-V1.0.0 permanece fixa. Cada semana usa a mesma sequência sintética para WEEKLY_FROZEN, CURRENT e acaso. O resultado deste laboratório não altera a semana real já congelada.</p>'+
      '<div class="simulation-control-grid">'+
        '<label><span>Semanas simuladas</span><select id="weeklyDuelWeeks"><option value="1000">1.000</option><option value="10000" selected>10.000</option><option value="50000">50.000</option><option value="100000">100.000</option></select></label>'+
        '<label><span>Cenário</span><select id="weeklyDuelScenario"><option value="null">NULL · acaso puro</option><option value="stable_period">Sinal estável por período</option><option value="regime_shift">Mudança de regime no meio da semana</option><option value="weak_noise">Sinal fraco + ruído</option></select></label>'+
        '<label><span>Força do sinal</span><select id="weeklyDuelStrength"><option value="0.01">1%</option><option value="0.03" selected>3%</option><option value="0.05">5%</option><option value="0.10">10%</option></select></label>'+
        '<label><span>Seed</span><input id="weeklyDuelSeed" value="weekly-duel-2026"></label>'+
        '<button id="runWeeklyDuel" class="simulation-run">Rodar duelo</button>'+
        '<button id="runWeeklyMultiseed" class="simulation-run">Multiseed · 5 seeds</button>'+
        '<button id="cancelWeeklyDuel" class="simulation-run simulation-cancel" disabled>Cancelar</button>'+
      '</div>'+
      '<div class="simulation-progress-wrap"><div class="simulation-progress"><i id="weeklyDuelProgressBar"></i></div><span id="weeklyDuelProgressText">0,0%</span></div>'+
      '<p id="weeklyDuelStatus" class="small muted">Pronto para simular semanas completas.</p>'+
      '<div class="simulation-audit-actions"><button id="exportWeeklyDuel" class="workspace-link-button" disabled>Exportar JSON</button><span id="weeklyDuelSavedRuns" class="small muted">0 runs auditáveis salvos localmente</span></div>'+
      '<div id="weeklyDuelSummary" class="sim-context-table"><div class="muted small">Sem resultado ainda.</div></div>'+
      '<div id="weeklyDuelUpdates" class="sim-pairwise"><div class="muted small">Churn e valor das atualizações aparecerão aqui.</div></div>';

    const firstControls=page.querySelector('.simulation-controls');
    if(firstControls) firstControls.insertAdjacentElement('beforebegin',host);
    else page.appendChild(host);

    document.querySelector('#runWeeklyDuel').addEventListener('click',()=>run(false));
    document.querySelector('#runWeeklyMultiseed').addEventListener('click',()=>run(true));
    document.querySelector('#cancelWeeklyDuel').addEventListener('click',cancel);
    document.querySelector('#exportWeeklyDuel').addEventListener('click',exportRun);
    updateSavedCount();
  }

  function setProgress(v){
    const p=Math.max(0,Math.min(1,Number(v)||0));
    const bar=document.querySelector('#weeklyDuelProgressBar');
    const txt=document.querySelector('#weeklyDuelProgressText');
    if(bar)bar.style.width=(p*100).toFixed(1)+'%';
    if(txt)txt.textContent=(p*100).toFixed(1).replace('.',',')+'%';
  }

  function render(result){
    lastResult=result;
    const s=result.strategies||{};
    const rows=[
      ['Pré-cravado semanal',s.weekly],
      ['Sugestão atual',s.current],
      ['Acaso',s.random]
    ];
    document.querySelector('#weeklyDuelSummary').innerHTML=
      '<div class="sim-context-head"><span class="eyebrow">RESULTADO</span><h3>'+result.weeks.toLocaleString('pt-BR')+' semanas · '+result.total_synthetic_events.toLocaleString('pt-BR')+' roletas</h3></div>'+
      '<div class="sim-model-table">'+rows.map(([label,r])=>
        '<div class="sim-model-row">'+
          '<strong>'+label+'</strong>'+
          '<span>Hits <b>'+int(r.hits)+'</b></span>'+
          '<span>Esperado <b>'+num(r.expected,1)+'</b></span>'+
          '<span>O/E <b>'+num(r.oe,3)+'</b></span>'+
          '<span>P05–P95 <b>'+num(r.oe_p05,2)+'–'+num(r.oe_p95,2)+'</b></span>'+
        '</div>'
      ).join('')+'</div>';

    const p=result.paired_valid,u=result.updates,o=result.operational;
    document.querySelector('#weeklyDuelUpdates').innerHTML=
      '<div class="sim-context-head"><span class="eyebrow">OPERACIONAL</span><h3>Elegibilidade / disponibilidade</h3></div>'+
      '<div class="simulation-kpis">'+
        '<div><span>Weekly válidas</span><strong>'+int(o.weekly_valid_opportunities)+'</strong></div>'+
        '<div><span>Current válidas</span><strong>'+int(o.current_valid_opportunities)+'</strong></div>'+
        '<div><span>Δ oportunidades</span><strong>'+int(o.delta_valid_opportunities)+'</strong></div>'+
        '<div><span>Δ O/E bruto</span><strong>'+num(o.delta_oe,3)+'</strong></div>'+
      '</div>'+
      '<div class="sim-context-head"><span class="eyebrow">PAIRED-VALID</span><h3>CURRENT − WEEKLY · mesma pessoa/evento, ambos válidos</h3></div>'+
      '<div class="simulation-kpis">'+
        '<div><span>Current venceu</span><strong>'+pct(p.current_win_rate)+'</strong></div>'+
        '<div><span>Weekly venceu</span><strong>'+pct(p.weekly_win_rate)+'</strong></div>'+
        '<div><span>Δ hits/semana</span><strong>'+num(p.mean_delta_hits,3)+'</strong></div>'+
        '<div><span>Δ O/E</span><strong>'+num(p.mean_delta_oe,3)+'</strong></div>'+
        '<div><span>Δ excesso</span><strong>'+num(p.mean_delta_excess,3)+'</strong></div>'+
        '<div><span>Churn</span><strong>'+int(u.churn)+'</strong></div>'+
      '</div>'+
      '<p class="small muted">Paired-valid: <b>'+int(p.weekly.opportunities)+'</b> oportunidades idênticas de comparação. Weekly O/E <b>'+num(p.weekly.oe,3)+'</b> · Current O/E <b>'+num(p.current.oe,3)+'</b>.</p>'+
      '<p class="small muted">Mudanças que ajudaram: <b>'+int(u.helped)+'</b> · prejudicaram: <b>'+int(u.hurt)+'</b> · neutras: <b>'+int(u.neutral)+'</b> · empates semanais: <b>'+int(p.ties)+'</b>.</p>'+
      '<p class="small muted">IC 95% da média Δ hits/semana (bootstrap pareado por semana): <b>'+num(p.bootstrap_delta_hits?.ci95_low,3)+' a '+num(p.bootstrap_delta_hits?.ci95_high,3)+'</b> · '+int(p.bootstrap_delta_hits?.replicates)+' reamostragens. Faixa de incerteza da média simulada, não prova de vantagem preditiva real.</p>'+
      '<p class="small muted">Faixa paired-valid Δ hits P05/P50/P95: <b>'+num(p.delta_hits_p05,0)+' / '+num(p.delta_hits_p50,0)+' / '+num(p.delta_hits_p95,0)+'</b> · Δ O/E: <b>'+num(p.delta_oe_p05,2)+' / '+num(p.delta_oe_p50,2)+' / '+num(p.delta_oe_p95,2)+'</b>.</p>'+
      '<p class="small muted">O bloco operacional mede disponibilidade; o paired-valid mede qualidade da escolha. O resultado continua sendo comportamento simulado da política, não evidência preditiva real.</p>';
  }

  async function run(multiseed=false){
    if(worker)worker.terminate();
    const weeks=Number(document.querySelector('#weeklyDuelWeeks').value);
    const scenario=document.querySelector('#weeklyDuelScenario').value;
    const signalStrength=scenario==='null'?0:Number(document.querySelector('#weeklyDuelStrength').value);
    const seed=document.querySelector('#weeklyDuelSeed').value||'weekly-duel-2026';
    const status=document.querySelector('#weeklyDuelStatus');
    const runBtn=document.querySelector('#runWeeklyDuel');
    const multiBtn=document.querySelector('#runWeeklyMultiseed');
    const cancelBtn=document.querySelector('#cancelWeeklyDuel');
    const exportBtn=document.querySelector('#exportWeeklyDuel');

    try{
      const self=window.RoletaWeeklyDuel?.selfTest(realEvents);
      if(!self?.pass)throw new Error('Self-test RLT-M4-07 falhou.');
    }catch(err){
      status.textContent=err.message;
      return;
    }

    const testDefinition=buildTestDefinition({weeks,scenario,signalStrength,seed});
    lastTest=null;
    lastResult=null;
    if(exportBtn)exportBtn.disabled=true;
    const config={realEvents,weeks,scenario,signalStrength,seed,seedCount:5};
    let provenance;
    try{
      provenance=await inputProvenance(realEvents,config);
    }catch(err){
      status.textContent='AUDITORIA BLOQUEADA · '+err.message;
      return;
    }
    lastTest={...testDefinition,experiment_mode:multiseed?'multiseed':'single_seed',input_provenance:provenance};
    worker=new Worker('/simulation/weekly-duel-worker.js');
    runBtn.disabled=true;multiBtn.disabled=true;cancelBtn.disabled=false;setProgress(0);
    status.textContent='Executando '+weeks.toLocaleString('pt-BR')+' semanas pareadas…';

    worker.onmessage=e=>{
      const msg=e.data||{};
      if(msg.type==='progress'){
        setProgress(msg.pct);
        status.textContent='Processadas '+msg.completed_weeks.toLocaleString('pt-BR')+' / '+msg.total_weeks.toLocaleString('pt-BR')+' semanas.';
      }else if(msg.type==='complete'){
        const result=msg.result;
        const sameScenario=result.scenario===testDefinition.scenario.type;
        const sameStrength=multiseed?result.runs.every(r=>r.weeks===weeks):Math.abs(Number(result.signal_strength)-Number(testDefinition.scenario.signal_strength))<1e-12;
        if(!sameScenario||!sameStrength){
          status.textContent='AUDITORIA BLOQUEADA · configuração e resultado não coincidem. Run não salvo.';
          worker.terminate();worker=null;runBtn.disabled=false;multiBtn.disabled=false;cancelBtn.disabled=true;
          lastTest=null;lastResult=null;
          if(exportBtn)exportBtn.disabled=true;
          return;
        }
        // Preserve the input provenance captured before posting to the worker.
        setProgress(1);
        if(multiseed){
          lastResult=result;
          document.querySelector('#weeklyDuelSummary').innerHTML='<h3>Multiseed · '+result.seed_count+' sementes</h3><p>Δ hits/semana médio entre seeds: <b>'+num(result.mean_delta_hits_across_seeds,3)+'</b> · desvio-padrão: <b>'+num(result.sd_delta_hits_across_seeds,3)+'</b> · mínimo/máximo: <b>'+num(result.min_delta_hits,3)+' / '+num(result.max_delta_hits,3)+'</b> · seeds positivas: <b>'+int(result.seeds_with_positive_delta)+'/'+int(result.seed_count)+'</b>.</p><p class="small muted">Variação entre simulações sintéticas; não demonstra vantagem preditiva real.</p>';
          document.querySelector('#weeklyDuelUpdates').innerHTML='<div class="small muted">Resultados individuais por seed disponíveis no JSON auditável.</div>';
        }else render(result);
        saveRun(lastTest,result);
        if(exportBtn)exportBtn.disabled=false;
        status.textContent='Concluído · '+result.total_synthetic_events.toLocaleString('pt-BR')+' roletas sintéticas · run salvo localmente.';
        worker.terminate();worker=null;runBtn.disabled=false;multiBtn.disabled=false;cancelBtn.disabled=true;
      }else if(msg.type==='error'){
        status.textContent='Erro: '+msg.message;
        worker.terminate();worker=null;runBtn.disabled=false;multiBtn.disabled=false;cancelBtn.disabled=true;
      }
    };
    worker.onerror=e=>{
      status.textContent='Erro no worker: '+e.message;
      worker?.terminate();worker=null;runBtn.disabled=false;multiBtn.disabled=false;cancelBtn.disabled=true;
    };
    worker.postMessage({type:multiseed?'multiseed':'run',config});
  }

  function cancel(){
    if(worker){worker.terminate();worker=null}
    lastTest=null;lastResult=null;
    document.querySelector('#runWeeklyDuel').disabled=false;
    document.querySelector('#runWeeklyMultiseed').disabled=false;
    document.querySelector('#cancelWeeklyDuel').disabled=true;
    const exportBtn=document.querySelector('#exportWeeklyDuel');
    if(exportBtn)exportBtn.disabled=true;
    document.querySelector('#weeklyDuelStatus').textContent='Simulação cancelada.';
  }

  document.addEventListener('roleta:workspace-ready',event=>{
    realEvents=event.detail?.events||[];
    ensureUI();
  },{once:true});
})();
