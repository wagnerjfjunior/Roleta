'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const google=require('../../auth/google');
const {prepareEvidenceFromHttp}=require('../../server/prospective-evidence-http.cjs');
const body={event_id:'CI-AUTH-20261010',kind:'prediction',policy:'WEEKLY_FROZEN',idempotency_key:'ci-real-session-0001',payload:{N:10}};
function request(token,sub='google-ci-sub'){
 return {method:'POST',headers:{
  origin:'https://roleta-ci.example.test',
  'content-type':'application/json',
  'x-roleta-csrf':google.csrfForSub(sub),
  cookie:'rlt_session='+token
 },body};
}
test('real sealed Google session determines actor, never client claims',()=>{
 const keys=['ROLETA_SESSION_SECRET','ROLETA_GOOGLE_ALLOWED_EMAILS','ROLETA_SITE_ORIGIN'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.ROLETA_SESSION_SECRET='ci-only-not-a-production-secret-1234567890';
  process.env.ROLETA_GOOGLE_ALLOWED_EMAILS='allowed@example.test';
  process.env.ROLETA_SITE_ORIGIN='https://roleta-ci.example.test';
  const valid=google.seal({typ:'session',sub:'google-ci-sub',email:'allowed@example.test',exp:Date.now()+60000});
  const value=prepareEvidenceFromHttp(request(valid));
  assert.equal(value.actor_subject,'google:google-ci-sub');
  assert.equal(value.body.event_id,body.event_id);
  assert.throws(()=>prepareEvidenceFromHttp({...request(valid),body:{...body,actor_subject:'google:admin'}}),/unexpected/);
  assert.throws(()=>prepareEvidenceFromHttp(request(valid.slice(0,-2)+'zz')),/authentication/);
  const forbidden=google.seal({typ:'session',sub:'google-ci-sub',email:'denied@example.test',exp:Date.now()+60000});
  assert.throws(()=>prepareEvidenceFromHttp(request(forbidden)),/authentication/);
  const expired=google.seal({typ:'session',sub:'google-ci-sub',email:'allowed@example.test',exp:Date.now()-60000});
  assert.throws(()=>prepareEvidenceFromHttp(request(expired)),/authentication/);
  const swapped=google.seal({typ:'session',sub:'other-ci-sub',email:'allowed@example.test',exp:Date.now()+60000});
  assert.throws(()=>prepareEvidenceFromHttp(request(swapped)),/CSRF/);
  const different=prepareEvidenceFromHttp(request(swapped,'other-ci-sub'));
  assert.equal(different.actor_subject,'google:other-ci-sub');
  assert.notEqual(different.actor_subject,value.actor_subject);
 }finally{
  for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 }
});
