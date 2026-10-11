'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepareV2FromHttp}=require('../../server/prospective-v2-google-http.cjs');
const s={sub:'ci-google',email:'ci@example.test'};
const body={event_id:'CI-2026-10-11-M',kind:'prediction',policy:'WEEKLY_FROZEN',
 idempotency_key:'ci-v2-google-http-0001',payload:{recommendation_id:'ci-google-1',
 person_id:'wagner',revision_number:1,supersedes_recommendation_id:null,
 physical_position:7,generated_at:'2026-10-11T18:00:00Z',
 data_cutoff:'2026-10-11T17:00:00Z',frozen_at:'2026-10-11T18:01:00Z'}};
const auth={
 requireSameOrigin:()=>true,session:()=>({...s}),csrfForSub:()=> 'ci-csrf'
};
const request={method:'POST',headers:{
 origin:'https://roleta.example.test','content-type':'application/json',
 'x-roleta-csrf':'ci-csrf'},body};
test('uses existing Google auth + server-only persisted person ACL',async()=>{
 let called=0;
 const cmd=await prepareV2FromHttp(request,{auth,loadAuthorizedPersonIds:async({googleSub,email})=>{
  called++;assert.equal(googleSub,'ci-google');assert.equal(email,s.email);return new Set(['wagner']);}});
 assert.equal(called,1);assert.equal(cmd.params[2],'google:ci-google');assert.equal(cmd.params[4],'wagner');
});
test('denies missing ACL loader, impersonated person, invalid CSRF/origin',async()=>{
 await assert.rejects(()=>prepareV2FromHttp(request,{auth}),/ACL loader/);
 await assert.rejects(()=>prepareV2FromHttp(request,{auth,loadAuthorizedPersonIds:async()=>new Set(['laura'])}),/not authorized/);
 await assert.rejects(()=>prepareV2FromHttp({...request,headers:{...request.headers,'x-roleta-csrf':'bad'}},{auth,loadAuthorizedPersonIds:async()=>new Set(['wagner'])}),/CSRF/);
 await assert.rejects(()=>prepareV2FromHttp(request,{auth:{...auth,requireSameOrigin:()=>false},loadAuthorizedPersonIds:async()=>new Set(['wagner'])}),/origin/);
 await assert.rejects(()=>prepareV2FromHttp(request,{auth:{...auth,session:()=>null},loadAuthorizedPersonIds:async()=>new Set(['wagner'])}),/authentication/);
});
