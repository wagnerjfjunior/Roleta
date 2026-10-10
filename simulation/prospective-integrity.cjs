'use strict';
const crypto=require('node:crypto');
const {canonical,prepareEvidenceIntent}=require('./prospective-intent.cjs');
const SHA256=/^[0-9a-f]{64}$/;
function timingSafeHexEqual(a,b){
 if(typeof a!=='string'||typeof b!=='string'||!SHA256.test(a)||!SHA256.test(b))return false;
 return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
function verifyEvidenceIntent(input,expectedSha256){
 const prepared=prepareEvidenceIntent(input);
 if(!timingSafeHexEqual(prepared.request_sha256,expectedSha256))throw new Error('request hash mismatch');
 return prepared;
}
function computeChainedEnvelopeHash({previousHash=null,requestSha256,receivedAt,actorSubject}){
 if(previousHash!==null&&!SHA256.test(previousHash))throw new Error('invalid previous hash');
 if(!SHA256.test(requestSha256))throw new Error('invalid request hash');
 if(typeof receivedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(receivedAt)||!Number.isFinite(Date.parse(receivedAt)))throw new Error('invalid DB timestamp');
 if(typeof actorSubject!=='string'||actorSubject.length<1||actorSubject.length>256)throw new Error('invalid server actor');
 const envelope={version:'rlt-evidence-envelope-v1',previous_hash:previousHash,request_sha256:requestSha256,received_at:receivedAt,actor_subject:actorSubject};
 return crypto.createHash('sha256').update(canonical(envelope),'utf8').digest('hex');
}
module.exports={timingSafeHexEqual,verifyEvidenceIntent,computeChainedEnvelopeHash};
