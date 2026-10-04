(function(global){
  'use strict';

  function hashSeed(input){
    let h=2166136261>>>0;
    for(const ch of String(input??'roleta-weekly-duel')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
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
    for(let i=n-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  function completeTemplates(events){
    return (events||[]).filter(e=>{
      const occupied=[...new Set((e.occupied||[]).filter(Number.isFinite))];
      return Number.isFinite(e.N)&&e.N>=4&&occupied.length===e.N;
    }).map(e=>({N:e.N,period:e.period||'desconhecido',occupied:[...new Set(e.occupied)].sort((a,b)=>a-b)}));
  }
  function createStats(){return {global:new Map(),periods:new Map()}}
  function statFor(map,pos){if(!map.has(pos))map.set(pos,{exp:0,hits:0,expected:0});return map.get(pos)}
  function updateStats(stats,e){
    const period=e.period||'desconhecido';
    if(!stats.periods.has(period))stats.periods.set(period,new Map());
    const pm=stats.periods.get(period);
    for(const pos of e.occupied){
      const hit=(e.first===pos||e.last===pos)?1:0;
      const expected=Math.min(1,2/e.N);
      const g=statFor(stats.global,pos);g.exp++;g.hits+=hit;g.expected+=expected;
      const p=statFor(pm,pos);p.exp++;p.hits+=hit;p.expected+=expected;
    }
  }
  function seedStats(events){const s=createStats();for(const e of events)updateStats(s,e);return s}
  function ranked(map,minExp=3){
    return [...map.entries()].map(([pos,r])=>({
      pos,exp:r.exp,hits:r.hits,expected:r.expected,
      oe:r.expected?r.hits/r.expected:0,excess:r.hits-r.expected
    })).filter(x=>x.exp>=minExp)
      .sort((a,b)=>b.excess-a.excess||b.hits-a.hits||b.oe-a.oe||b.exp-a.exp||a.pos-b.pos);
  }
  function periodRanking(stats,period){
    const rows=ranked(stats.periods.get(period)||new Map());
    return rows.length>=6?{source:'period_raw',rows}:{source:'global_fallback',rows:ranked(stats.global)};
  }
  const PEOPLE=['Wagner','Laura','Brenda','Helena'];
  const WEEK_PATTERN=['manha','tarde','manha','tarde','manha','tarde','manha','tarde','manha','tarde','integral','integral'];

  function makePlan(stats){
    const plan={};
    for(const period of ['manha','tarde','integral']){
      const rk=periodRanking(stats,period), pos=rk.rows.map(x=>x.pos);
      plan[period]=PEOPLE.map((person,i)=>({
        person,primary:pos[i]??null,
        fallbacks:pos.filter(p=>p!==pos[i]).slice(0,2),
        ranking_source:rk.source
      }));
    }
    return plan;
  }
  function resolvePick(rec,occupied){
    if(!rec)return null;
    const set=new Set(occupied);
    for(const p of [rec.primary,...(rec.fallbacks||[])])if(Number.isFinite(p)&&set.has(p))return p;
    return null;
  }
  function scenarioTarget(period,eventIndex,plan,scenario,rng){
    const base=(plan[period]||[])[0]?.primary;
    const alt=(plan[period]||[])[1]?.primary;
    if(scenario==='null')return null;
    if(scenario==='stable_period')return base;
    if(scenario==='regime_shift')return eventIndex<6?base:alt;
    if(scenario==='weak_noise'){
      const options=(plan[period]||[]).map(x=>x.primary).filter(Number.isFinite);
      return options.length?options[Math.floor(rng()*options.length)]:null;
    }
    return null;
  }
  function simulateEvent(template,rng,eventIndex,scenario,weeklyPlan,strength){
    const occupied=[...template.occupied].sort((a,b)=>a-b);
    const permutation=shuffle(template.N,rng);
    const target=scenarioTarget(template.period,eventIndex,weeklyPlan,scenario,rng);
    const applies=Number.isFinite(target)&&occupied.includes(target)&&rng()<strength;
    if(applies){
      const ti=occupied.indexOf(target), desired=rng()<.5?1:template.N, di=permutation.indexOf(desired);
      [permutation[ti],permutation[di]]=[permutation[di],permutation[ti]];
    }
    const byNumber=new Map();
    for(let i=0;i<occupied.length;i++)byNumber.set(permutation[i],occupied[i]);
    return {
      id:'WEEK-E'+eventIndex,period:template.period,N:template.N,occupied,
      first:byNumber.get(1),last:byNumber.get(template.N),
      injected:applies,target
    };
  }
  function metric(){return {opportunities:0,hits:0,expected:0,invalid:0}}
  function observe(m,pick,e){
    if(!Number.isFinite(pick)){m.invalid++;return false}
    m.opportunities++;m.expected+=2/e.N;
    const h=e.first===pick||e.last===pick;if(h)m.hits++;return h;
  }
  function summarize(m){return {...m,oe:m.expected?m.hits/m.expected:0,hit_rate:m.opportunities?m.hits/m.opportunities:0}}
  function pct(values,p){
    if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y);
    return a[Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)))];
  }

  function runWeek(seedEvents,templates,rng,scenario,strength){
    const stats=seedStats(seedEvents);
    const weeklyPlan=makePlan(stats);
    const weekly=metric(),current=metric(),random=metric();
    let churn=0,helped=0,hurt=0,neutral=0;
    let currentPlan=makePlan(stats);
    const previousCurrent={};

    for(let i=0;i<WEEK_PATTERN.length;i++){
      const period=WEEK_PATTERN[i];
      const pool=templates.filter(t=>t.period===period);
      if(!pool.length)throw new Error('Sem molde estrutural para período '+period);
      const template=pool[Math.floor(rng()*pool.length)];

      const weeklyRecs=weeklyPlan[period];
      const currentRecs=currentPlan[period];

      const randomPositions=[...template.occupied];
      for(let j=randomPositions.length-1;j>0;j--){const k=Math.floor(rng()*(j+1));[randomPositions[j],randomPositions[k]]=[randomPositions[k],randomPositions[j]]}

      const e=simulateEvent(template,rng,i,scenario,weeklyPlan,strength);

      for(let pi=0;pi<PEOPLE.length;pi++){
        const wp=resolvePick(weeklyRecs[pi],e.occupied);
        const cp=resolvePick(currentRecs[pi],e.occupied);
        const rp=randomPositions[pi]??null;
        const wh=observe(weekly,wp,e), ch=observe(current,cp,e);observe(random,rp,e);

        const key=period+'|'+PEOPLE[pi];
        const prev=previousCurrent[key];
        if(Number.isFinite(prev)&&Number.isFinite(cp)&&prev!==cp){
          churn++;
          if(ch&&!wh)helped++;
          else if(wh&&!ch)hurt++;
          else neutral++;
        }
        previousCurrent[key]=cp;
      }

      updateStats(stats,e);
      currentPlan=makePlan(stats);
    }

    return {
      weekly:summarize(weekly),current:summarize(current),random:summarize(random),
      churn,helped,hurt,neutral,
      delta_hits:current.hits-weekly.hits,
      delta_oe:(current.expected?current.hits/current.expected:0)-(weekly.expected?weekly.hits/weekly.expected:0)
    };
  }

  function aggregate(weeks,config,templatesCount){
    const out={};
    for(const id of ['weekly','current','random']){
      const rows=weeks.map(w=>w[id]);
      const opportunities=rows.reduce((s,r)=>s+r.opportunities,0);
      const hits=rows.reduce((s,r)=>s+r.hits,0);
      const expected=rows.reduce((s,r)=>s+r.expected,0);
      const oes=rows.filter(r=>r.expected>0).map(r=>r.hits/r.expected);
      out[id]={
        opportunities,hits,expected,
        hit_rate:opportunities?hits/opportunities:0,
        oe:expected?hits/expected:0,
        oe_p05:pct(oes,.05),oe_p50:pct(oes,.5),oe_p95:pct(oes,.95),
        invalid:rows.reduce((s,r)=>s+r.invalid,0)
      };
    }
    let currentWins=0,weeklyWins=0,ties=0;
    for(const w of weeks){
      if(w.delta_hits>0)currentWins++;
      else if(w.delta_hits<0)weeklyWins++;
      else ties++;
    }
    const deltas=weeks.map(w=>w.delta_hits);
    return {
      version:'RLT-M4-07-v1',
      experiment:'WEEKLY_FROZEN_VS_CURRENT',
      policy:'PROSPECTIVE-V1.0.0 / RLT-M5-WEEKLY-V1',
      scenario:config.scenario,
      signal_strength:config.signalStrength,
      seed:config.seed,
      weeks:weeks.length,
      events_per_week:12,
      people_per_event:4,
      total_synthetic_events:weeks.length*12,
      total_person_opportunities_planned:weeks.length*12*4,
      structural_templates:templatesCount,
      strategies:out,
      paired:{
        current_wins:currentWins,weekly_wins:weeklyWins,ties,
        current_win_rate:weeks.length?currentWins/weeks.length:0,
        weekly_win_rate:weeks.length?weeklyWins/weeks.length:0,
        mean_delta_hits:deltas.reduce((s,x)=>s+x,0)/Math.max(1,deltas.length),
        delta_hits_p05:pct(deltas,.05),delta_hits_p50:pct(deltas,.5),delta_hits_p95:pct(deltas,.95)
      },
      updates:{
        churn:weeks.reduce((s,w)=>s+w.churn,0),
        helped:weeks.reduce((s,w)=>s+w.helped,0),
        hurt:weeks.reduce((s,w)=>s+w.hurt,0),
        neutral:weeks.reduce((s,w)=>s+w.neutral,0)
      },
      interpretation_guard:'Simulation validates policy behavior, not real predictive edge. The live week remains frozen and is not altered by this result.'
    };
  }

  function run(config){
    const realEvents=(config.realEvents||[]).filter(e=>Number.isFinite(e.N)&&e.N>=4&&Array.isArray(e.occupied)&&new Set(e.occupied).size===e.N);
    const templates=completeTemplates(realEvents);
    if(!templates.length)throw new Error('Nenhum molde completo.');
    for(const p of ['manha','tarde','integral'])if(!templates.some(t=>t.period===p))throw new Error('Sem molde '+p);
    const weeks=Math.max(1,Math.min(100000,Number(config.weeks)||10000));
    const scenario=config.scenario||'null';
    const strength=Math.max(0,Math.min(.25,Number(config.signalStrength) || (scenario==='weak_noise'?.01:.03)));
    const seed=config.seed||'weekly-duel-2026';
    const base=hashSeed(seed);
    const out=[];
    for(let w=0;w<weeks;w++){
      const rng=mulberry32((base+Math.imul(w+1,2654435761))>>>0);
      out.push(runWeek(realEvents,templates,rng,scenario,strength));
      if(typeof config.onProgress==='function'&&(w===weeks-1||w%100===0))config.onProgress({completed_weeks:w+1,total_weeks:weeks,pct:(w+1)/weeks});
    }
    return aggregate(out,{scenario,signalStrength:strength,seed},templates.length);
  }

  function selfTest(realEvents){
    const r=run({realEvents,weeks:20,scenario:'null',seed:'weekly-duel-self-test',signalStrength:0});
    const planned=20*12*4;
    return {
      pass:r.weeks===20&&r.total_person_opportunities_planned===planned&&r.strategies.weekly.expected>0&&r.strategies.current.expected>0,
      checks:{weeks:r.weeks,planned,weekly_opportunities:r.strategies.weekly.opportunities,current_opportunities:r.strategies.current.opportunities}
    };
  }

  global.RoletaWeeklyDuel={run,selfTest};
})(globalThis);
