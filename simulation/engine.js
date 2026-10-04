(function(global){
  'use strict';

  function hashSeed(input){
    let h=2166136261>>>0;
    const s=String(input??'roleta');
    for(let i=0;i<s.length;i++){
      h^=s.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function mulberry32(seed){
    let a=seed>>>0;
    return function(){
      a|=0;a=a+0x6D2B79F5|0;
      let t=Math.imul(a^a>>>15,1|a);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }

  function shuffle(n,rng){
    const a=Array.from({length:n},(_,i)=>i+1);
    for(let i=n-1;i>0;i--){
      const j=Math.floor(rng()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function contextKey(e){
    const bucket=Math.max(1,Math.round(e.N/5)*5);
    return (e.period||'desconhecido')+'|'+bucket;
  }

  function completeTemplates(events){
    return events.filter(e=>{
      const occupied=[...new Set((e.occupied||[]).filter(Number.isFinite))].sort((a,b)=>a-b);
      return Number.isFinite(e.N)&&e.N>=4&&occupied.length===e.N;
    }).map(e=>({
      N:e.N,
      period:e.period||'desconhecido',
      occupied:[...new Set(e.occupied)].sort((a,b)=>a-b)
    }));
  }

  function createStats(){
    return {global:new Map(),periods:new Map(),contexts:new Map()};
  }

  function statFor(map,pos){
    if(!map.has(pos))map.set(pos,{exp:0,hits:0,expected:0});
    return map.get(pos);
  }

  function updateStats(stats,e){
    const ctx=contextKey(e);
    const period=e.period||'desconhecido';
    if(!stats.contexts.has(ctx))stats.contexts.set(ctx,new Map());
    if(!stats.periods.has(period))stats.periods.set(period,new Map());
    const cm=stats.contexts.get(ctx);
    const pm=stats.periods.get(period);
    for(const pos of e.occupied){
      const isHit=(e.first===pos||e.last===pos)?1:0;
      const expected=Math.min(1,2/e.N);
      const g=statFor(stats.global,pos);
      g.exp++;g.hits+=isHit;g.expected+=expected;
      const p=statFor(pm,pos);
      p.exp++;p.hits+=isHit;p.expected+=expected;
      const c=statFor(cm,pos);
      c.exp++;c.hits+=isHit;c.expected+=expected;
    }
  }

  function seedStats(events){
    const s=createStats();
    for(const e of events)if(Number.isFinite(e.N)&&e.N>0&&Array.isArray(e.occupied))updateStats(s,e);
    return s;
  }

  function score(rec){
    if(!rec||rec.exp<3)return -Infinity;
    return (rec.hits-rec.expected)+Math.min(rec.exp,30)*0.0001;
  }

  function topEligible(map,occupied,count){
    const ranked=occupied.map(pos=>({pos,score:score(map.get(pos))}))
      .sort((a,b)=>b.score-a.score||a.pos-b.pos);
    const finite=ranked.filter(x=>Number.isFinite(x.score));
    const out=finite.slice(0,count).map(x=>x.pos);
    for(const pos of occupied){
      if(out.length>=count)break;
      if(!out.includes(pos))out.push(pos);
    }
    return out;
  }

  function chooseContextual(stats,template){
    const map=stats.contexts.get(contextKey(template))||new Map();
    return topEligible(map,template.occupied,2);
  }

  function choosePeriod(stats,template){
    const map=stats.periods.get(template.period||'desconhecido')||new Map();
    return topEligible(map,template.occupied,2);
  }

  function chooseGlobal(stats,template){
    return topEligible(stats.global,template.occupied,2);
  }

  function chooseRandom(template,rng){
    const a=[...template.occupied];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(rng()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a.slice(0,2);
  }

  function fixedLeaders(realEvents){
    const s=seedStats(realEvents);
    const positions=[...s.global.keys()];
    return topEligible(s.global,positions,2);
  }

  function chooseFixed(template,fixed){
    const out=fixed.filter(p=>template.occupied.includes(p)).slice(0,2);
    for(const p of template.occupied){
      if(out.length>=2)break;
      if(!out.includes(p))out.push(p);
    }
    return out;
  }

  function signalApplies(template,signal){
    if(!signal||signal.type==='null'||!Number(signal.strength))return false;
    if(!template.occupied.includes(Number(signal.position)))return false;
    if(signal.type==='morning_2x'&&template.period!=='manha')return false;
    if(signal.type==='high_n_2x'&&template.N<Number(signal.minN||25))return false;
    return ['fixed_2x','morning_2x','high_n_2x'].includes(signal.type);
  }

  function applySignal(permutation,occupied,template,rng,signal){
    if(!signalApplies(template,signal))return permutation;
    const strength=Math.max(0,Math.min(.5,Number(signal.strength)||0));
    if(rng()>=strength)return permutation;
    const targetPos=Number(signal.position);
    const targetIndex=occupied.indexOf(targetPos);
    if(targetIndex<0)return permutation;
    const desired=rng()<.5?1:template.N;
    const desiredIndex=permutation.indexOf(desired);
    [permutation[targetIndex],permutation[desiredIndex]]=[permutation[desiredIndex],permutation[targetIndex]];
    return permutation;
  }

  function simulateEvent(template,rng,index,signal){
    const occupied=[...template.occupied].sort((a,b)=>a-b);
    const permutation=applySignal(shuffle(template.N,rng),occupied,template,rng,signal);
    const byNumber=new Map();
    for(let i=0;i<occupied.length;i++)byNumber.set(permutation[i],occupied[i]);
    return {
      id:'SIM-'+index,
      N:template.N,
      period:template.period,
      occupied,
      permutation,
      first:byNumber.get(1),
      second:byNumber.get(2),
      courtesy:byNumber.get(template.N-1),
      last:byNumber.get(template.N)
    };
  }

  function targetPositions(e,k){
    if(k===2)return new Set([e.first,e.last]);
    if(k===3)return new Set([e.first,e.courtesy,e.last]);
    return new Set([e.first,e.second,e.courtesy,e.last]);
  }

  function hitAny(picks,set){
    return picks.some(p=>set.has(p));
  }

  function expectedTop2(N,k,pickCount=2){
    const m=Math.min(pickCount,N);
    if(m<=0||k<=0)return 0;
    if(m===1)return k/N;
    if(N<2)return 1;
    const non=Math.max(0,N-k);
    return 1-(non*(non-1))/(N*(N-1));
  }

  function metricBox(){
    return {
      events:0,
      hit2:0,hit3:0,hit4:0,
      exp2:0,exp3:0,exp4:0,
      losing:0,maxLosing:0
    };
  }

  function metricSlices(){
    return {
      all:metricBox(),
      morning:metricBox(),
      afternoon:metricBox(),
      signal_eligible:metricBox()
    };
  }

  function observeMetric(m,picks,e){
    m.events++;
    const h2=hitAny(picks,targetPositions(e,2));
    const h3=hitAny(picks,targetPositions(e,3));
    const h4=hitAny(picks,targetPositions(e,4));
    if(h2){m.hit2++;m.losing=0}else{m.losing++;m.maxLosing=Math.max(m.maxLosing,m.losing)}
    if(h3)m.hit3++;
    if(h4)m.hit4++;
    m.exp2+=expectedTop2(e.N,2,picks.length);
    m.exp3+=expectedTop2(e.N,3,picks.length);
    m.exp4+=expectedTop2(e.N,4,picks.length);
  }

  function observeSlices(slices,picks,e,template,signal){
    observeMetric(slices.all,picks,e);
    if(template.period==='manha')observeMetric(slices.morning,picks,e);
    if(template.period==='tarde')observeMetric(slices.afternoon,picks,e);
    const eligible=(!signal||signal.type==='null')?true:signalApplies(template,signal);
    if(eligible)observeMetric(slices.signal_eligible,picks,e);
  }

  function summarizeRows(rows){
    const sum=k=>rows.reduce((s,r)=>s+r[k],0);
    const totalEvents=sum('events');
    const hit2=sum('hit2'),hit3=sum('hit3'),hit4=sum('hit4');
    const exp2=sum('exp2'),exp3=sum('exp3'),exp4=sum('exp4');
    const lifts2=rows.filter(r=>r.exp2>0).map(r=>r.hit2/r.exp2);
    return {
      events:totalEvents,
      hit_rate_2x:totalEvents?hit2/totalEvents:0,
      hit_rate_3x:totalEvents?hit3/totalEvents:0,
      hit_rate_4x:totalEvents?hit4/totalEvents:0,
      expected_rate_2x:totalEvents?exp2/totalEvents:0,
      expected_rate_3x:totalEvents?exp3/totalEvents:0,
      expected_rate_4x:totalEvents?exp4/totalEvents:0,
      oe_2x:exp2?hit2/exp2:0,
      oe_3x:exp3?hit3/exp3:0,
      oe_4x:exp4?hit4/exp4:0,
      max_losing_p95:pct(rows.map(r=>r.maxLosing),.95),
      oe_2x_p05:pct(lifts2,.05),
      oe_2x_p95:pct(lifts2,.95)
    };
  }

  function pct(values,p){
    if(!values.length)return 0;
    const a=[...values].sort((x,y)=>x-y);
    const idx=Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)));
    return a[idx];
  }

  function runUniverse(realEvents,templates,eventsCount,seed,fixed,signal,onProgress){
    const rng=mulberry32(seed);
    const stats=seedStats(realEvents);
    const metrics={
      context_raw:metricSlices(),
      period_raw:metricSlices(),
      global_raw:metricSlices(),
      random_baseline:metricSlices(),
      fixed_baseline:metricSlices()
    };

    for(let i=0;i<eventsCount;i++){
      const template=templates[Math.floor(rng()*templates.length)];
      const picks={
        context_raw:chooseContextual(stats,template),
        period_raw:choosePeriod(stats,template),
        global_raw:chooseGlobal(stats,template),
        random_baseline:chooseRandom(template,rng),
        fixed_baseline:chooseFixed(template,fixed)
      };

      const e=simulateEvent(template,rng,i+1,signal);
      for(const id of Object.keys(metrics))observeSlices(metrics[id],picks[id],e,template,signal);
      updateStats(stats,e);
      if(typeof onProgress==='function'&&(i===eventsCount-1||i%250===0))onProgress(i+1,eventsCount);
    }
    return metrics;
  }

  function aggregate(universeResults,eventsPerUniverse,years,seed,templatesCount,signal){
    const ids=Object.keys(universeResults[0]||{});
    const models={};
    const universe_oe_2x={};

    for(const id of ids){
      const slices={};
      for(const key of ['all','morning','afternoon','signal_eligible']){
        slices[key]=summarizeRows(universeResults.map(u=>u[id][key]));
      }
      models[id]={
        id,
        universes:universeResults.length,
        ...slices.all,
        slices
      };
      universe_oe_2x[id]=universeResults.map(u=>{
        const r=u[id].signal_eligible;
        return r.exp2?r.hit2/r.exp2:null;
      });
    }

    function paired(a,b){
      const deltas=[];
      let aWins=0,bWins=0,ties=0;
      for(let i=0;i<universeResults.length;i++){
        const ar=universeResults[i][a].signal_eligible;
        const br=universeResults[i][b].signal_eligible;
        if(!ar.exp2||!br.exp2)continue;
        const aoe=ar.hit2/ar.exp2,boe=br.hit2/br.exp2,d=aoe-boe;
        deltas.push(d);
        if(Math.abs(d)<1e-12)ties++;
        else if(d>0)aWins++;
        else bWins++;
      }
      return {
        slice:'signal_eligible',
        metric:'oe_2x',
        universes:deltas.length,
        model_a:a,
        model_b:b,
        a_wins:aWins,
        b_wins:bWins,
        ties,
        a_win_rate:deltas.length?aWins/deltas.length:0,
        mean_delta:deltas.length?deltas.reduce((s,v)=>s+v,0)/deltas.length:0,
        delta_p05:pct(deltas,.05),
        delta_p50:pct(deltas,.50),
        delta_p95:pct(deltas,.95)
      };
    }

    return {
      version:'RLT-M4-04-v1',
      mode:signal&&signal.type!=='null'?'HISTORICAL_SEEDED_SIGNAL_INJECTION':'HISTORICAL_SEEDED_NULL_STRUCTURAL_BOOTSTRAP',
      signal:signal||{type:'null',strength:0,position:null},
      evaluation_slices:['all','morning','afternoon','signal_eligible'],
      seed:String(seed),
      universes:universeResults.length,
      years,
      events_per_universe:eventsPerUniverse,
      total_synthetic_events:eventsPerUniverse*universeResults.length,
      structural_templates:templatesCount,
      models,
      paired_comparisons:{
        period_vs_global:paired('period_raw','global_raw'),
        period_vs_context:paired('period_raw','context_raw'),
        context_vs_global:paired('context_raw','global_raw')
      },
      universe_oe_2x_signal_eligible:universe_oe_2x
    };
  }

  function run(config){
    const realEvents=(config.realEvents||[]).filter(e=>{
      const occupied=[...new Set((e.occupied||[]).filter(Number.isFinite))];
      return Number.isFinite(e.N)&&e.N>=4&&occupied.length===e.N;
    });
    const templates=completeTemplates(realEvents);
    if(!templates.length)throw new Error('Nenhuma roleta completa disponível para bootstrap estrutural.');
    const universes=Math.max(1,Math.min(5000,Number(config.universes)||100));
    const years=Math.max(1,Math.min(50,Number(config.years)||10));
    const eventsPerYear=Math.max(1,Number(config.eventsPerYear)||624);
    const eventsPerUniverse=years*eventsPerYear;
    const seedText=config.seed||'roleta-2026';
    const baseSeed=hashSeed(seedText);
    const fixed=fixedLeaders(realEvents);
    const signal=config.signal||{type:'null',strength:0,position:null};
    const results=[];
    const totalEvents=universes*eventsPerUniverse;
    for(let u=0;u<universes;u++){
      results.push(runUniverse(
        realEvents,templates,eventsPerUniverse,
        (baseSeed+Math.imul(u+1,2654435761))>>>0,
        fixed,signal,
        (within,totalWithin)=>{
          if(typeof config.onProgress!=='function')return;
          const processed=u*eventsPerUniverse+within;
          config.onProgress({
            processed_events:processed,
            total_events:totalEvents,
            completed_universes:u+(within===totalWithin?1:0),
            total_universes:universes,
            pct:totalEvents?processed/totalEvents:0
          });
        }
      ));
    }
    return aggregate(results,eventsPerUniverse,years,seedText,templates.length,signal);
  }

  function selfTest(realEvents){
    const templates=completeTemplates(realEvents||[]);
    if(!templates.length)return {pass:false,checks:0,error:'Nenhum molde completo.'};
    const rng=mulberry32(hashSeed('self-test'));
    let checks=0;
    for(let i=0;i<Math.min(50,templates.length*2);i++){
      const t=templates[i%templates.length];
      const e=simulateEvent(t,rng,i+1);
      const sorted=[...e.permutation].sort((a,b)=>a-b);
      if(sorted.length!==t.N||sorted.some((v,idx)=>v!==idx+1))return {pass:false,checks,error:'Permutação inválida.'};
      if(e.occupied.length!==t.N||e.occupied.some((p,idx)=>p!==t.occupied[idx]))return {pass:false,checks,error:'Estrutura/gaps alterados.'};
      const eligible=new Set(e.occupied);
      if(![e.first,e.second,e.courtesy,e.last].every(p=>eligible.has(p)))return {pass:false,checks,error:'Resultado aponta para posição não elegível.'};
      checks++;
    }
    return {pass:true,checks,error:null};
  }

  global.RoletaSimulationEngine={run,simulateEvent,completeTemplates,hashSeed,selfTest};
})(globalThis);
