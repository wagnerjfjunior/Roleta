'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {canonical,prepareEvidenceIntent,MAX_PAYLOAD_BYTES}=require('../../simulation/prospective-intent.cjs');
const valid={event_id:'2026-10-10-M',kind:'prediction',policy:'WEEKLY_FROZEN',idempotency_key:'event20261010M1234',payload:{a:1,b:2}};
test('F2-11 canonical request hash independent of key order',()=>{
 assert.equal(canonical({z:2,a:1}),canonical({a:1,z:2}));
 assert.equal(prepareEvidenceIntent(valid).request_sha256,prepareEvidenceIntent({...valid,payload:{b:2,a:1}}).request_sha256);
});
test('F2-11 rejects invalid policies, identifiers and oversized evidence',()=>{
 assert.throws(()=>prepareEvidenceIntent({...valid,policy:'CURRENT'}),/policy/);
 assert.throws(()=>prepareEvidenceIntent({...valid,event_id:'a;DROP TABLE'}),/event_id/);
 assert.throws(()=>prepareEvidenceIntent({...valid,idempotency_key:'short'}),/idempotency/);
 assert.throws(()=>prepareEvidenceIntent({...valid,payload:{x:'x'.repeat(MAX_PAYLOAD_BYTES)}}),/too large/);
 assert.throws(()=>prepareEvidenceIntent({...valid,kind:'outcome'}),/policy must be null/);
});
