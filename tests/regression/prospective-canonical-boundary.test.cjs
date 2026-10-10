'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {canonical,prepareEvidenceIntent}=require('../../simulation/prospective-intent.cjs');
function intent(){return {event_id:'20261010M',kind:'prediction',policy:'WEEKLY_FROZEN',payload:{N:12},idempotency_key:'ci-test-key-00000001'};}
test('correction unsupported until separately designed and approved',()=>assert.throws(()=>prepareEvidenceIntent({...intent(),kind:'correction',policy:null}),/invalid kind/));
test('rejects sparse arrays instead of silently dropping gaps',()=>assert.throws(()=>canonical([,1]),/sparse array/));
test('rejects undefined and nonfinite numbers',()=>{
 assert.throws(()=>canonical({a:undefined}),/unsupported/);
 assert.throws(()=>canonical([NaN]),/non-finite/);
});
test('rejects reserved keys and unusual prototypes',()=>{
 const obj=JSON.parse('{"__proto__":{"admin":true}}');
 assert.throws(()=>canonical(obj),/reserved canonical key/);
 assert.throws(()=>canonical(Object.create(null)),/unsupported/);
});
test('equivalent key ordering produces identical canonical bytes and request hash',()=>{
 assert.equal(canonical({z:2,a:1}),canonical({a:1,z:2}));
 const a=intent(),b=intent();
 a.payload={z:1,a:2};b.payload={a:2,z:1};
 assert.equal(prepareEvidenceIntent(a).request_sha256,prepareEvidenceIntent(b).request_sha256);
});
