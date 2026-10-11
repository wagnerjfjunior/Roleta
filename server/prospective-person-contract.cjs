'use strict';
// F2-12 REVIEW-ONLY: server-side semantic validation of per-person prediction
// intent. Does not connect to PostgreSQL, expose a route, or alter V1 payloads.
// The caller MUST supply authorizedPersonIds from a trusted server-side source.
// Merely naming person_id in a browser request grants no access.
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const ISO_UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function utc(value,name){
 if(typeof value!=='string'||!ISO_UTC.test(value))throw new Error('invalid '+name);
 const epoch=Date.parse(value);
 if(!Number.isFinite(epoch)||new Date(epoch).toISOString().replace(/\.000Z$/,'Z')!==value.replace(/\.000Z$/,'Z'))
  throw new Error('invalid '+name);
 return epoch;
}
function validatePersonPrediction({body,authorizedPersonIds}={}){
 if(!body||body.kind!=='prediction'||!['WEEKLY_FROZEN','CURRENT_SHADOW'].includes(body.policy))
  throw new Error('prediction policy required');
 if(!(authorizedPersonIds instanceof Set)||!authorizedPersonIds.size)
  throw new Error('trusted person authorization required');
 const p=body.payload;
 if(!p||Array.isArray(p)||typeof p!=='object'||Object.getPrototypeOf(p)!==Object.prototype)
  throw new Error('prediction payload required');
 const {person_id,revision_number,supersedes_recommendation_id,physical_position,generated_at,data_cutoff,frozen_at}=p;
 if(typeof person_id!=='string'||!ID.test(person_id))throw new Error('invalid person_id');
 if(!authorizedPersonIds.has(person_id))throw new Error('person not authorized');
 if(!Number.isSafeInteger(revision_number)||revision_number<1)throw new Error('invalid revision_number');
 if(!Number.isSafeInteger(physical_position)||physical_position<1)throw new Error('invalid physical_position');
 const generated=utc(generated_at,'generated_at'),cutoff=utc(data_cutoff,'data_cutoff');
 if(cutoff>generated)throw new Error('data cutoff after generation');
 if(frozen_at!==null&&frozen_at!==undefined){
  if(utc(frozen_at,'frozen_at')>generated)throw new Error('freeze after generation');
 }
 if(body.policy==='WEEKLY_FROZEN'){
  if(revision_number!==1||supersedes_recommendation_id!==null)throw new Error('weekly revision must be initial');
  if(typeof frozen_at!=='string')throw new Error('weekly must be frozen');
 }else{
  if(revision_number===1&&supersedes_recommendation_id!==null)throw new Error('initial revision cannot supersede');
  if(revision_number>1&&(typeof supersedes_recommendation_id!=='string'||!ID.test(supersedes_recommendation_id)))
   throw new Error('revision requires predecessor id');
 }
 // These local checks alone DO NOT establish the predecessor exists, belongs
 // to the same event/person/track, or is the current tip. Enforce atomically in DB.
 return Object.freeze({person_id,revision_number,policy:body.policy});
}
module.exports={validatePersonPrediction};
