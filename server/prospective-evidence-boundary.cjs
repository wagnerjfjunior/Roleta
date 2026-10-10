'use strict';
// Server-only validation boundary. No database client, HTTP endpoint, or persistence.
// The caller MUST provide the authenticated server session; never trust actor_subject
// or request hash supplied by the browser.
const {canonical,prepareEvidenceIntent}=require('../simulation/prospective-intent.cjs');
const {timingSafeHexEqual}=require('../simulation/prospective-integrity.cjs');
const MAX_BODY_BYTES=80*1024;
const MAX_NESTING_DEPTH=32;
const MAX_STRUCTURE_NODES=12000;
function validateStructureBudget(root){
 const stack=[{value:root,depth:0}];
 const seen=new Set();
 let nodes=0;
 while(stack.length){
  const {value,depth}=stack.pop();
  if(++nodes>MAX_STRUCTURE_NODES)throw new Error('request structure too complex');
  if(depth>MAX_NESTING_DEPTH)throw new Error('request nesting too deep');
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')continue;
  if(!value||typeof value!=='object')throw new Error('unsupported request value');
  if(seen.has(value))throw new Error('cyclic or shared request structure');
  seen.add(value);
  if(Array.isArray(value)){
   if(value.length>MAX_STRUCTURE_NODES)throw new Error('request array too large');
   for(let i=0;i<value.length;i++){
    if(!Object.prototype.hasOwnProperty.call(value,i))throw new Error('sparse array');
    stack.push({value:value[i],depth:depth+1});
   }
  }else{
   if(Object.getPrototypeOf(value)!==Object.prototype)throw new Error('request object prototype rejected');
   const keys=Object.keys(value);
   if(keys.length>MAX_STRUCTURE_NODES)throw new Error('request object too large');
   for(const key of keys){
    if(key==='__proto__'||key==='constructor'||key==='prototype')throw new Error('reserved request key');
    stack.push({value:value[key],depth:depth+1});
   }
  }
 }
}
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
 validateStructureBudget(body);
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
module.exports={prepareAuthenticatedEvidence,MAX_BODY_BYTES,MAX_NESTING_DEPTH,MAX_STRUCTURE_NODES};
