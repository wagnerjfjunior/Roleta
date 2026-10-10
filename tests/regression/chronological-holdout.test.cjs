'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chronologicalHoldout}=require('../../simulation/chronological-holdout.cjs');
test('F2-13 split deterministic and strictly time separated',()=>{
 const events=Array.from({length:30},(_,i)=>({id:'E'+i,date:'2026-10-'+String(i+1).padStart(2,'0')}));
 const a=chronologicalHoldout(events,{minTrain:10}),b=chronologicalHoldout([...events].reverse(),{minTrain:10});
 assert.deepEqual(a,b);
 assert.ok(a.train.every(x=>x.date<a.cutoff));
 assert.ok(a.holdout.every(x=>x.date>=a.cutoff));
});
test('F2-13 same-day observations never cross cutoff',()=>{
 const events=Array.from({length:30},(_,i)=>({id:'E'+i,date:'2026-10-'+String(Math.floor(i/2)+1).padStart(2,'0')}));
 const r=chronologicalHoldout(events,{minTrain:10});
 assert.ok(r.train.every(x=>x.date<r.cutoff));
 assert.ok(r.holdout.every(x=>x.date>=r.cutoff));
});
test('F2-13 insufficient history and duplicate events rejected',()=>{
 assert.throws(()=>chronologicalHoldout([{id:'A',date:'2026-10-01'}],{minTrain:5}),/Insufficient/);
 assert.throws(()=>chronologicalHoldout([{id:'A',date:'2026-10-01'},{id:'A',date:'2026-10-02'}]),/Duplicate/);
});
