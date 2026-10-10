'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit,evaluate,dateKey,weekKey}=require('../../simulation/historical-walk-forward.cjs');
function event(i){
 const d=new Date(Date.UTC(2026,0,5+i));const date=String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear();
 return {id:'E'+i,date,period:'manha',N:6,occupied:[1,2,3,4,5,6],first:(i%6)+1,last:((i+3)%6)+1};
}
test('F2-09 rejects impossible dates and resolves Monday week start',()=>{
 assert.equal(dateKey('31/02/2026'),null);
 assert.equal(dateKey('05/01/2026'),'2026-01-05');
 assert.equal(weekKey('2026-01-11'),'2026-01-05');
});
test('F2-09 quarantines duplicate IDs and ambiguous date-period slots',()=>{
 const a=event(0),b={...event(1),date:a.date},c={...event(2),id:a.id};
 const x=audit([a,b,c]);
 assert.equal(x.eligible.length,0);
 assert.equal(x.excluded.length,3);
 assert.equal(x.ambiguous.length,2);
});
test('F2-09 future modifications cannot alter earlier recommendations',()=>{
 const original=Array.from({length:35},(_,i)=>event(i));
 const a=evaluate(original,{minTrain:5});
 const changed=original.map((e,i)=>i>25?{...e,first:e.last,last:e.first}:e);
 const b=evaluate(changed,{minTrain:5});
 const earlier=x=>x.observations.filter(o=>o.date<'2026-01-30');
 assert.deepEqual(earlier(a),earlier(b));
 assert.ok(a.summary.evaluated>0);
 for(const row of a.observations){
  assert.ok(row.training.weekly.every(id=>original.find(e=>e.id===id).date.split('/').reverse().join('-')<row.week));
  assert.ok(row.training.current.every(id=>original.find(e=>e.id===id).date.split('/').reverse().join('-')<row.date));
 }
});
test('F2-09 event own occupied positions do not change precomputed ranking',()=>{
 const original=Array.from({length:35},(_,i)=>event(i));
 const altered=original.map((e,i)=>i===30?{...e,occupied:[2,3,4,5,6,7],N:6,first:2,last:7}:e);
 const a=evaluate(original,{minTrain:5}).observations.find(x=>x.id==='E30');
 const b=evaluate(altered,{minTrain:5}).observations.find(x=>x.id==='E30');
 assert.deepEqual(a.plans.weekly.candidates,b.plans.weekly.candidates);
 assert.deepEqual(a.plans.current.candidates,b.plans.current.candidates);
});
test('F2-09 no valid forward evidence with insufficient training',()=>{
 const a=evaluate([event(0)],{minTrain:12});
 assert.equal(a.summary.evaluated,0);
 assert.deepEqual(a.warmup,['E0']);
 assert.equal(a.mode,'retrospective_backtest_not_live_prospective');
});
