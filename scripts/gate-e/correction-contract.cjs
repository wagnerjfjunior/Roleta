'use strict';
// Auditable correction proposal preflight ONLY; no persistence or permission grant.
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/;
const EVENT=/^\d{4}-\d{2}-\d{2}-[MTI]$/;
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function canonical(o){if(!o||typeof o!=='object'||Array.isArray(o))return null;return JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b))));}
function assess({original,proposed,approval}={}){
 const deny=reason=>({ok:false,reason,writesPermitted:false});
 if(!original||!EVENT.test(original.event_id||'')||!Number.isSafeInteger(original.version)||original.version<1||!SHA.test(original.proof_sha256||''))return deny('INVALID_PREDECESSOR');
 if(!proposed||proposed.schema!=='rlt-statistical-correction-v1'||proposed.event_id!==original.event_id||proposed.version!==original.version+1||proposed.predecessor_proof_sha256!==original.proof_sha256)return deny('BROKEN_VERSION_CHAIN');
 if(!ID.test(proposed.actor_id||'')||typeof proposed.reason!=='string'||proposed.reason.trim().length<15||typeof proposed.source!=='string'||!proposed.source.trim()||!SHA.test(proposed.replacement_proof_sha256||'')||proposed.replacement_proof_sha256===original.proof_sha256)return deny('INSUFFICIENT_CORRECTION_EVIDENCE');
 if(!approval||approval.explicit!==true||approval.event_id!==original.event_id||approval.version!==proposed.version||!ID.test(approval.reviewer_id||'')||approval.reviewer_id===proposed.actor_id||!ISO.test(approval.reviewed_at||''))return deny('INDEPENDENT_APPROVAL_REQUIRED');
 const expected=crypto.createHash('sha256').update(canonical(proposed)).digest('hex');
 if(approval.proposal_sha256!==expected)return deny('APPROVAL_NOT_BOUND_TO_PROPOSAL');
 // Deliberately cannot authorize writes until a versioned persistence endpoint and
 // audit ledger are implemented, threat-modelled, tested and approved.
 return {ok:true,reason:null,state:'REVIEWED_DESIGN_ONLY',eventId:original.event_id,version:proposed.version,writesPermitted:false,proposalSha256:expected};
}
module.exports={assess,canonical};
