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
