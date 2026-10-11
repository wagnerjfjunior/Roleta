'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validatePersonPrediction}=require('../../server/prospective-person-contract.cjs');
const allowed=new Set(['wagner','laura']);
const payload={
 person_id:'wagner',revision_number:1,supersedes_recommendation_id:null,
 physical_position:14,generated_at:'2026-10-10T19:00:00Z',
 data_cutoff:'2026-10-10T18:00:00Z',frozen_at:'2026-10-10T19:00:00Z'
};
function prediction(policy='WEEKLY_FROZEN',changes={}){
 return {kind:'prediction',policy,payload:{...payload,...changes}};
}
function check(body,authorizedPersonIds=allowed){
 return validatePersonPrediction({body,authorizedPersonIds});
}
test('trusted person allowlist permits distinct authorized members in same event',()=>{
 assert.deepEqual(check(prediction()),{person_id:'wagner',revision_number:1,policy:'WEEKLY_FROZEN'});
 assert.equal(check(prediction('WEEKLY_FROZEN',{person_id:'laura'})).person_id,'laura');
});
test('rejects missing/forged user authorization, including browser-only claims',()=>{
 assert.throws(()=>validatePersonPrediction({body:prediction()}),/authorization/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{person_id:'brenda'})),/not authorized/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{person_id:'../wagner'})),/invalid person/);
});
test('weekly frozen demands first revision and frozen timestamp',()=>{
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{revision_number:2})),/weekly revision/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{frozen_at:null})),/weekly must be frozen/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{supersedes_recommendation_id:'prior-id'})),/weekly revision/);
});
test('current revisions require predecessor after first version',()=>{
 const initial=check(prediction('CURRENT_SHADOW',{frozen_at:null}));
 assert.equal(initial.revision_number,1);
 const updated=check(prediction('CURRENT_SHADOW',{frozen_at:null,revision_number:2,supersedes_recommendation_id:'prior-id'}));
 assert.equal(updated.revision_number,2);
 assert.throws(()=>check(prediction('CURRENT_SHADOW',{revision_number:2,frozen_at:null})),/predecessor/);
 assert.throws(()=>check(prediction('CURRENT_SHADOW',{revision_number:1,supersedes_recommendation_id:'prior-id',frozen_at:null})),/initial revision/);
});
test('rejects hindsight cutoff, invalid timestamps and positions',()=>{
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{data_cutoff:'2026-10-10T20:00:00Z'})),/cutoff/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{frozen_at:'2026-10-10T20:00:00Z'})),/freeze/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{generated_at:'2026-02-30T19:00:00Z'})),/generated_at/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{physical_position:0})),/physical_position/);
 assert.throws(()=>check(prediction('WEEKLY_FROZEN',{revision_number:1.5})),/revision_number/);
});
test('rejects outcome at person-prediction validator boundary',()=>{
 assert.throws(()=>check({kind:'outcome',policy:null,payload}),/prediction policy/);
});
