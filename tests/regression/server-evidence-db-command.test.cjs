'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {buildAuthenticatedAppendCommand}=require('../../server/prospective-evidence-db-command.cjs');
const auth={requireSameOrigin:()=>true,session:()=>({sub:'ci-sub-1',email:'ci@example.test'}),csrfForSub:()=> 'csrf-ci'};
const body={event_id:'CI-BIND-1',kind:'prediction',policy:'WEEKLY_FROZEN',idempotency_key:'ci-binding-key-0001',payload:{N:10,note:"x' OR 1=1 --"}};
const req=()=>({method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-roleta-csrf':'csrf-ci'},body});
test('binds server session actor and canonical bytes into positional SQL parameters',()=>{
 const v=buildAuthenticatedAppendCommand(req(),{auth});
 assert.match(v.sql,/\$1.*\$8/);
 assert.equal(v.params.length,8);
 assert.equal(v.params[7],'google:ci-sub-1');
 assert.equal(v.params[1],crypto.createHash('sha256').update(v.params[0],'utf8').digest('hex'));
 assert.deepEqual(JSON.parse(v.params[6]),body.payload);
 assert.ok(!v.sql.includes(body.payload.note));
 assert.ok(Object.isFrozen(v.params));
});
test('denies forged client actor, unauthenticated sessions and CSRF mismatch',()=>{
 assert.throws(()=>buildAuthenticatedAppendCommand({...req(),body:{...body,actor_subject:'google:admin'}},{auth}),/unexpected/);
 assert.throws(()=>buildAuthenticatedAppendCommand(req(),{auth:{...auth,session:()=>null}}),/authentication/);
 assert.throws(()=>buildAuthenticatedAppendCommand({...req(),headers:{...req().headers,'x-roleta-csrf':'bad'}},{auth}),/CSRF/);
});
test('identity follows authenticated session, not user payload',()=>{
 const other=buildAuthenticatedAppendCommand(req(),{auth:{...auth,session:()=>({sub:'ci-sub-2',email:'ci@example.test'})}});
 assert.equal(other.params[7],'google:ci-sub-2');
 assert.equal(other.params[1],buildAuthenticatedAppendCommand(req(),{auth}).params[1]);
});
