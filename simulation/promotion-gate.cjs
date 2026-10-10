'use strict';
const {summarize}=require('./prospective-metrics.cjs');
function promotionGate(records,{minimumPaired=200,approved=false,rollbackTested=false,protocolRegistered=false}={}){
 const stats=summarize(records);
 const reasons=[];
 if(stats.paired_count<minimumPaired)reasons.push('insufficient_prospective_pairs');
 if(!protocolRegistered)reasons.push('statistical_protocol_not_preregistered');
 if(!rollbackTested)reasons.push('rollback_not_tested');
 if(!approved)reasons.push('human_promotion_approval_missing');
 // Statistical superiority is NOT inferred from a raw difference in hits.
 // Evidence review remains a separate, explicitly manual decision.
 reasons.push('statistical_superiority_requires_independent_review');
 return {schema:'rlt-f2-14-promotion-gate-v1',policy:'WEEKLY_FROZEN',mode:'shadow_only',ready:false,reasons,stats:{paired_count:stats.paired_count,paired_delta_hits:stats.paired_delta_hits}};
}
module.exports={promotionGate};
