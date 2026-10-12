'use strict';
// No network, ref creation, PR creation, or branch deletion.
const SHA=/^[0-9a-f]{40}$/;
const EVENT=/^\d{4}-\d{2}-\d{2}-[MTI]$/;
const DIGEST=/^[0-9a-f]{64}$/;
const ACTOR=/^[0-9a-f]{16}$/;
const deny=(reason)=>({ok:false,reason,action:'MANUAL_REVIEW',writesPermitted:false});
function plan({eventId,branch,branchHeadSha,commit,proof,openPrs,closedPrs=[],mainSha}={}) {
 if(!EVENT.test(eventId||''))return deny('INVALID_EVENT_ID');
 if(branch!=='stat-intake/'+eventId)return deny('BRANCH_MISMATCH');
 if(!SHA.test(branchHeadSha||'')||!SHA.test(mainSha||''))return deny('UNVERIFIED_SHA');
 if(!commit||commit.sha!==branchHeadSha||!Array.isArray(commit.parents)||commit.parents.length!==1||commit.parents[0]?.sha!==mainSha)return deny('STALE_OR_UNVERIFIED_COMMIT');
 if(!proof||proof.schema!=='rlt-statistical-proof-v1'||proof.event_id!==eventId||proof.event_date!==eventId.slice(0,10)||proof.human_review_confirmed!==true||!DIGEST.test(proof.payload_sha256||'')||!ACTOR.test(proof.actor_hash||''))return deny('UNVERIFIED_PROOF');
 if(!Array.isArray(openPrs)||!Array.isArray(closedPrs))return deny('UNVERIFIED_PR_LIST');
 if(closedPrs.length>0)return deny('CLOSED_PR_PRESENT');
 if(openPrs.length>1)return deny('MULTIPLE_OPEN_PRS');
 if(openPrs.length===1){
   const pr=openPrs[0];
   if(pr?.state!=='open'||!Number.isSafeInteger(pr.number)||pr.number<1||pr.head?.ref!==branch||pr.head?.sha!==branchHeadSha||pr.base?.ref!=='main')return deny('PR_HEAD_OR_BASE_MISMATCH');
   return {ok:true,state:'EXISTING_OPEN_PR',eventId,prNumber:pr.number,headSha:branchHeadSha,writesPermitted:false,action:'VERIFY_WITH_INTAKE_VALIDATOR'};
 }
 return {ok:true,state:'ORPHAN_ELIGIBLE_FOR_MANUAL_PR_RECREATION',eventId,headSha:branchHeadSha,baseSha:mainSha,writesPermitted:false,action:'HUMAN_REVIEW_BEFORE_PR_CREATE'};
}
module.exports={plan};
