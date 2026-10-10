'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateNewPrediction,validateNewOutcome}=require('../../simulation/prospective-commands.cjs');
const clock=x=>()=>new Date(x);
const input={event_id:'2026-10-12-M',captured_at:'2001-01-01T00:00:00Z',policy:'WEEKLY_FROZEN',algorithm_version:'audit',input_sha256:'a'.repeat(64),N:4,occupied_snapshot:[1,2,3,4],candidates:[1]};
test('F2-11 server clock overrides untrusted client timestamp',()=>{
 const p=validateNewPrediction([],input,{clock:clock('2026-10-12T10:00:00Z')});
 assert.equal(p.captured_at,'2026-10-12T10:00:00.000Z');
 assert.throws(()=>validateNewPrediction([p],input,{clock:clock('2026-10-12T10:01:00Z')}),/already committed/);
});
test('F2-11 result only after a prior immutable prediction',()=>{
 const p=validateNewPrediction([],input,{clock:clock('2026-10-12T10:00:00Z')});
 const outcome={event_id:input.event_id,first:1,last:4,occupied:[1,2,3,4],validated_by:'reviewer',captured_at:'2000-01-01T00:00:00Z'};
 const o=validateNewOutcome([p],outcome,{clock:clock('2026-10-12T11:00:00Z')});
 assert.equal(o.captured_at,'2026-10-12T11:00:00.000Z');
 assert.throws(()=>validateNewOutcome([p,o],outcome,{clock:clock('2026-10-12T12:00:00Z')}),/already committed/);
 assert.throws(()=>validateNewPrediction([p,o],{...input,policy:'CURRENT_SHADOW'},{clock:clock('2026-10-12T12:00:00Z')}),/outcome already committed/);
});
test('F2-11 reject result when server time is not later',()=>{
 const p=validateNewPrediction([],input,{clock:clock('2026-10-12T10:00:00Z')});
 assert.throws(()=>validateNewOutcome([p],{event_id:input.event_id,first:1,last:4,occupied:[1,2,3,4],validated_by:'reviewer'},{clock:clock('2026-10-12T09:59:00Z')}),/not prior/);
});
