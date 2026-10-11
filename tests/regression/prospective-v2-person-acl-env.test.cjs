'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadAuthorizedPersonIdsFromEnv:load}=require('../../server/prospective-v2-person-acl-env.cjs');
test('operator V2 ACL resolves verified Google subject to person set only',()=>{
 const prev=process.env.ROLETA_V2_PERSON_ACL_JSON;
 try{
  process.env.ROLETA_V2_PERSON_ACL_JSON=JSON.stringify({'ci-google':['wagner','laura'],'other':['nina']});
  assert.deepEqual([...load({googleSub:'ci-google'})],['wagner','laura']);
  assert.throws(()=>load({googleSub:'unknown'}),/no valid V2 person ACL/);
  assert.throws(()=>load({googleSub:'../bad'}),/invalid verified/);
 }finally{if(prev===undefined)delete process.env.ROLETA_V2_PERSON_ACL_JSON;else process.env.ROLETA_V2_PERSON_ACL_JSON=prev;}
});
test('absence, malformed JSON and invalid person IDs are denied',()=>{
 const prev=process.env.ROLETA_V2_PERSON_ACL_JSON;
 try{
  delete process.env.ROLETA_V2_PERSON_ACL_JSON;
  assert.throws(()=>load({googleSub:'ci-google'}),/unavailable/);
  process.env.ROLETA_V2_PERSON_ACL_JSON='not-json';
  assert.throws(()=>load({googleSub:'ci-google'}),/JSON invalid/);
  process.env.ROLETA_V2_PERSON_ACL_JSON=JSON.stringify({'ci-google':['../../public']});
  assert.throws(()=>load({googleSub:'ci-google'}),/no valid V2 person ACL/);
 }finally{if(prev===undefined)delete process.env.ROLETA_V2_PERSON_ACL_JSON;else process.env.ROLETA_V2_PERSON_ACL_JSON=prev;}
});
