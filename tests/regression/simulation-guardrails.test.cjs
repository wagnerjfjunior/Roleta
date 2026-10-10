'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
require(path.join(root,'domain/core.js'));
require(path.join(root,'simulation/engine.js'));
require(path.join(root,'simulation/weekly-duel.js'));
const sim=globalThis.RoletaSimulationEngine;
const weekly=globalThis.RoletaWeeklyDuel;
const events=Array.from({length:9},(_,i)=>{
 const N=10,occupied=Array.from({length:N},(_,j)=>j+1);
 return {id:'fixture-'+i,date:'2026-01-'+String(i+1).padStart(2,'0'),
 period:['manha','tarde','integral'][i%3],N,occupied,
 first:i+1,second:(i+1)%N+1,courtesy:(i+3)%N+1,last:(i+5)%N+1,quality:'A'};
});
const simulationConfig={realEvents:events,universes:2,years:1,eventsPerYear:24,seed:'regression-v1',signal:{type:'null',strength:0}};
const weeklyConfig={realEvents:events,weeks:20,scenario:'null',seed:'regression-v1',signalStrength:0};
test('simulation engine self-test: permutation and physical gaps',()=>assert.equal(sim.selfTest(events).pass,true));
test('simulation engine: identical inputs and seed produce identical results',()=>{
 const first=sim.run(simulationConfig),second=sim.run(simulationConfig);
 assert.deepEqual(first,second);
 assert.equal(first.total_synthetic_events,48);
});
test('weekly duel: self-test passes',()=>assert.equal(weekly.selfTest(events).pass,true));
test('weekly duel: deterministic, paired-valid opportunities and expected values',()=>{
 const first=weekly.run(weeklyConfig),second=weekly.run(weeklyConfig);
 assert.deepEqual(first,second);
 assert.equal(first.total_synthetic_events,240);
 assert.equal(first.paired_valid.weekly.opportunities,first.paired_valid.current.opportunities);
 assert.ok(Math.abs(first.paired_valid.weekly.expected-first.paired_valid.current.expected)<1e-9);
});
test('canonical manifest: source files exist and declared event count is consistent',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/manifest.json'),'utf8'));
 assert.ok(Number.isInteger(manifest.canonical_event_count)&&manifest.canonical_event_count>0);
 assert.ok(Array.isArray(manifest.sources)&&manifest.sources.length>0);
 const total=manifest.sources.reduce((sum,s)=>{
  assert.ok(fs.existsSync(path.join(root,s.path.startsWith('/')?s.path.slice(1):s.path)),'Missing source: '+s.path);
  assert.ok(Number.isInteger(s.events)&&s.events>=0);
  return sum+s.events;
 },0);
 assert.equal(total,manifest.canonical_event_count,'Declared source counts changed; reconcile manifest before merging');
});

