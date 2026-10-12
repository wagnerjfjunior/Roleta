'use strict';
// Gate E review states: read-only diagnostic; never repair/mutate GitHub.
// These checks are advisory until integrated into required branch protection.
const HEX=/^[a-f0-9]{40}$/;
const EVENT=/^\d{4}-\d{2}-\d{2}-[MTI]$/;
function deny(reason,extra={}){return {ok:false,reason,...extra};}
function classify({eventId,branchRef,headSha,pr,proof,mainSha,commit,changedPaths}={}){
 if(!EVENT.test(eventId||''))return deny('INVALID_EVENT');
 const branch='stat-intake/'+eventId;
 if(!branchRef)return deny('ORPHAN_MISSING_BRANCH',{action:'manual_review'});
 if(branchRef!==branch)return deny('BRANCH_MISMATCH');
 if(!HEX.test(headSha||''))return deny('INVALID_HEAD_SHA');
 if(!pr)return deny('ORPHAN_BRANCH_NO_PR',{action:'manual_review'});
 if(pr.state!=='open')return deny('PR_NOT_OPEN',{action:'manual_review'});
 if(pr.base?.ref!=='main'||pr.head?.ref!==branch)return deny('PR_TARGET_MISMATCH');
 if(pr.head?.sha!==headSha)return deny('PR_HEAD_SHA_MISMATCH');
 if(!HEX.test(mainSha||'')||!commit||commit.sha!==headSha)return deny('UNVERIFIED_COMMIT');
 if(!Array.isArray(commit.parents)||commit.parents.length!==1||commit.parents[0].sha!==mainSha)
  return deny('STALE_MAIN_OR_NONLINEAR_HISTORY');
 if(!Array.isArray(changedPaths)||changedPaths.length!==3)return deny('UNVERIFIED_PATHS');
 const expected=['data/incoming/'+eventId+'.csv','data/intake-proofs/'+eventId+'.json','data/manifest.json'];
 if([...changedPaths].sort().join('|')!==expected.sort().join('|'))return deny('UNEXPECTED_PATHS');
 if(!proof||proof.schema!=='rlt-statistical-proof-v1'||proof.event_id!==eventId||
    proof.human_review_confirmed!==true||!/^[a-f0-9]{64}$/.test(proof.payload_sha256||'')||
    !/^[a-f0-9]{16}$/.test(proof.actor_hash||''))return deny('INVALID_PROOF');
 if(!EVENT.test(proof.event_id)||proof.event_date!==eventId.slice(0,10))return deny('PROOF_DATE_MISMATCH');
 return {ok:true,status:'pending_human_review',eventId,headSha,baseSha:mainSha,prNumber:pr.number};
}
function assessCorrection({publishedEvent,proposedCorrection,reviewAuthorization}={}){
 // No edit-in-place, no inferred authorization. Deliberately does not support writes.
 if(!publishedEvent||!proposedCorrection)return deny('MISSING_VERSIONED_EVIDENCE');
 if(!reviewAuthorization)return deny('CORRECTION_REQUIRES_SEPARATE_APPROVAL');
 return deny('CORRECTION_WRITE_NOT_IMPLEMENTED');
}
module.exports={classify,assessCorrection};
