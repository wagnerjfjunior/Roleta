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
