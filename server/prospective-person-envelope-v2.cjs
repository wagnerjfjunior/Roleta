'use strict';
// F2-12: isolated V2 canonical person-evidence envelope. NOT an SQL writer,
// HTTP route, migration, or activation of prospective capture.
// Trust boundary: caller must supply a verified server-side session AND
// server-controlled authorizedPersonIds. This is not a browser allowlist.
const crypto=require('node:crypto');
const {canonical,prepareEvidenceIntent}=require('../simulation/prospective-intent.cjs');
const {validatePersonPrediction}=require('./prospective-person-contract.cjs');
const VERSION='rlt-person-evidence-v2';
function preparePersonEvidenceV2({session,authorizedPersonIds,body}={}){
 if(!session||typeof session.sub!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(session.sub)
   ||typeof session.email!=='string'||!session.email)
  throw new Error('verified server session required');
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.getPrototypeOf(body)!==Object.prototype)
  throw new Error('plain evidence body required');
 if(Object.keys(body).length!==5||
    Object.keys(body).some(key=>!['event_id','kind','policy','payload','idempotency_key'].includes(key)))
  throw new Error('unexpected evidence fields');
 // Reuse V1 structural and primitive checks, but use a separate V2 wire envelope.
 const checked=prepareEvidenceIntent(body);
 const person=validatePersonPrediction({body:checked.body,authorizedPersonIds});
 // Identity and policy semantics are included in the *hashed envelope*.
 // The backend must independently authorize this person for this session.
 const actor_subject='google:'+session.sub;
 const envelope={
  version:VERSION,actor_subject,event_id:checked.body.event_id,
  kind:'prediction',policy:checked.body.policy,
  person_id:person.person_id,revision_number:person.revision_number,
  idempotency_key:checked.body.idempotency_key,payload:checked.body.payload
 };
 const bytes=canonical(envelope);
 if(Buffer.byteLength(bytes,'utf8')>81920)throw new Error('canonical envelope too large');
 return Object.freeze({
  version:VERSION,canonical_bytes:bytes,
  request_sha256:crypto.createHash('sha256').update(bytes,'utf8').digest('hex'),
  actor_subject,person_id:person.person_id,revision_number:person.revision_number,
  event_id:checked.body.event_id,policy:checked.body.policy
 });
}
module.exports={VERSION,preparePersonEvidenceV2};
