'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {promotionGate}=require('../../simulation/promotion-gate.cjs');
test('F2-14 gate fails closed with zero prospective evidence',()=>{
 const r=promotionGate([],{approved:true,rollbackTested:true,protocolRegistered:true});
 assert.equal(r.ready,false);assert.equal(r.policy,'WEEKLY_FROZEN');
 assert.ok(r.reasons.includes('insufficient_prospective_pairs'));
 assert.ok(r.reasons.includes('statistical_superiority_requires_independent_review'));
});
test('F2-14 no manual approval means no promotion',()=>{
 const r=promotionGate([],{minimumPaired:0,rollbackTested:true,protocolRegistered:true});
 assert.equal(r.ready,false);assert.ok(r.reasons.includes('human_promotion_approval_missing'));
});