test('simulation audit metadata does not hardcode obsolete canonical counts',()=>{
 for(const filename of ['simulation/ui.js','simulation/weekly-duel-ui.js']){
  const source=fs.readFileSync(path.join(root,filename),'utf8');
  assert.doesNotMatch(source,/structural_source:\s*['"`]\d+ eventos canônicos/,'Stale structural source in '+filename);
  assert.match(source,/structural_source:/,'Missing provenance metadata in '+filename);
 }
});

test('weekly duel: paired bootstrap is deterministic and does not modify legacy metrics',()=>{
 const first=weekly.run(weeklyConfig);
 const second=weekly.run(weeklyConfig);
 const b=first.paired_valid.bootstrap_delta_hits;
 assert.deepEqual(b,second.paired_valid.bootstrap_delta_hits);
 assert.equal(b.replicates,1000);
 assert.equal(b.unit,'synthetic_week');
 assert.equal(b.confidence_level,0.95);
 assert.ok(b.ci95_low<=b.ci95_high);
 assert.equal(b.mean,first.paired_valid.mean_delta_hits);
 assert.equal(first.paired_valid.weekly.opportunities,first.paired_valid.current.opportunities);
 const other=weekly.run({...weeklyConfig,seed:'regression-v2'});
 assert.equal(other.paired_valid.bootstrap_delta_hits.replicates,1000);
});

test('weekly duel multiseed: deterministic, distinct seeds, aggregate integrity',()=>{
 const config={...weeklyConfig,weeks:5,seed:'multiseed-regression',seedCount:3};
 const a=weekly.runMultiseed(config);
 const b=weekly.runMultiseed(config);
 assert.deepEqual(a,b);
 assert.equal(a.seed_count,3);
 assert.equal(new Set(a.runs.map(r=>r.seed)).size,3);
 assert.equal(a.total_synthetic_events,3*5*12);
 const deltas=a.runs.map(r=>r.paired_valid.mean_delta_hits);
 assert.ok(Math.abs(a.mean_delta_hits_across_seeds-deltas.reduce((s,x)=>s+x,0)/3)<1e-12);
 for(const r of a.runs)assert.equal(r.paired_valid.weekly.opportunities,r.paired_valid.current.opportunities);
 assert.throws(()=>weekly.runMultiseed({...config,seedCount:1}),/seedCount/);
});

test('simulation workers preload domain core before importing engines',()=>{
 for(const filename of ['simulation/worker.js','simulation/weekly-duel-worker.js']){
  const source=fs.readFileSync(path.join(root,filename),'utf8');
  const domain=source.indexOf("importScripts('/domain/core.js')");
  const engine=source.indexOf("importScripts('/simulation/");
  assert.ok(domain>=0&&engine>domain,filename+' must load domain/core.js first');
 }
});

test('weekly duel F2-03 observed multiseed golden: immutable arithmetic and bootstrap sanity',()=>{
 const golden=JSON.parse(fs.readFileSync(path.join(root,'tests/golden/weekly-duel-multiseed-null-20261010.json'),'utf8'));
 const {expected:e,provenance:p}=golden;
 assert.equal(golden.schema,'rlt-weekly-duel-multiseed-golden-v1');
 assert.equal(e.runs.length,p.seed_count);
 assert.equal(e.total_synthetic_events,p.seed_count*p.weeks_per_seed*12);
 assert.equal(new Set(e.runs.map(r=>r.seed)).size,p.seed_count);
 const values=e.runs.map((r,i)=>{
  assert.equal(r.seed,p.seed_prefix+'|replicate-'+String(i+1).padStart(2,'0'));
  assert.ok(Math.abs((r.current_hits-r.weekly_hits)-r.mean_delta_hits*p.weeks_per_seed)<1e-9);
  assert.ok(r.paired_opportunities>0&&r.paired_opportunities<=p.weeks_per_seed*12*4);
  assert.ok(r.bootstrap_ci95_low<=r.mean_delta_hits&&r.mean_delta_hits<=r.bootstrap_ci95_high);
  assert.ok(r.operational_delta_valid_opportunities>=0);
  return r.mean_delta_hits;
 });
 const mean=values.reduce((a,b)=>a+b,0)/values.length;
 const sd=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/(values.length-1));
 assert.ok(Math.abs(mean-e.mean_delta_hits_across_seeds)<1e-12);
 assert.ok(Math.abs(sd-e.sd_delta_hits_across_seeds)<1e-12);
 assert.equal(values.filter(v=>v>0).length,e.seeds_with_positive_delta);
});

test('F2-03 weekly duel export captures ordered input SHA-256 and full run configuration',()=>{
 const source=fs.readFileSync(path.join(root,'simulation/weekly-duel-ui.js'),'utf8');
 assert.match(source,/crypto\.subtle\.digest\('SHA-256',bytes\)/);
 assert.match(source,/ordered_engine_input_sha256:sha256/);
 assert.match(source,/real_events_count:events\.length/);
 assert.match(source,/input_provenance:provenance/);
 assert.match(source,/worker\.postMessage\(\{type:multiseed\?'multiseed':'run',config\}\)/);
 assert.match(source,/serialization:'JSON\.stringify ordered selected engine fields'/);
});

for(const scenario of ['stable_period','regime_shift','weak_noise']){
 test('F2-04 scenario '+scenario+': deterministic paired integrity and no policy mutation',()=>{
  const config={...weeklyConfig,weeks:40,scenario,signalStrength:0.05,seed:'F2-04-'+scenario};
  const first=weekly.run(config),second=weekly.run(config);
  assert.deepEqual(first,second);
  assert.equal(first.scenario,scenario);
  assert.equal(first.signal_strength,0.05);
  assert.equal(first.total_synthetic_events,480);
  assert.equal(first.policy,'PROSPECTIVE-V1.0.0 / RLT-M5-WEEKLY-V1');
  assert.equal(first.paired_valid.weekly.opportunities,first.paired_valid.current.opportunities);
  assert.ok(Math.abs(first.paired_valid.weekly.expected-first.paired_valid.current.expected)<1e-9);
  assert.equal(first.paired_valid.current_wins+first.paired_valid.weekly_wins+first.paired_valid.ties,40);
  assert.equal(first.updates.helped+first.updates.hurt+first.updates.neutral,first.updates.churn);
  assert.equal(first.operational.delta_valid_opportunities,first.operational.current_valid_opportunities-first.operational.weekly_valid_opportunities);
  assert.equal(first.paired_valid.bootstrap_delta_hits.replicates,1000);
  assert.ok(first.paired_valid.bootstrap_delta_hits.ci95_low<=first.paired_valid.bootstrap_delta_hits.ci95_high);
 });
}

test('F2-05 multiseed control re-enables after success, worker error and onerror',()=>{
 const source=fs.readFileSync(path.join(root,'simulation/weekly-duel-ui.js'),'utf8');
 assert.match(source,/status\.textContent='Concluído[\s\S]*?multiBtn\.disabled=false;cancelBtn\.disabled=true;/);
 assert.match(source,/status\.textContent='Erro: '\+msg\.message;[\s\S]*?multiBtn\.disabled=false;cancelBtn\.disabled=true;/);
 assert.match(source,/status\.textContent='Erro no worker: '\+e\.message;[\s\S]*?multiBtn\.disabled=false;cancelBtn\.disabled=true;/);
});

test('F2-06 new simulation clears stale statistics and protects audit export',()=>{
 const source=fs.readFileSync(path.join(root,'simulation/weekly-duel-ui.js'),'utf8');
 assert.match(source,/function clearDisplayedStatistics\(/);
 assert.match(source,/clearDisplayedStatistics\('Preparando nova simulação…'\)/);
 assert.match(source,/if\(exportBtn\)exportBtn\.disabled=true;\s*clearDisplayedStatistics/);
 assert.match(source,/if\(worker\)return; \/\/ Impede execuções concorrentes/);
 assert.match(source,/runBtn\.disabled=true;multiBtn\.disabled=true;cancelBtn\.disabled=true;/);
 assert.match(source,/clearDisplayedStatistics\('Simulação cancelada; nenhum resultado atual\.'\)/);
 assert.match(source,/Estatísticas anteriores ocultadas; histórico auditável preservado/);
});

for(const anchor of ['weekly','current','exogenous']){
 test('F2-07 signal anchor '+anchor+': deterministic, paired and legacy-safe',()=>{
  const config={...weeklyConfig,weeks:30,scenario:'weak_noise',signalStrength:0.05,seed:'F2-07-'+anchor,signalAnchor:anchor};
  const a=weekly.run(config),b=weekly.run(config);
  assert.deepEqual(a,b);
  assert.equal(a.paired_valid.weekly.opportunities,a.paired_valid.current.opportunities);
  assert.ok(Math.abs(a.paired_valid.weekly.expected-a.paired_valid.current.expected)<1e-9);
  assert.equal(a.paired_valid.current_wins+a.paired_valid.weekly_wins+a.paired_valid.ties,30);
  if(anchor==='weekly'){
   const legacy=weekly.run({...config,signalAnchor:undefined});
   assert.deepEqual(a,legacy);
  }else assert.equal(a.signal_anchor,anchor);
 });
}
test('F2-07 invalid signal anchor rejected',()=>{
 assert.throws(()=>weekly.run({...weeklyConfig,signalAnchor:'unknown'}),/Invalid signalAnchor/);
});

test('F2-07 UI exposes three audited anchors and checks worker provenance',()=>{
 const source=fs.readFileSync(path.join(root,'simulation/weekly-duel-ui.js'),'utf8');
 assert.match(source,/id=\\"weeklyDuelAnchor\\"/);
 assert.match(source,/value=\\"weekly\\"/);
 assert.match(source,/value=\\"exogenous\\"/);
 assert.match(source,/value=\\"current\\"/);
 assert.match(source,/signalAnchor:config.signalAnchor/);
 assert.match(source,/const sameAnchor=\(result.signal_anchor\|\|'weekly'\)===testDefinition.scenario.signal_anchor/);
 assert.match(source,/!sameScenario\|\|!sameStrength\|\|!sameAnchor/);
});
