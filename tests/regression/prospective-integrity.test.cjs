'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makePrediction,makeOutcome,verifyChain}=require('../../simulation/prospective-ledger.cjs');
const base={event_id:'2026-10-12-M',captured_at:'2026-10-12T10:00:00Z',policy:'WEEKLY_FROZEN',algorithm_version:'test',input_sha256:'a'.repeat(64),N:4,occupied_snapshot:[1,2,3,4],candidates:[1,2]};
const result={event_id:base.event_id,captured_at:'2026-10-12T11:00:00Z',first:1,last:4,occupied:[1,2,3,4],validated_by:'reviewer'};
test('F2-11 reject outcome inconsistent with committed eligible snapshot',()=>{
 const p=makePrediction(base);
 assert.throws(()=>makeOutcome({...result,occupied:[1,2,3,5],last:5},{prevHash:p.record_sha256,predictions:[p]}),/snapshot mismatch/);
});
test('F2-11 reject duplicate outcomes and post-outcome predictions',()=>{
 const p=makePrediction(base);
 const o=makeOutcome(result,{prevHash:p.record_sha256,predictions:[p]});
 const duplicate=makeOutcome({...result,captured_at:'2026-10-12T12:00:00Z'},{prevHash:o.record_sha256,predictions:[p]});
 assert.equal(verifyChain([p,o,duplicate]),false);
 const later=makePrediction({...base,policy:'CURRENT_SHADOW',captured_at:'2026-10-12T12:00:00Z'},{prevHash:o.record_sha256});
 assert.equal(verifyChain([p,o,later]),false);
});
test('F2-11 reject duplicated policy in same outcome',()=>{
 const p=makePrediction(base);
 const second=makePrediction({...base,captured_at:'2026-10-12T10:01:00Z'});
 assert.throws(()=>makeOutcome(result,{prevHash:p.record_sha256,predictions:[p,second]}),/duplicate prediction policy/);
});


const {prepareEvidenceIntent}=require('../../simulation/prospective-intent.cjs');
const {verifyEvidenceIntent,computeChainedEnvelopeHash,timingSafeHexEqual}=require('../../simulation/prospective-integrity.cjs');
test('F2-11 request hash validation is fail-closed',()=>{
 const intent={event_id:'2026-10-10-M',kind:'prediction',policy:'WEEKLY_FROZEN',idempotency_key:'event20261010M1234',payload:{N:12,candidates:[3,5]}};
 const p=prepareEvidenceIntent(intent);
 assert.equal(verifyEvidenceIntent(intent,p.request_sha256).request_sha256,p.request_sha256);
 assert.throws(()=>verifyEvidenceIntent({...intent,payload:{N:13,candidates:[3,5]}},p.request_sha256),/mismatch/);
 assert.equal(timingSafeHexEqual('not-a-hash',p.request_sha256),false);
 const args={requestSha256:p.request_sha256,receivedAt:'2026-10-10T16:00:00.000Z',actorSubject:'google-user-1'};
 const h=computeChainedEnvelopeHash(args);
 assert.match(h,/^[0-9a-f]{64}$/);
 assert.notEqual(h,computeChainedEnvelopeHash({...args,actorSubject:'google-user-2'}));
 assert.notEqual(h,computeChainedEnvelopeHash({...args,previousHash:h}));
 assert.throws(()=>computeChainedEnvelopeHash({...args,receivedAt:'2026-10-10'}),/timestamp/);
});
