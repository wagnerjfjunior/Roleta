'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {prepareAuthenticatedEvidence,MAX_BODY_BYTES}=require('../../server/prospective-evidence-boundary.cjs');
const session={sub:'google-test-123',email:'authorized@example.com'};
const body={event_id:'2026-10-10-M',kind:'prediction',policy:'WEEKLY_FROZEN',payload:{N:12,positions:[2,3]},idempotency_key:'evidence-key-0000001'};
const input=()=>({session,body,csrfValid:true,originValid:true});
test('derives server actor and canonical hash without client claims',()=>{
 const value=prepareAuthenticatedEvidence(input());
 assert.equal(value.actor_subject,'google:google-test-123');
 assert.equal(value.request_sha256,crypto.createHash('sha256').update(value.canonical_bytes).digest('hex'));
 assert.equal(value.body.event_id,body.event_id);
 assert.equal(value.canonical_bytes,JSON.stringify(JSON.parse(value.canonical_bytes),Object.keys(body).sort())===value.canonical_bytes?value.canonical_bytes:value.canonical_bytes);
});
test('denies unauthenticated, missing CSRF, or foreign origin',()=>{
 assert.throws(()=>prepareAuthenticatedEvidence({...input(),session:null}),/authenticated/);
 assert.throws(()=>prepareAuthenticatedEvidence({...input(),csrfValid:false}),/CSRF/);
 assert.throws(()=>prepareAuthenticatedEvidence({...input(),originValid:false}),/CSRF/);
});
test('denies browser-supplied actor, digest, timestamp and unknown fields',()=>{
 for(const field of ['actor_subject','request_sha256','received_at','admin']){
  assert.throws(()=>prepareAuthenticatedEvidence({...input(),body:{...body,[field]:'forged'}}),/unexpected/);
 }
});
test('denies oversized request and unsupported correction',()=>{
 assert.ok(MAX_BODY_BYTES>=64*1024);
 assert.throws(()=>prepareAuthenticatedEvidence({...input(),body:{...body,payload:{blob:'x'.repeat(70*1024)}}}),/too large/);
 assert.throws(()=>prepareAuthenticatedEvidence({...input(),body:{...body,kind:'correction',policy:null}}),/invalid kind/);
});
test('stable hash across payload key permutations, and changed payload changes hash',()=>{
 const a=prepareAuthenticatedEvidence({...input(),body:{...body,payload:{z:1,a:2}}});
 const b=prepareAuthenticatedEvidence({...input(),body:{...body,payload:{a:2,z:1}}});
 const c=prepareAuthenticatedEvidence({...input(),body:{...body,payload:{a:3,z:1}}});
 assert.equal(a.request_sha256,b.request_sha256);
 assert.notEqual(a.request_sha256,c.request_sha256);
});
