'use strict';
// Server-only validation boundary. No database client, HTTP endpoint, or persistence.
// The caller MUST provide the authenticated server session; never trust actor_subject
// or request hash supplied by the browser.
const {canonical,prepareEvidenceIntent}=require('../simulation/prospective-intent.cjs');
const {timingSafeHexEqual}=require('../simulation/prospective-integrity.cjs');
const MAX_BODY_BYTES=80*1024;
const BODY_KEYS=new Set(['event_id','kind','policy','payload','idempotency_key']);
function requirePlainObject(value,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw new Error(label+' must be plain object');
}
function prepareAuthenticatedEvidence({session,body,csrfValid,originValid}={}){
 if(!session||typeof session.sub!=='string'||session.sub.length<1||session.sub.length>256||typeof session.email!=='string'||!session.email)throw new Error('authenticated session required');
 if(originValid!==true||csrfValid!==true)throw new Error('request origin or CSRF rejected');
 requirePlainObject(body,'request body');
 const keys=Object.keys(body);
 if(keys.length!==BODY_KEYS.size||keys.some(k=>!BODY_KEYS.has(k)))throw new Error('unexpected request fields');
 const bytes=canonical(body);
 if(Buffer.byteLength(bytes,'utf8')>MAX_BODY_BYTES)throw new Error('request too large');
 const prepared=prepareEvidenceIntent(body);
 // Independently derive the canonical digest. Browser-supplied digests are not accepted.
 const crypto=require('node:crypto');
 const computed=crypto.createHash('sha256').update(bytes,'utf8').digest('hex');
 if(!timingSafeHexEqual(computed,prepared.request_sha256))throw new Error('canonical request mismatch');
 const actorSubject='google:'+session.sub;
 if(actorSubject.length>256)throw new Error('actor too long');
 return Object.freeze({
  body:prepared.body,
  canonical_bytes:bytes,
  request_sha256:computed,
  actor_subject:actorSubject
 });
}
module.exports={prepareAuthenticatedEvidence,MAX_BODY_BYTES};
