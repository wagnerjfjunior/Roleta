'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makePrediction,makeOutcome,verifyChain,verifyRecord}=require('../../simulation/prospective-ledger.cjs');
const seed='a'.repeat(64);
const base={event_id:'2026-10-12-M',captured_at:'2026-10-12T11:30:00Z',policy:'WEEKLY_FROZEN',algorithm_version:'f2-11-test',input_sha256:seed,N:4,occupied_snapshot:[1,2,3,4],candidates:[1,2]};
test('F2-11 deterministic evidence hash and tamper detection',()=>{
 const a=makePrediction(base),b=makePrediction(base);
 assert.deepEqual(a,b);
 assert.equal(verifyRecord(a),true);
 assert.equal(verifyRecord({...a,candidates:[2,1]}),false);
 assert.equal(verifyChain([a]),true);
});
test('F2-11 rejects ineligible prediction and inconsistent N',()=>{
 assert.throws(()=>makePrediction({...base,candidates:[9]}),/not eligible/);
 assert.throws(()=>makePrediction({...base,N:5}),/N mismatch/);
});
test('F2-11 outcome requires earlier prediction and human validation',()=>{
 const a=makePrediction(base);
 const outcome={event_id:base.event_id,captured_at:'2026-10-12T12:00:00Z',first:1,last:4,occupied:[1,2,3,4],validated_by:'human-review'};
 const o=makeOutcome(outcome,{prevHash:a.record_sha256,predictions:[a]});
 assert.equal(verifyChain([a,o]),true);
 assert.throws(()=>makeOutcome({...outcome,captured_at:'2026-10-12T11:00:00Z'},{prevHash:a.record_sha256,predictions:[a]}),/not prior/);
 assert.throws(()=>makeOutcome({...outcome,validated_by:''},{prevHash:a.record_sha256,predictions:[a]}),/human validation/);
 assert.equal(verifyChain([a,{...o,first:2}]),false);
});
test('F2-11 refuses duplicate policy prediction or broken chain',()=>{
 const a=makePrediction(base),duplicate=makePrediction(base,{prevHash:a.record_sha256});
 assert.equal(verifyChain([a,duplicate]),false);
 assert.equal(verifyChain([duplicate]),false);
});
