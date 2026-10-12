'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {classify,assessCorrection}=require('../../scripts/gate-e/review-state.cjs');
const id='2026-10-12-M', sha='a'.repeat(40), base='b'.repeat(40);
function fixture(){
 const branch='stat-intake/'+id;
 return {eventId:id,branchRef:branch,headSha:sha,mainSha:base,
  pr:{state:'open',number:12,base:{ref:'main'},head:{ref:branch,sha}},
  commit:{sha,parents:[{sha:base}]},
  proof:{schema:'rlt-statistical-proof-v1',event_id:id,event_date:'2026-10-12',human_review_confirmed:true,payload_sha256:'f'.repeat(64),actor_hash:'c'.repeat(16)},
  changedPaths:['data/incoming/'+id+'.csv','data/intake-proofs/'+id+'.json','data/manifest.json']};
}
test('bound open PR and immutable commit classified pending human review',()=>{
 const r=classify(fixture());assert.equal(r.ok,true);assert.equal(r.status,'pending_human_review');
});
test('orphan branch without PR requires manual reconciliation',()=>{
 assert.equal(classify({...fixture(),pr:null}).reason,'ORPHAN_BRANCH_NO_PR');
});
test('closed PR cannot replay as approved',()=>{
 const v=fixture();v.pr.state='closed';assert.equal(classify(v).reason,'PR_NOT_OPEN');
});
test('changed PR head SHA rejected',()=>{
 const v=fixture();v.pr.head.sha='d'.repeat(40);assert.equal(classify(v).reason,'PR_HEAD_SHA_MISMATCH');
});
test('stale main and multiple parents denied',()=>{
 const v=fixture();v.commit.parents=[{sha:'e'.repeat(40)},{sha:base}];
 assert.equal(classify(v).reason,'STALE_MAIN_OR_NONLINEAR_HISTORY');
});
test('changed proof and unexpected paths denied',()=>{
 const v=fixture();v.proof.payload_sha256='bad';assert.equal(classify(v).reason,'INVALID_PROOF');
 const w=fixture();w.changedPaths[0]='data/events.csv';assert.equal(classify(w).reason,'UNEXPECTED_PATHS');
});
test('correction without versioning or explicit approval remains blocked',()=>{
 assert.equal(assessCorrection({}).reason,'MISSING_VERSIONED_EVIDENCE');
 assert.equal(assessCorrection({publishedEvent:{},proposedCorrection:{}}).reason,'CORRECTION_REQUIRES_SEPARATE_APPROVAL');
 assert.equal(assessCorrection({publishedEvent:{},proposedCorrection:{},reviewAuthorization:true}).reason,'CORRECTION_WRITE_NOT_IMPLEMENTED');
});
