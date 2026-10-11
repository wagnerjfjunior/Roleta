'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {preparePersonEvidenceV2,VERSION}=require('../../server/prospective-person-envelope-v2.cjs');
const {canonical}=require('../../simulation/prospective-intent.cjs');
const session={sub:'verified-google-sub',email:'verified@example.test'};
const authorizedPersonIds=new Set(['wagner','laura']);
const base={
 event_id:'2026-10-12-manha',kind:'prediction',policy:'WEEKLY_FROZEN',
 idempotency_key:'person-evidence-ci-00001',
 payload:{
  person_id:'wagner',revision_number:1,supersedes_recommendation_id:null,
  physical_position:14,generated_at:'2026-10-11T19:00:00Z',
  data_cutoff:'2026-10-11T18:00:00Z',frozen_at:'2026-10-11T19:00:00Z'
 }
};
const prepare=(body=base,subject=session,ids=authorizedPersonIds)=>preparePersonEvidenceV2({session:subject,authorizedPersonIds:ids,body});
test('V2 envelope cryptographically binds session, person, policy and revision',()=>{
 const result=prepare(),env=JSON.parse(result.canonical_bytes);
 assert.equal(result.version,VERSION);
 assert.equal(env.version,VERSION);
 assert.equal(env.actor_subject,'google:verified-google-sub');
 assert.equal(env.person_id,'wagner');
 assert.equal(env.revision_number,1);
 assert.equal(result.request_sha256,crypto.createHash('sha256').update(canonical(env)).digest('hex'));
 assert.notEqual(result.request_sha256,prepare(base,{...session,sub:'other-sub'}).request_sha256);
 assert.notEqual(result.request_sha256,prepare({...base,payload:{...base.payload,person_id:'laura'}}).request_sha256);
});
test('V2 preparation denies unauthorized person, forgery and absent authorization',()=>{
 assert.throws(()=>prepare({...base,payload:{...base.payload,person_id:'outsider'}}),/not authorized/);
 assert.throws(()=>prepare(base,session,new Set()),/authorization/);
 assert.throws(()=>prepare({...base,actor_subject:'google:attacker'}),/unexpected evidence fields/);
 assert.throws(()=>prepare(base,null),/session required/);
});
test('V2 explicitly rejects outcome and pre-result timestamp abuse',()=>{
 assert.throws(()=>prepare({...base,kind:'outcome',policy:null}),/prediction policy/);
 assert.throws(()=>prepare({...base,payload:{...base.payload,data_cutoff:'2026-10-12T20:00:00Z'}}),/cutoff/);
});
test('V2 current revision keeps predecessor inside hashed payload',()=>{
 const v=prepare({...base,policy:'CURRENT_SHADOW',payload:{
  ...base.payload,revision_number:2,supersedes_recommendation_id:'prior-recommendation-1',frozen_at:null
 }});
 const env=JSON.parse(v.canonical_bytes);
 assert.equal(env.policy,'CURRENT_SHADOW');
 assert.equal(env.payload.supersedes_recommendation_id,'prior-recommendation-1');
 assert.equal(env.revision_number,2);
});
