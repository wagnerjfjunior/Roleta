'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {plan}=require('../../scripts/gate-e/recovery-plan.cjs');
const {assess,canonical}=require('../../scripts/gate-e/correction-contract.cjs');
const id='2026-10-12-M',head='a'.repeat(40),base='b'.repeat(40),digest='c'.repeat(64);
function orphan(){return {eventId:id,branch:'stat-intake/'+id,branchHeadSha:head,mainSha:base,commit:{sha:head,parents:[{sha:base}]},proof:{schema:'rlt-statistical-proof-v1',event_id:id,event_date:'2026-10-12',human_review_confirmed:true,payload_sha256:digest,actor_hash:'d'.repeat(16)},openPrs:[],closedPrs:[]};}
function correction(){let original={event_id:id,version:1,proof_sha256:digest};let proposed={schema:'rlt-statistical-correction-v1',event_id:id,version:2,predecessor_proof_sha256:digest,actor_id:'author',reason:'Position on original paper corrected after audit',source:'IMG_1700.jpeg',replacement_proof_sha256:'f'.repeat(64)};let approval={explicit:true,event_id:id,version:2,reviewer_id:'reviewer',reviewed_at:'2026-10-12T15:00:00Z',proposal_sha256:crypto.createHash('sha256').update(canonical(proposed)).digest('hex')};return {original,proposed,approval};}
test('orphan branch yields read-only manual PR recreation plan',()=>{const r=plan(orphan());assert.equal(r.state,'ORPHAN_ELIGIBLE_FOR_MANUAL_PR_RECREATION');assert.equal(r.writesPermitted,false);});
test('open verified PR yields no new PR request',()=>{const x=orphan();x.openPrs=[{state:'open',number:5,head:{ref:x.branch,sha:head},base:{ref:'main'}}];assert.equal(plan(x).state,'EXISTING_OPEN_PR');});
test('orphan with stale parent is blocked',()=>{const x=orphan();x.commit.parents[0].sha='e'.repeat(40);assert.equal(plan(x).reason,'STALE_OR_UNVERIFIED_COMMIT');});
test('closed PR blocks orphan recovery',()=>{const x=orphan();x.closedPrs=[{number:3}];assert.equal(plan(x).reason,'CLOSED_PR_PRESENT');});
test('PR head mismatch blocks reuse',()=>{const x=orphan();x.openPrs=[{state:'open',number:5,head:{ref:x.branch,sha:'e'.repeat(40)},base:{ref:'main'}}];assert.equal(plan(x).reason,'PR_HEAD_OR_BASE_MISMATCH');});
test('conflicting two PRs block',()=>{const x=orphan();x.openPrs=[{},{}];assert.equal(plan(x).reason,'MULTIPLE_OPEN_PRS');});
test('unverified original proof blocks recovery',()=>{const x=orphan();x.proof.payload_sha256='bad';assert.equal(plan(x).reason,'UNVERIFIED_PROOF');});
test('approved correction contract still never allows writes',()=>{const r=assess(correction());assert.equal(r.ok,true);assert.equal(r.writesPermitted,false);});
test('correction requires predecessor proof hash',()=>{const x=correction();x.proposed.predecessor_proof_sha256='e'.repeat(64);assert.equal(assess(x).reason,'BROKEN_VERSION_CHAIN');});
test('same operator may confirm their own correction; no second reviewer required',()=>{const x=correction();x.approval.reviewer_id='author';assert.equal(assess(x).ok,true);assert.equal(assess(x).writesPermitted,false);});
test('reviewer approval must bind proposal digest',()=>{const x=correction();x.proposed.reason+=' changed';assert.equal(assess(x).reason,'APPROVAL_NOT_BOUND_TO_PROPOSAL');});
test('no silent correction without reason and source',()=>{const x=correction();x.proposed.reason='wrong';assert.equal(assess(x).reason,'INSUFFICIENT_CORRECTION_EVIDENCE');});
test('new correction needs new version',()=>{const x=correction();x.proposed.version=1;assert.equal(assess(x).reason,'BROKEN_VERSION_CHAIN');});
