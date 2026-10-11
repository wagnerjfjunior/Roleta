'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {buildPersonAppendCommand}=require('../../server/prospective-person-db-command-v2.cjs');
const session={sub:'ci-sub',email:'allowed@example.test'};
const authorizedPersonIds=new Set(['wagner']);
const body={
 event_id:'CI-2026-10-11-M',kind:'prediction',policy:'WEEKLY_FROZEN',
 idempotency_key:'ci-v2-person-key-00001',
 payload:{
  recommendation_id:'ci-recommendation-1',person_id:'wagner',
  revision_number:1,supersedes_recommendation_id:null,physical_position:14,
  generated_at:'2026-10-11T18:00:00Z',
  data_cutoff:'2026-10-11T17:00:00Z',
  frozen_at:'2026-10-11T18:05:00Z'
 }
};
function build(changes={}){return buildPersonAppendCommand({session,authorizedPersonIds,body:{...body,...changes}});}
test('V2 command is parameterized and binds verified person, actor, digest',()=>{
 const cmd=build();
 assert.equal(cmd.params.length,9);
 assert.match(cmd.sql,/append_authenticated_person_evidence_v2\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9::jsonb\)/);
 assert.equal(cmd.params[2],'google:ci-sub');
 assert.equal(cmd.params[4],'wagner');
 assert.equal(cmd.params[5],'ci-recommendation-1');
 assert.equal(cmd.params[7],'ci-v2-person-key-00001');
 assert.equal(cmd.params[1],crypto.createHash('sha256').update(cmd.params[0]).digest('hex'));
 assert.equal(JSON.parse(cmd.params[0]).payload.recommendation_id,'ci-recommendation-1');
 assert.ok(Object.isFrozen(cmd.params));
});
test('V2 command rejects forged person and actor supplied in browser body',()=>{
 assert.throws(()=>build({actor_subject:'google:attacker'}),/unexpected evidence fields/);
 assert.throws(()=>build({payload:{...body.payload,person_id:'outsider'}}),/not authorized/);
 assert.throws(()=>buildPersonAppendCommand({session,body}),/authorization/);
});
test('V2 command never interpolates untrusted payload into SQL',()=>{
 const command=build({payload:{...body.payload,note:"'; DELETE FROM public.leads; --"}});
 assert.ok(!command.sql.includes('DELETE FROM public.leads'));
 assert.ok(command.params[8].includes('DELETE FROM public.leads'));
});
