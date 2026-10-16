'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {canonical,verifyCallback,MAX_SKEW_MS}=require('../server/ocr-callback-hmac.cjs');
const secret='a-very-long-secret-key-with-at-least-32-bytes';
const now=1792152000000;
const base={method:'POST',path:'/api/ocr-callback',timestamp:String(now),nonce:'uniqueNonce1234567890',jobId:'550e8400-e29b-41d4-a716-446655440000',body:Buffer.from('{"linhas":[]}')};
function sign(a){return 'v1='+crypto.createHmac('sha256',secret).update(canonical(a)).digest('hex');}
test('accepts valid HMAC bound to exact bytes',()=>{const a={...base,signature:sign(base)};assert.equal(verifyCallback(a,{secret,now}).jobId,base.jobId);});
test('rejects changed payload, path and nonce',()=>{for(const mutation of [{body:Buffer.from('{}')},{path:'/api/other'},{nonce:'otherNonce1234567890'}]){const a={...base,...mutation,signature:sign(base)};assert.throws(()=>verifyCallback(a,{secret,now}));}});
test('rejects invalid, expired and future signatures',()=>{assert.throws(()=>verifyCallback({...base,signature:'v1='+('0'.repeat(64))},{secret,now}));for(const ts of [now-MAX_SKEW_MS-1,now+MAX_SKEW_MS+1]){const a={...base,timestamp:String(ts)};assert.throws(()=>verifyCallback({...a,signature:sign(a)},{secret,now}));}});
test('rejects malformed envelope',()=>{assert.throws(()=>canonical({...base,method:'GET'}));assert.throws(()=>canonical({...base,body:Buffer.alloc(1024*1024+1)}));});

test('Make Functions HMAC canonical envelope matches independently verified golden vector',()=>{
 const body=Buffer.from('{"model_id":"gemini-test","result":{"linhas":[]}}','utf8');
 const args={method:'POST',path:'/api/ocr-callback',timestamp:'1792170000000',
  nonce:'uniqueNonce1234567890',jobId:'550e8400-e29b-41d4-a716-446655440000',body};
 assert.equal(body.length,49);
 const actual=crypto.createHmac('sha256','test-key-only-not-production').update(canonical(args)).digest('hex');
 // Make scenario 6660591 execution cc01de92f98f465dad9f24023d83be73.
 assert.equal(actual,'ddb6304743f9af134f85aa6679a11e8cd28a82ddc56b6dd6c7987b6da1424b86');
 // The Make test key is deliberately short and cannot pass production's >=32-byte secret gate.
 assert.throws(()=>verifyCallback({...args,signature:'v1='+actual},{secret:'test-key-only-not-production',now:1792170000000}));
});
