'use strict';
// Private server-only adapter. Builds typed positional arguments for a
// restricted PostgreSQL function. No connection, SQL execution or HTTP route.
const {prepareEvidenceFromHttp}=require('./prospective-evidence-http.cjs');
const {canonical}=require('../simulation/prospective-intent.cjs');
const {timingSafeHexEqual}=require('../simulation/prospective-integrity.cjs');
const crypto=require('node:crypto');
const SQL='SELECT roleta_audit.append_authenticated_evidence_ci($1,$2,$3,$4,$5,$6,$7::jsonb,$8) AS evidence_id';
function buildAuthenticatedAppendCommand(req,options){
 const prepared=prepareEvidenceFromHttp(req,options);
 const body=prepared.body;
 const hash=crypto.createHash('sha256').update(prepared.canonical_bytes,'utf8').digest('hex');
 if(!timingSafeHexEqual(hash,prepared.request_sha256))throw new Error('server digest mismatch');
 if(prepared.actor_subject!=='google:'+options?.auth?.session?.(req)?.sub && options?.auth){
  throw new Error('authenticated subject changed during preparation');
 }
 const params=Object.freeze([
  prepared.canonical_bytes,prepared.request_sha256,
  body.event_id,body.kind,body.policy,body.idempotency_key,
  canonical(body.payload),prepared.actor_subject
 ]);
 return Object.freeze({sql:SQL,params});
}
module.exports={buildAuthenticatedAppendCommand};
