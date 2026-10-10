'use strict';
const crypto=require('node:crypto');
const ALLOWED_TYPES=new Set(['prediction','outcome','correction']);
const MAX_PAYLOAD_BYTES=64*1024;
function canonical(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('non-finite value');return JSON.stringify(value)}
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 }
 throw new Error('unsupported canonical value');
}
function prepareEvidenceIntent(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('intent required');
 const {event_id,kind,policy,payload,idempotency_key}=input;
 if(typeof event_id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(event_id))throw new Error('invalid event_id');
 if(!ALLOWED_TYPES.has(kind))throw new Error('invalid kind');
 if(kind==='prediction'&&!['WEEKLY_FROZEN','CURRENT_SHADOW'].includes(policy))throw new Error('invalid prediction policy');
 if(kind!=='prediction'&&policy!==null)throw new Error('policy must be null');
 if(typeof idempotency_key!=='string'||!/^[-A-Za-z0-9_]{16,128}$/.test(idempotency_key))throw new Error('invalid idempotency key');
 const serialized=canonical(payload);
 if(Buffer.byteLength(serialized,'utf8')>MAX_PAYLOAD_BYTES)throw new Error('payload too large');
 const body={event_id,kind,policy,payload,idempotency_key};
 return Object.freeze({body,request_sha256:crypto.createHash('sha256').update(canonical(body)).digest('hex')});
}
module.exports={canonical,prepareEvidenceIntent,MAX_PAYLOAD_BYTES};
