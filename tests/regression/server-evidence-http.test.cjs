'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepareEvidenceFromHttp}=require('../../server/prospective-evidence-http.cjs');
const session={sub:'ci-subject',email:'ci@example.com'};
const auth={requireSameOrigin:()=>true,session:()=>session,csrfForSub:()=> 'valid-token'};
const body={event_id:'CI-20261010-M',kind:'prediction',policy:'WEEKLY_FROZEN',idempotency_key:'ci-adapter-key-000001',payload:{N:10}};
function req(){return {method:'POST',headers:{'content-type':'application/json','x-roleta-csrf':'valid-token',origin:'https://example.test'},body};}
test('accepts validated server-only request and derives actor',()=>{
 const v=prepareEvidenceFromHttp(req(),{auth});
 assert.equal(v.actor_subject,'google:ci-subject');
 assert.equal(v.body.event_id,body.event_id);
});
test('rejects wrong method, content type, origin, session and CSRF',()=>{
 assert.throws(()=>prepareEvidenceFromHttp({...req(),method:'GET'},{auth}),/method/);
 assert.throws(()=>prepareEvidenceFromHttp({...req(),headers:{...req().headers,'content-type':'text/plain'}},{auth}),/content type/);
 assert.throws(()=>prepareEvidenceFromHttp(req(),{auth:{...auth,requireSameOrigin:()=>false}}),/origin/);
 assert.throws(()=>prepareEvidenceFromHttp(req(),{auth:{...auth,session:()=>null}}),/authentication/);
 assert.throws(()=>prepareEvidenceFromHttp({...req(),headers:{...req().headers,'x-roleta-csrf':'invalid'}},{auth}),/CSRF/);
});
test('rejects oversize or forged actor before any database operation',()=>{
 assert.throws(()=>prepareEvidenceFromHttp({...req(),headers:{...req().headers,'content-length':'90000'}},{auth}),/length/);
 assert.throws(()=>prepareEvidenceFromHttp({...req(),body:' '.repeat(90000)},{auth}),/too large/);
 assert.throws(()=>prepareEvidenceFromHttp({...req(),body:{...body,actor_subject:'admin'}},{auth}),/unexpected/);
});
test('accepts JSON string body and rejects malformed JSON',()=>{
 assert.equal(prepareEvidenceFromHttp({...req(),body:JSON.stringify(body)},{auth}).body.kind,'prediction');
 assert.throws(()=>prepareEvidenceFromHttp({...req(),body:'{bad'},{auth}),SyntaxError);
});
