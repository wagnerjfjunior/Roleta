(function(){
  'use strict';

  let worker=null;
  let lastResult=null;
  let realEvents=[];

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
        '<button id="cancelWeeklyDuel" class="simulation-run simulation-cancel" disabled>Cancelar</button>'+
      '</div>'+
      '<div class="simulation-progress-wrap"><div class="simulation-progress"><i id="weeklyDuelProgressBar"></i></div><span id="weeklyDuelProgressText">0,0%</span></div>'+
      '<p id="weeklyDuelStatus" class="small muted">Pronto para simular semanas completas.</p>'+
      '<div id="weeklyDuelSummary" class="sim-context-table"><div class="muted small">Sem resultado ainda.</div></div>'+
      '<div id="weeklyDuelUpdates" class="sim-pairwise"><div class="muted small">Churn e valor das atualizações aparecerão aqui.</div></div>';

    const firstControls=page.querySelector('.simulation-controls');
    if(firstControls) firstControls.insertAdjacentElement('beforebegin',host);
    else page.appendChild(host);

    document.querySelector('#runWeeklyDuel').addEventListener('click',run);
    document.querySelector('#cancelWeeklyDuel').addEventListener('click',cancel);
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

    const p=result.paired,u=result.updates;
    const decided=p.current_wins+p.weekly_wins;
    const helpedDen=u.helped+u.hurt+u.neutral;
    document.querySelector('#weeklyDuelUpdates').innerHTML=
      '<div class="sim-context-head"><span class="eyebrow">VALOR DA ATUALIZAÇÃO</span><h3>CURRENT − WEEKLY</h3></div>'+
      '<div class="simulation-kpis">'+
        '<div><span>Current venceu</span><strong>'+pct(p.current_win_rate)+'</strong></div>'+
        '<div><span>Weekly venceu</span><strong>'+pct(p.weekly_win_rate)+'</strong></div>'+
        '<div><span>Δ hits/semana</span><strong>'+num(p.mean_delta_hits,3)+'</strong></div>'+
        '<div><span>Churn</span><strong>'+int(u.churn)+'</strong></div>'+
      '</div>'+
      '<p class="small muted">Mudanças que ajudaram: <b>'+int(u.helped)+'</b> · prejudicaram: <b>'+int(u.hurt)+'</b> · neutras: <b>'+int(u.neutral)+'</b> · empates semanais: <b>'+int(p.ties)+'</b>.</p>'+
      '<p class="small muted">Faixa Δ hits P05/P50/P95: <b>'+num(p.delta_hits_p05,0)+' / '+num(p.delta_hits_p50,0)+' / '+num(p.delta_hits_p95,0)+'</b>. O resultado é comportamento simulado da política, não evidência preditiva real.</p>';
  }

  function run(){
    if(worker)worker.terminate();
    const weeks=Number(document.querySelector('#weeklyDuelWeeks').value);
    const scenario=document.querySelector('#weeklyDuelScenario').value;
    const signalStrength=scenario==='null'?0:Number(document.querySelector('#weeklyDuelStrength').value);
    const seed=document.querySelector('#weeklyDuelSeed').value||'weekly-duel-2026';
    const status=document.querySelector('#weeklyDuelStatus');
    const runBtn=document.querySelector('#runWeeklyDuel');
    const cancelBtn=document.querySelector('#cancelWeeklyDuel');

    try{
      const self=window.RoletaWeeklyDuel?.selfTest(realEvents);
      if(!self?.pass)throw new Error('Self-test RLT-M4-07 falhou.');
    }catch(err){
      status.textContent=err.message;
      return;
    }

    worker=new Worker('/simulation/weekly-duel-worker.js');
    runBtn.disabled=true;cancelBtn.disabled=false;setProgress(0);
    status.textContent='Executando '+weeks.toLocaleString('pt-BR')+' semanas pareadas…';

    worker.onmessage=e=>{
      const msg=e.data||{};
      if(msg.type==='progress'){
        setProgress(msg.pct);
        status.textContent='Processadas '+msg.completed_weeks.toLocaleString('pt-BR')+' / '+msg.total_weeks.toLocaleString('pt-BR')+' semanas.';
      }else if(msg.type==='complete'){
        setProgress(1);render(msg.result);
        status.textContent='Concluído · '+msg.result.total_synthetic_events.toLocaleString('pt-BR')+' roletas sintéticas.';
        worker.terminate();worker=null;runBtn.disabled=false;cancelBtn.disabled=true;
      }else if(msg.type==='error'){
        status.textContent='Erro: '+msg.message;
        worker.terminate();worker=null;runBtn.disabled=false;cancelBtn.disabled=true;
      }
    };
    worker.onerror=e=>{
      status.textContent='Erro no worker: '+e.message;
      worker?.terminate();worker=null;runBtn.disabled=false;cancelBtn.disabled=true;
    };
    worker.postMessage({type:'run',config:{realEvents,weeks,scenario,signalStrength,seed}});
  }

  function cancel(){
    if(worker){worker.terminate();worker=null}
    document.querySelector('#runWeeklyDuel').disabled=false;
    document.querySelector('#cancelWeeklyDuel').disabled=true;
    document.querySelector('#weeklyDuelStatus').textContent='Simulação cancelada.';
  }

  document.addEventListener('roleta:workspace-ready',event=>{
    realEvents=event.detail?.events||[];
    ensureUI();
  },{once:true});
})();
