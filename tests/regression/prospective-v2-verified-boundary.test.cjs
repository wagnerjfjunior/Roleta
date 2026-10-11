'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepareVerifiedV2Append}=require('../../server/prospective-v2-verified-boundary.cjs');
const session={sub:'ci-actor',email:'ci@example.test',verified:true,provider:'google'};
const authorizedPersonIds=new Set(['wagner']);
const body={event_id:'CI-2026-10-11-M',kind:'prediction',
 policy:'WEEKLY_FROZEN',idempotency_key:'ci-v2-boundary-000001',
 payload:{recommendation_id:'ci-auth-1',person_id:'wagner',
 revision_number:1,supersedes_recommendation_id:null,physical_position:3,
 generated_at:'2026-10-11T18:00:00Z',data_cutoff:'2026-10-11T17:00:00Z',
 frozen_at:'2026-10-11T18:05:00Z'}};
function call(extra={}){return prepareVerifiedV2Append({session,body,authorizedPersonIds,csrfValid:true,originValid:true,...extra});}
test('server-verified V2 command binds actor, ACL and canonical payload',()=>{
 const r=call();
 assert.equal(r.params[2],'google:ci-actor');
 assert.equal(r.params[4],'wagner');
 assert.match(r.sql,/\$9::jsonb/);
});
test('transport rejects unverified session, CSRF, origin, and arbitrary persons',()=>{
 assert.throws(()=>call({session:{...session,verified:false}}),/verified Google/);
 assert.throws(()=>call({session:{...session,provider:'password'}}),/verified Google/);
 assert.throws(()=>call({csrfValid:false}),/CSRF/);
 assert.throws(()=>call({originValid:false}),/CSRF/);
 assert.throws(()=>call({authorizedPersonIds:new Set()}),/ACL/);
 assert.throws(()=>call({authorizedPersonIds:new Set(['laura'])}),/not authorized/);
 assert.throws(()=>call({body:{...body,actor_subject:'google:forged'}}),/unexpected request fields/);
});
test('prevents cyclic request and oversized nested structures before canonical encoding',()=>{
 const cyclic={...body,payload:{...body.payload}};
 cyclic.payload.back=cyclic;
 assert.throws(()=>call({body:cyclic}),/cyclic|structure/i);
 let inner={value:'a'};
 for(let i=0;i<40;i++)inner={x:inner};
 assert.throws(()=>call({body:{...body,payload:{...body.payload,deep:inner}}}),/deep/);
});
