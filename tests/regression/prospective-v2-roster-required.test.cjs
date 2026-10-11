'use strict';
// F2-12 Gate C: the operational roster cannot be inferred from the actor ACL,
// the broker registry, or an untrusted browser physical_position.
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../../api/prospective-v2-append.js');
const {buildPersonAppendCommand}=require('../../server/prospective-person-db-command-v2.cjs');
const session={sub:'ci-operator',email:'operator@example.test'};
const body={event_id:'2026-10-12-manha',kind:'prediction',policy:'WEEKLY_FROZEN',
 idempotency_key:'gate-c-roster-proof-00001',payload:{recommendation_id:'ci-rec1',
 person_id:'ci-person',revision_number:1,supersedes_recommendation_id:null,
 physical_position:3,generated_at:'2026-10-12T11:40:00Z',
 data_cutoff:'2026-10-11T20:00:00Z',frozen_at:'2026-10-12T11:41:00Z'}};
const cmd=buildPersonAppendCommand({session,authorizedPersonIds:new Set(['ci-person']),body});
const env={ROLETA_V2_WRITES_ENABLED:'true'};
function res(){const result={code:null,data:null};return {result,setHeader(){},status(code){result.code=code;return this;},json(data){result.data=data;return this;}};}
test('no trusted physical roster evidence means fail closed with no SQL append',async()=>{
 let writes=0;
 const h=createHandler({env,prepare:async()=>cmd,assertEvent:()=>true,
  append:async()=>{writes++;return '1';}});
 const response=res();await h({method:'POST'},response);
 assert.equal(response.result.code,403);
 assert.equal(writes,0);
 assert.doesNotMatch(JSON.stringify(response.result.data),/ci-person|ci-operator|physical_position/);
});
test('rejected or unavailable roster proof fails closed even if ACL and cutoff passed',async()=>{
 let writes=0;
 for(const authorizeRoster of [
  async()=>{throw Error('roster proof denied');},
  async()=>{throw Error('trusted event roster proof unavailable');}
 ]){
  const response=res();
  await createHandler({env,prepare:async()=>cmd,assertEvent:()=>true,
   authorizeRoster,append:async()=>{writes++;return '1';}})({method:'POST'},response);
  assert.equal(response.result.code,403);
 }
 assert.equal(writes,0);
});
test('verified external roster adapter must run after cutoff and before SQL append',async()=>{
 const calls=[];
 const h=createHandler({env,prepare:async()=>{calls.push('session-and-acl');return cmd;},
  assertEvent:()=>{calls.push('cutoff');return true;},
  authorizeRoster:async(command)=>{assert.equal(command.params[4],'ci-person');
   assert.equal(JSON.parse(command.params[8]).physical_position,3);
   calls.push('independent-roster');},
  append:async()=>{calls.push('sql-append');return '7';}});
 const response=res();await h({method:'POST'},response);
 assert.equal(response.result.code,201);
 assert.deepEqual(calls,['session-and-acl','cutoff','independent-roster','sql-append']);
});
