'use strict';
// F2-12: V2 command builder for a future private, versioned DB function.
// REVIEW ONLY: this function does not exist yet. No DB connection or HTTP handler.
const {preparePersonEvidenceV2}=require('./prospective-person-envelope-v2.cjs');
const {canonical}=require('../simulation/prospective-intent.cjs');
const SQL='SELECT roleta_audit.append_authenticated_person_evidence_v2($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) AS evidence_id';
function buildPersonAppendCommand({session,authorizedPersonIds,body}={}){
 const evidence=preparePersonEvidenceV2({session,authorizedPersonIds,body});
 const args=Object.freeze([
  evidence.canonical_bytes,
  evidence.request_sha256,
  evidence.actor_subject,
  evidence.event_id,
  evidence.person_id,
  evidence.recommendation_id,
  evidence.policy,
  body.idempotency_key,
  canonical(body.payload)
 ]);
 return Object.freeze({sql:SQL,params:args});
}
module.exports={buildPersonAppendCommand};
