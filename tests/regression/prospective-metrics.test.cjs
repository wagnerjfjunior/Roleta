'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makePrediction,makeOutcome}=require('../../simulation/prospective-ledger.cjs');
const {summarize}=require('../../simulation/prospective-metrics.cjs');
const base={event_id:'test-1',captured_at:'2026-10-12T10:00:00Z',algorithm_version:'test',input_sha256:'b'.repeat(64),N:4,occupied_snapshot:[1,2,3,4]};
test('F2-12 paired metrics only include pre-recorded eligible predictions',()=>{
 const w=makePrediction({...base,policy:'WEEKLY_FROZEN',candidates:[1]});
 const c=makePrediction({...base,policy:'CURRENT_SHADOW',candidates:[2]},{prevHash:w.record_sha256});
 const o=makeOutcome({event_id:'test-1',captured_at:'2026-10-12T11:00:00Z',first:2,last:4,occupied:[1,2,3,4],validated_by:'reviewer'},{prevHash:c.record_sha256,predictions:[w,c]});
 const s=summarize([w,c,o]);
 assert.equal(s.paired_count,1);assert.equal(s.paired_delta_hits,1);
 assert.equal(s.by_policy.WEEKLY_FROZEN.hits,0);
 assert.equal(s.by_policy.CURRENT_SHADOW.hits,1);
 assert.equal(s.by_policy.CURRENT_SHADOW.expected,0.5);
 assert.throws(()=>summarize([w,c,{...o,first:1}]),/Invalid prospective/);
});
