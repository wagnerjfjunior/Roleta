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
